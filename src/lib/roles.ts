export const ROLES = ["ADMIN", "EVALUADOR", "EMPRENDEDOR"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administración",
  EVALUADOR: "Evaluador",
  EMPRENDEDOR: "Emprendedor",
};

export function isRole(value: string): value is Role {
  return ROLES.includes(value as Role);
}

export function normalizeRole(value: string): Role | null {
  if (value === "POSTULANTE") return "EMPRENDEDOR";
  if (isRole(value)) return value;
  return null;
}

export function homeForRole(role: Role): string {
  if (role === "ADMIN") return "/admin";
  if (role === "EVALUADOR") return "/evaluador";
  return "/emprendedor";
}

export function loginPathForRole(role: Role): string {
  if (role === "ADMIN") return "/ingresar/admin";
  if (role === "EVALUADOR") return "/ingresar/evaluador";
  return "/ingresar/emprendedor";
}

export function roleFromLoginSlug(slug: string): Role | null {
  if (slug === "admin") return "ADMIN";
  if (slug === "evaluador") return "EVALUADOR";
  if (slug === "emprendedor" || slug === "postulante") return "EMPRENDEDOR";
  return null;
}
