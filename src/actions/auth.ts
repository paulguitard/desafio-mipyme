"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { homeForRole, isRole } from "@/lib/roles";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const expectedRole = String(formData.get("expectedRole") ?? "");
  if (!isRole(expectedRole)) {
    return { error: "Rol de ingreso inválido." };
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
      if (kind === "Configuration") {
        return {
          error:
            "Falta configurar AUTH_SECRET (o AUTH_URL) en Vercel. Agrégalo en Environment Variables y vuelve a desplegar.",
        };
      }
      return {
        error:
          "No pudimos ingresar. Revisa el correo, la contraseña y que tu usuario tenga el rol correcto.",
      };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
