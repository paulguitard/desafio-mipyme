import { UsuariosAdmin } from "@/components/usuarios-admin";
import { prisma } from "@/lib/db";

export default async function UsuariosPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  return <UsuariosAdmin users={users} />;
}
