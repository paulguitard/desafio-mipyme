import { randomBytes } from "crypto";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig, deniedUrl } from "@/auth.config";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isRole, normalizeRole, rolCoincideConIngreso, type Role } from "@/lib/roles";

async function findOrCreateEmprendedorFromGoogle(input: {
  email: string;
  name?: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const role = normalizeRole(existing.role);
    if (role !== "EMPRENDEDOR") {
      return { ok: false as const, reason: "wrong_role" as const };
    }
    return { ok: true as const, user: existing };
  }

  const user = await prisma.user.create({
    data: {
      name: input.name?.trim() || email.split("@")[0] || "Emprendedor",
      email,
      passwordHash: await hashPassword(randomBytes(32).toString("hex")),
      passwordAssigned: "",
      role: "EMPRENDEDOR",
      origen: "REGISTRO",
    },
  });
  return { ok: true as const, user };
}

export const {
  handlers,
  auth,
  signIn,
  signOut,
  unstable_update: updateSession,
} = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    ...(process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim()
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
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
        if (!role || !rolCoincideConIngreso(role, expectedRole as Role)) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;

      const email = user.email?.trim().toLowerCase();
      if (!email) return false;

      const result = await findOrCreateEmprendedorFromGoogle({
        email,
        name: user.name,
      });

      if (!result.ok) {
        return deniedUrl("EMPRENDEDOR");
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (account?.provider === "google") {
        const email = String(user?.email ?? token.email ?? "")
          .trim()
          .toLowerCase();
        if (email) {
          const dbUser = await prisma.user.findUnique({ where: { email } });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = normalizeRole(dbUser.role) ?? "EMPRENDEDOR";
            token.email = dbUser.email;
            token.name = dbUser.name;
          }
        }
        return token;
      }

      if (user) {
        token.id = user.id;
        token.role =
          normalizeRole((user as { role?: string }).role ?? "") ?? undefined;
        if (user.name) token.name = user.name;
        if (user.email) token.email = user.email;
      }

      if (trigger === "update" && session?.user) {
        const nextName = (session.user as { name?: string | null }).name;
        if (typeof nextName === "string" && nextName.trim()) {
          token.name = nextName.trim();
        }
      }

      token.role = normalizeRole(String(token.role ?? "")) ?? token.role;
      return token;
    },
  },
});
