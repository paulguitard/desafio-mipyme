import type { NextAuthConfig } from "next-auth";
import { loginPathForRole, normalizeRole, type Role } from "@/lib/roles";

export const authConfig = {
  trustHost: true,
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
      }
      token.role = normalizeRole(String(token.role ?? "")) ?? token.role;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = normalizeRole((token.role as string) ?? "") ?? "EMPRENDEDOR";
      }
      return session;
    },
    authorized({ auth, request }) {
      const pathname = request.nextUrl.pathname;
      const role = normalizeRole((auth?.user?.role as string) ?? "");

      const needsAdmin = pathname.startsWith("/admin");
      const needsEval = pathname.startsWith("/evaluador");
      const needsEmprendedor = pathname.startsWith("/emprendedor");
      if (!needsAdmin && !needsEval && !needsEmprendedor) return true;
      if (!role) return false;
      if (needsAdmin) return role === "ADMIN";
      if (needsEval) return role === "EVALUADOR";
      if (needsEmprendedor) return role === "EMPRENDEDOR";
      return true;
    },
  },
} satisfies NextAuthConfig;

export function deniedUrl(expected: Role) {
  return `/acceso-denegado?esperaba=${expected}&login=${encodeURIComponent(loginPathForRole(expected))}`;
}
