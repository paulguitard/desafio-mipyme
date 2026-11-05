import { UsuariosAdmin } from "@/components/usuarios-admin";
import { prisma } from "@/lib/db";
import { normalizarCorreo } from "@/lib/correo";
import { obtenerOCrearTokenDashboardParticipantes } from "@/lib/dashboard-participantes";
import { rutaDashboardParticipantes } from "@/lib/ficha-publica";
import { parseArchivosSoloFiles, publicUploadUrl } from "@/lib/preguntas";
import {
  anexarAsesoriasAPerfiles,
  elegirConvocatoriaActiva,
  filtrarPerfilesAnalisis,
  TITULO_ASESORIA_PITCH,
  TITULO_ASESORIA_TD,
} from "@/lib/perfiles-asesorias";

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

  const convocatorias = await prisma.convocatoria.findMany({
    select: { id: true, titulo: true, estado: true, createdAt: true },
  });
  const td = elegirConvocatoriaActiva(convocatorias, TITULO_ASESORIA_TD);
  const pitch = elegirConvocatoriaActiva(convocatorias, TITULO_ASESORIA_PITCH);
  const idsConvocatoria = [td?.id, pitch?.id].filter((id): id is string => Boolean(id));
  const idsParticipantes = users.filter((user) => user.role === "EMPRENDEDOR").map((user) => user.id);
  const postulaciones =
    idsConvocatoria.length === 0 || idsParticipantes.length === 0
      ? []
      : await prisma.postulacion.findMany({
          where: {
            postulanteId: { in: idsParticipantes },
            convocatoriaId: { in: idsConvocatoria },
          },
          select: {
            postulanteId: true,
            convocatoriaId: true,
            estado: true,
            enviadaAt: true,
          },
        });

  const perfiles = filtrarPerfilesAnalisis(
    anexarAsesoriasAPerfiles(
      users
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
        }),
      convocatorias,
      postulaciones,
    ),
  );

  const tokenDashboard = await obtenerOCrearTokenDashboardParticipantes();

  return (
    <UsuariosAdmin
      users={filas}
      perfiles={perfiles}
      dashboardHref={rutaDashboardParticipantes(tokenDashboard)}
    />
  );
}
