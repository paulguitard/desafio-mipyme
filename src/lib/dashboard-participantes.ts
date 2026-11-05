import { prisma } from "@/lib/db";
import { CONFIG_APP_ID } from "@/lib/config-app";
import { normalizarCorreo } from "@/lib/correo";
import { esTokenPublicoValido, generarTokenPublico } from "@/lib/ficha-publica";
import { parseArchivosSoloFiles } from "@/lib/preguntas";
import {
  anexarAsesoriasAPerfiles,
  elegirConvocatoriaActiva,
  filasDashboardPublico,
  filtrarPerfilesAnalisis,
  TITULO_ASESORIA_PITCH,
  TITULO_ASESORIA_TD,
  type FilaDashboardParticipante,
} from "@/lib/perfiles-asesorias";

export async function leerTokenDashboardParticipantes() {
  const row = await prisma.configApp.findUnique({
    where: { id: CONFIG_APP_ID },
    select: { dashboardParticipantesToken: true },
  });
  const token = row?.dashboardParticipantesToken?.trim() ?? "";
  return esTokenPublicoValido(token) ? token : "";
}

export async function obtenerOCrearTokenDashboardParticipantes() {
  const actual = await leerTokenDashboardParticipantes();
  if (actual) return actual;
  const token = generarTokenPublico();
  await prisma.configApp.upsert({
    where: { id: CONFIG_APP_ID },
    create: {
      id: CONFIG_APP_ID,
      dashboardParticipantesToken: token,
    },
    update: { dashboardParticipantesToken: token },
  });
  return token;
}

export async function cargarFilasDashboardParticipantes(): Promise<FilaDashboardParticipante[]> {
  const [users, convocatorias] = await Promise.all([
    prisma.user.findMany({
      where: { role: "EMPRENDEDOR" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        documentosFormalizacion: true,
      },
    }),
    prisma.convocatoria.findMany({
      select: { id: true, titulo: true, estado: true, createdAt: true },
    }),
  ]);

  const td = elegirConvocatoriaActiva(convocatorias, TITULO_ASESORIA_TD);
  const pitch = elegirConvocatoriaActiva(convocatorias, TITULO_ASESORIA_PITCH);
  const idsConvocatoria = [td?.id, pitch?.id].filter((id): id is string => Boolean(id));
  const idsParticipantes = users.map((user) => user.id);
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

  return filasDashboardPublico(
    filtrarPerfilesAnalisis(
      anexarAsesoriasAPerfiles(
        users.map((user) => ({
          id: user.id,
          name: user.name,
          email: normalizarCorreo(user.email),
          formalizacionEmpresa: parseArchivosSoloFiles(user.documentosFormalizacion).length > 0,
        })),
        convocatorias,
        postulaciones,
      ),
    ),
  );
}
