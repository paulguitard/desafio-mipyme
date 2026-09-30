import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { normalizarCorreo } from "@/lib/correo";
import type { Role } from "@/lib/roles";
import {
  esRolCatalogoEvaluador,
  homeForRole,
  loginPathForRole,
  normalizeRole,
  rolCoincideConIngreso,
} from "@/lib/roles";

type SessionUser = {
  id: string;
  role: Role;
  name?: string | null;
  email?: string | null;
};

async function loadActor(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, passwordChangedAt: true },
  });
  if (!dbUser) return null;
  const tokenStamp = session.user.passwordChangedAt;
  const dbStamp = dbUser.passwordChangedAt.toISOString();
  if (tokenStamp && tokenStamp !== dbStamp) return null;
  const role = normalizeRole(dbUser.role);
  if (!role) return null;
  return { id: dbUser.id, role, name: dbUser.name, email: normalizarCorreo(dbUser.email) };
}

export async function requireUser(expected: Role) {
  const user = await loadActor();
  if (!user) {
    redirect(loginPathForRole(expected));
  }
  if (!rolCoincideConIngreso(user.role, expected)) {
    redirect(homeForRole(user.role));
  }
  return user;
}

/** Evaluador o supervisor (panel /evaluador). */
export async function requireCatalogoEvaluador() {
  const user = await loadActor();
  if (!user) {
    redirect(loginPathForRole("EVALUADOR"));
  }
  if (!esRolCatalogoEvaluador(user.role)) {
    redirect(homeForRole(user.role));
  }
  return user;
}
