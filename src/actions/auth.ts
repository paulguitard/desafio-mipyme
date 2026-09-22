"use server";

import { createHash, randomBytes } from "crypto";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { loadConfigCorreoRecuperacionForMail } from "@/actions/config-admin";
import { getAppBaseUrl } from "@/lib/app-url";
import { renderCorreoRecuperacion } from "@/lib/correo-recuperacion";
import { prisma } from "@/lib/db";
import { isMailConfigured, sendMail } from "@/lib/mail";
import { hashPassword, verifyPassword } from "@/lib/password";
import { validatePassword } from "@/lib/password-policy";
import { consumeRateLimit } from "@/lib/rate-limit";
import { homeForRole, isRole, normalizeRole, rolCoincideConIngreso, type Role } from "@/lib/roles";
import { USER_ORIGEN } from "@/lib/user-origen";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const RESET_REQUEST_LIMIT = 5;
const RESET_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const RESET_CONFIRM_LIMIT = 10;
const RESET_CONFIRM_WINDOW_MS = 15 * 60 * 1000;

const RESET_GENERIC_OK =
  "Si ese correo está registrado, te enviamos un enlace para restablecer la contraseña. Revisá tu bandeja (y spam).";

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const expectedRole = String(formData.get("expectedRole") ?? "");
  if (!isRole(expectedRole)) {
    return { error: "Rol de ingreso inválido." };
  }

  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    return {
      error:
        "En Vercel falta AUTH_SECRET (Production). Guárdalo en Environment Variables y hacé Redeploy.",
    };
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { error: "No existe un usuario con ese correo en la base." };
    }
    const passwordOk = await verifyPassword(password, user.passwordHash);
    if (!passwordOk) {
      return { error: "La contraseña no coincide." };
    }
    const role = normalizeRole(user.role);
    if (!role || !rolCoincideConIngreso(role, expectedRole as Role)) {
      return { error: `Ese usuario tiene rol ${user.role}, no ${expectedRole}.` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error de base de datos";
    return {
      error: `No se pudo leer la base (DATABASE_URL). ${message.slice(0, 180)}`,
    };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      expectedRole,
      redirectTo: homeForRole(expectedRole),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const kind = String((error as { type?: string }).type ?? "");
      if (
        kind === "Configuration" ||
        kind === "MissingSecret" ||
        kind === "UntrustedHost"
      ) {
        return {
          error:
            "Auth.js no tiene AUTH_SECRET/AUTH_URL en este deploy. Revisá Environment Variables (Production) y Redeploy.",
        };
      }
      return {
        error: `No pudimos abrir la sesión (${kind || "AuthError"}).`,
      };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

export async function signInWithGoogleAction() {
  if (!process.env.AUTH_GOOGLE_ID?.trim() || !process.env.AUTH_GOOGLE_SECRET?.trim()) {
    return {
      error:
        "Ingreso con Google no está configurado. Faltan AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET en el entorno.",
    };
  }

  try {
    await signIn("google", { redirectTo: "/emprendedor" });
  } catch (error) {
    if (error instanceof AuthError) {
      const kind = String((error as { type?: string }).type ?? "");
      if (
        kind === "Configuration" ||
        kind === "MissingSecret" ||
        kind === "UntrustedHost"
      ) {
        return {
          error:
            "Auth.js / Google no está bien configurado. Revisá AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET y AUTH_URL.",
        };
      }
      if (kind === "AccessDenied") {
        return {
          error: "Esa cuenta de Google no puede ingresar como emprendedor.",
        };
      }
      return {
        error: `No pudimos iniciar con Google (${kind || "AuthError"}).`,
      };
    }
    throw error;
  }
}

export async function registerEmprendedorAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!name || !email) {
    return { error: "Completá nombre y correo." };
  }
  if (!email.includes("@")) {
    return { error: "Correo inválido." };
  }
  if (password !== passwordConfirm) {
    return { error: "Las contraseñas no coinciden." };
  }
  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError };

  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    return {
      error:
        "En Vercel falta AUTH_SECRET (Production). Guárdalo en Environment Variables y hacé Redeploy.",
    };
  }

  try {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return { error: "Ya existe un usuario con ese correo." };
    }

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        passwordAssigned: "",
        role: "EMPRENDEDOR",
        origen: "REGISTRO",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error de base de datos";
    return {
      error: `No se pudo crear la cuenta. ${message.slice(0, 180)}`,
    };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      expectedRole: "EMPRENDEDOR",
      redirectTo: homeForRole("EMPRENDEDOR"),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const kind = String((error as { type?: string }).type ?? "");
      return {
        error: `La cuenta se creó, pero no pudimos abrir la sesión (${kind || "AuthError"}). Ingresá desde el login.`,
      };
    }
    throw error;
  }
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    return { error: "Ingresá un correo válido." };
  }

  const rateKey = `reset-request:${email}`;
  if (!consumeRateLimit(rateKey, RESET_REQUEST_LIMIT, RESET_REQUEST_WINDOW_MS)) {
    return {
      error: "Demasiados intentos. Esperá unos minutos e intentá de nuevo.",
    };
  }

  if (!isMailConfigured()) {
    return {
      error:
        "El envío de correo no está configurado (MAIL_FROM / MAIL_SMTP_USER / MAIL_SMTP_PASS). Pedile al administrador que lo active.",
    };
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    // Solo emprendedores auto-registrados (modal / Google). Admin y evaluador: sin mail, mismo mensaje.
    if (
      !user ||
      normalizeRole(user.role) !== "EMPRENDEDOR" ||
      user.origen !== USER_ORIGEN.REGISTRO
    ) {
      return { ok: true, message: RESET_GENERIC_OK };
    }

    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const resetUrl = `${getAppBaseUrl()}/restablecer-contrasena?token=${encodeURIComponent(rawToken)}`;
    const mailConfig = await loadConfigCorreoRecuperacionForMail();
    const rendered = renderCorreoRecuperacion(mailConfig, {
      nombre: user.name,
      enlace: resetUrl,
    });

    const sent = await sendMail({
      to: user.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    if (!sent.ok) {
      await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
      return { error: sent.error };
    }

    return { ok: true, message: RESET_GENERIC_OK };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return {
      error: `No se pudo procesar el pedido. ${message.slice(0, 180)}`,
    };
  }
}

export async function confirmPasswordResetAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!token) {
    return { error: "Falta el enlace de restablecimiento. Pedí uno nuevo." };
  }
  if (password !== passwordConfirm) {
    return { error: "Las contraseñas no coinciden." };
  }
  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError };

  const rateKey = `reset-confirm:${hashResetToken(token).slice(0, 16)}`;
  if (!consumeRateLimit(rateKey, RESET_CONFIRM_LIMIT, RESET_CONFIRM_WINDOW_MS)) {
    return {
      error: "Demasiados intentos. Esperá unos minutos e intentá de nuevo.",
    };
  }

  const tokenHash = hashResetToken(token);
  const now = new Date();

  try {
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { role: true, origen: true } } },
    });

    if (!record || record.usedAt || record.expiresAt <= now) {
      return {
        error: "El enlace no es válido o ya venció. Pedí uno nuevo.",
      };
    }

    if (
      normalizeRole(record.user.role) !== "EMPRENDEDOR" ||
      record.user.origen !== USER_ORIGEN.REGISTRO
    ) {
      return {
        error: "El enlace no es válido o ya venció. Pedí uno nuevo.",
      };
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          passwordAssigned: "",
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: now },
      }),
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: record.userId,
          id: { not: record.id },
          usedAt: null,
        },
      }),
    ]);

    return {
      ok: true,
      message: "Contraseña actualizada. Ya podés ingresar con la nueva clave.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return {
      error: `No se pudo actualizar la contraseña. ${message.slice(0, 180)}`,
    };
  }
}

export async function validateResetTokenAction(token: string) {
  const raw = token.trim();
  if (!raw) return { valid: false as const };

  const tokenHash = hashResetToken(raw);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { role: true, origen: true } } },
  });

  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    return { valid: false as const };
  }
  if (
    normalizeRole(record.user.role) !== "EMPRENDEDOR" ||
    record.user.origen !== USER_ORIGEN.REGISTRO
  ) {
    return { valid: false as const };
  }
  return { valid: true as const };
}
