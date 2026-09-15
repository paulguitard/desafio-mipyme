import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/roles";
import { loginPathForRole } from "@/lib/roles";
import { deniedUrl } from "@/auth.config";

export async function requireUser(expected: Role) {
  const session = await auth();
  if (!session?.user) {
    redirect(loginPathForRole(expected));
  }
  if (session.user.role !== expected) {
    redirect(deniedUrl(expected));
  }
  return session.user;
}
