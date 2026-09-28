import { UsuariosAdmin } from "@/components/usuarios-admin";
import { prisma } from "@/lib/db";
import { parseArchivosSoloFiles } from "@/lib/preguntas";

export default async function UsuariosPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      escuela: true,
      origen: true,
      rutPersonal: true,
      direccionPersonal: true,
      telefonoMovil: true,
      contactoWhatsapp: true,
      documentosFormalizacion: true,
    },
  });

  const filas = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    escuela: user.escuela,
    origen: user.origen,
  }));

  const perfiles = users
    .filter((user) => user.role === "EMPRENDEDOR")
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      rutPersonal: user.rutPersonal,
      direccionPersonal: user.direccionPersonal,
      telefonoMovil: user.telefonoMovil,
      contactoWhatsapp: user.contactoWhatsapp,
      formalizacionEmpresa: parseArchivosSoloFiles(user.documentosFormalizacion).length > 0,
    }));

  return <UsuariosAdmin users={filas} perfiles={perfiles} />;
}
