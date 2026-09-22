"use server";

import { revalidatePath } from "next/cache";
import { updateSession } from "@/auth";
import { prisma } from "@/lib/db";
import { requirePortalUser } from "@/lib/session";

export async function actualizarPerfilPropio(formData: FormData) {
  const sessionUser = await requirePortalUser();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "El nombre es obligatorio." };
  }

  if (name.length > 120) {
    return { error: "El nombre es demasiado largo." };
  }

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { name },
  });

  await updateSession({ user: { name } });

  revalidatePath("/emprendedor");
  revalidatePath("/emprendedor/perfil");
  revalidatePath("/evaluador");
  revalidatePath("/evaluador/perfil");
  return { ok: true };
}
