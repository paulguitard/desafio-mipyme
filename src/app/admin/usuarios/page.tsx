import { UsuariosAdmin } from "@/components/usuarios-admin";
import { prisma } from "@/lib/db";
import { USER_ORIGEN } from "@/lib/user-origen";

export default async function UsuariosPage() {
  // Backfill no destructivo: auto-registros previos (sin clave visible) → REGISTRO
  await prisma.user.updateMany({
    where: {
      origen: USER_ORIGEN.ADMIN,
      passwordAssigned: "",
      role: "EMPRENDEDOR",
    },
    data: { origen: USER_ORIGEN.REGISTRO },
  });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      passwordAssigned: true,
      role: true,
      origen: true,
    },
  });

  return <UsuariosAdmin users={users} />;
}
