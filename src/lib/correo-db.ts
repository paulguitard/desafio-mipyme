import { prisma } from "@/lib/db";
import { normalizarCorreo } from "@/lib/correo";

export function whereEmailIgual(email: string) {
  return {
    email: { equals: normalizarCorreo(email), mode: "insensitive" as const },
  };
}

export async function findUserByEmail(email: string) {
  const normalized = normalizarCorreo(email);
  if (!normalized) return null;
  return prisma.user.findFirst({ where: whereEmailIgual(normalized) });
}
