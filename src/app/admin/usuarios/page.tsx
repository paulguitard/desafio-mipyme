import { UsuariosAdmin } from "@/components/usuarios-admin";
import { prisma } from "@/lib/db";
import { normalizarCorreo } from "@/lib/correo";
import { parseArchivosSoloFiles, publicUploadUrl } from "@/lib/preguntas";

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
    email: normalizarCorreo(user.email),
    role: user.role,
    escuela: user.escuela,
    origen: user.origen,
  }));

  const perfiles = users
    .filter((user) => user.role === "EMPRENDEDOR")
    .map((user) => {
      const documentos = parseArchivosSoloFiles(user.documentosFormalizacion).map((doc) => ({
        id: doc.id,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        url: publicUploadUrl(doc),
      }));
      return {
        id: user.id,
        name: user.name,
        email: normalizarCorreo(user.email),
        rutPersonal: user.rutPersonal,
        direccionPersonal: user.direccionPersonal,
        telefonoMovil: user.telefonoMovil,
        contactoWhatsapp: user.contactoWhatsapp,
        formalizacionEmpresa: documentos.length > 0,
        documentos,
      };
    });

  return <UsuariosAdmin users={filas} perfiles={perfiles} />;
}
