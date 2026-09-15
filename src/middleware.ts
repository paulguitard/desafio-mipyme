import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig, deniedUrl } from "@/auth.config";
import { loginPathForRole, normalizeRole, type Role } from "@/lib/roles";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const role = normalizeRole((req.auth?.user?.role as string) ?? "") ?? undefined;

  const guards: { prefix: string; expected: Role }[] = [
    { prefix: "/admin", expected: "ADMIN" },
    { prefix: "/evaluador", expected: "EVALUADOR" },
    { prefix: "/emprendedor", expected: "EMPRENDEDOR" },
  ];

  for (const guard of guards) {
    if (!pathname.startsWith(guard.prefix)) continue;
    if (!role) {
      const login = new URL(loginPathForRole(guard.expected), req.nextUrl.origin);
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    }
    if (role !== guard.expected) {
      return NextResponse.redirect(new URL(deniedUrl(guard.expected), req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/evaluador/:path*", "/emprendedor/:path*"],
};
