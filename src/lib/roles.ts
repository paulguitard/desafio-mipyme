export const ROLES = ["ADMIN", "EVALUADOR", "SUPERVISOR", "EMPRENDEDOR"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administración",
  EVALUADOR: "Evaluador",
  SUPERVISOR: "Supervisor",
  EMPRENDEDOR: "Emprendedor",
};

export function isRole(value: string): value is Role {
  return ROLES.includes(value as Role);
}

export function esRolCatalogoEvaluador(value: string): boolean {
  return value === "EVALUADOR" || value === "SUPERVISOR";
}

export function normalizeRole(value: string): Role | null {
  if (value === "POSTULANTE") return "EMPRENDEDOR";
  if (isRole(value)) return value;
  return null;
}

export function homeForRole(role: Role): string {
  if (role === "ADMIN") return "/admin";
  if (role === "EVALUADOR" || role === "SUPERVISOR") return "/evaluador";
  return "/emprendedor";
}

export function loginPathForRole(role: Role): string {
  if (role === "ADMIN") return "/ingresar/admin";
  if (role === "EVALUADOR" || role === "SUPERVISOR") return "/ingresar/evaluador";
  return "/ingresar/emprendedor";
}

export function roleFromLoginSlug(slug: string): Role | null {
  if (slug === "admin") return "ADMIN";
  if (slug === "evaluador") return "EVALUADOR";
  if (slug === "emprendedor" || slug === "postulante") return "EMPRENDEDOR";
  return null;
}

/** El botón «Soy evaluador» admite evaluadores y supervisores. */
export function rolCoincideConIngreso(actual: Role, expected: Role): boolean {
  if (expected === "EVALUADOR") return esRolCatalogoEvaluador(actual);
  return actual === expected;
}
