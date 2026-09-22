import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/roles";
import { esRolCatalogoEvaluador, loginPathForRole } from "@/lib/roles";
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

/** Evaluador o supervisor (panel /evaluador). */
export async function requireCatalogoEvaluador() {
  const session = await auth();
  if (!session?.user) {
    redirect(loginPathForRole("EVALUADOR"));
  }
  if (!esRolCatalogoEvaluador(session.user.role)) {
    redirect(deniedUrl("EVALUADOR"));
  }
  return session.user;
}

/** Emprendedor, evaluador o supervisor (perfil propio). */
export async function requirePortalUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }
  if (
    session.user.role !== "EMPRENDEDOR" &&
    session.user.role !== "EVALUADOR" &&
    session.user.role !== "SUPERVISOR"
  ) {
    redirect(deniedUrl(session.user.role));
  }
  return session.user;
}
