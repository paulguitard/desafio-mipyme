import "@/lib/env";
import { randomBytes } from "crypto";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig, deniedUrl } from "@/auth.config";
import { prisma } from "@/lib/db";
import { findUserByEmail } from "@/lib/correo-db";
import { normalizarCorreo } from "@/lib/correo";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isRole, normalizeRole, rolCoincideConIngreso, type Role } from "@/lib/roles";

async function findOrCreateEmprendedorFromGoogle(input: {
  email: string;
  name?: string | null;
}) {
  const email = normalizarCorreo(input.email);
  const existing = await findUserByEmail(email);
  if (existing) {
    const role = normalizeRole(existing.role);
    if (role !== "EMPRENDEDOR") {
      return { ok: false as const, reason: "wrong_role" as const };
    }
    return { ok: true as const, user: existing };
  }

  const user = await prisma.user.create({
    data: {
      name: input.name?.trim() || email.split("@")[0] || "Participante",
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
            clientId: process.env.AUTH_GOOGLE_ID.trim(),
            clientSecret: process.env.AUTH_GOOGLE_SECRET.trim(),
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
        const email = normalizarCorreo(String(credentials?.email ?? ""));
        const password = String(credentials?.password ?? "");
        const expectedRole = String(credentials?.expectedRole ?? "");
        if (!email || !password || !isRole(expectedRole)) return null;

        const user = await findUserByEmail(email);
        if (!user) return null;
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;
        const role = normalizeRole(user.role);
        if (!role || !rolCoincideConIngreso(role, expectedRole as Role)) return null;

        return {
          id: user.id,
          name: user.name,
          email: normalizarCorreo(user.email),
          role,
          passwordChangedAt: user.passwordChangedAt.toISOString(),
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;

      const email = user.email ? normalizarCorreo(user.email) : "";
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
        const email = normalizarCorreo(String(user?.email ?? token.email ?? ""));
        if (email) {
          const dbUser = await findUserByEmail(email);
          if (dbUser) {
            const role = normalizeRole(dbUser.role);
            if (!role) return {};
            token.id = dbUser.id;
            token.role = role;
            token.email = normalizarCorreo(dbUser.email);
            token.name = dbUser.name;
            token.pwc = dbUser.passwordChangedAt.toISOString();
          }
        }
        return token;
      }

      if (user) {
        token.id = user.id;
        token.role =
          normalizeRole((user as { role?: string }).role ?? "") ?? undefined;
        const stamped = (user as { passwordChangedAt?: string }).passwordChangedAt;
        if (stamped) token.pwc = stamped;
        if (user.name) token.name = user.name;
        if (user.email) token.email = normalizarCorreo(user.email);
      }

      if (trigger === "update" && session?.user) {
        const nextName = (session.user as { name?: string | null }).name;
        if (typeof nextName === "string" && nextName.trim()) {
          token.name = nextName.trim();
        }
      }

      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: String(token.id) },
          select: { role: true, name: true, email: true, passwordChangedAt: true },
        });
        if (!dbUser) return {};
        const pwc = dbUser.passwordChangedAt.toISOString();
        if (token.pwc && token.pwc !== pwc) return {};
        const role = normalizeRole(dbUser.role);
        if (!role) return {};
        token.role = role;
        token.pwc = pwc;
        token.name = dbUser.name;
        token.email = normalizarCorreo(dbUser.email);
      }

      token.role = normalizeRole(String(token.role ?? "")) ?? undefined;
      return token;
    },
  },
});
