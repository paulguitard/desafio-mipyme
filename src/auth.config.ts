import "@/lib/env";
import type { NextAuthConfig } from "next-auth";
import { esRolCatalogoEvaluador, loginPathForRole, normalizeRole, type Role } from "@/lib/roles";

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = normalizeRole((user as { role?: string }).role ?? "") ?? undefined;
        const stamped = (user as { passwordChangedAt?: string }).passwordChangedAt;
        if (stamped) token.pwc = stamped;
      }
      token.role = normalizeRole(String(token.role ?? "")) ?? undefined;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const role = normalizeRole((token.role as string) ?? "");
        session.user.id = role ? ((token.id as string) ?? "") : "";
        if (role) session.user.role = role;
        if (typeof token.name === "string") session.user.name = token.name;
        if (typeof token.email === "string") session.user.email = token.email;
        if (typeof token.pwc === "string") session.user.passwordChangedAt = token.pwc;
      }
      return session;
    },
    authorized({ auth, request }) {
      const pathname = request.nextUrl.pathname;
      const role = normalizeRole((auth?.user?.role as string) ?? "");
      if (!auth?.user?.id) {
        const guarded =
          pathname.startsWith("/admin") ||
          pathname.startsWith("/evaluador") ||
          pathname.startsWith("/participante") ||
          pathname.startsWith("/emprendedor");
        if (guarded) return false;
      }

      const needsAdmin = pathname.startsWith("/admin");
      const needsEval = pathname.startsWith("/evaluador");
      const needsParticipante =
        pathname.startsWith("/participante") || pathname.startsWith("/emprendedor");
      if (!needsAdmin && !needsEval && !needsParticipante) return true;
      if (!role) return false;
      if (needsAdmin) return role === "ADMIN";
      if (needsEval) return esRolCatalogoEvaluador(role);
      if (needsParticipante) return role === "EMPRENDEDOR";
      return true;
    },
  },
} satisfies NextAuthConfig;

export function deniedUrl(expected: Role) {
  return `/acceso-denegado?esperaba=${expected}&login=${encodeURIComponent(loginPathForRole(expected))}`;
}
