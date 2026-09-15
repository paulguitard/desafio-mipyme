import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { isRole, normalizeRole, type Role } from "@/lib/roles";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
        expectedRole: { label: "Rol", type: "text" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        const expectedRole = String(credentials?.expectedRole ?? "");
        if (!email || !password || !isRole(expectedRole)) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;
        const role = normalizeRole(user.role);
        if (!role || role !== expectedRole) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role,
        };
      },
    }),
  ],
});
