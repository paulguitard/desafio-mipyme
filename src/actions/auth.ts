"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { homeForRole, isRole, normalizeRole } from "@/lib/roles";

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
    if (!role || role !== expectedRole) {
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
