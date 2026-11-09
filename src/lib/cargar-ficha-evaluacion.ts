import { prisma } from "@/lib/db";

export async function cargarFichaEvaluacion(args: {
  asignacionId: string;
  evaluadorId?: string;
  postulacionId?: string;
  convocatoriaId?: string;
}) {
  return prisma.asignacionEvaluador.findFirst({
    where: {
      id: args.asignacionId,
      ...(args.evaluadorId ? { evaluadorId: args.evaluadorId } : {}),
      ...(args.postulacionId ? { postulacionId: args.postulacionId } : {}),
      ...(args.convocatoriaId ? { postulacion: { convocatoriaId: args.convocatoriaId } } : {}),
    },
    include: {
      evaluador: true,
      revisiones: { orderBy: [{ ronda: "asc" }, { ciclo: "asc" }, { createdAt: "asc" }] },
      revisionesGenerales: { orderBy: [{ ronda: "asc" }, { ciclo: "asc" }, { createdAt: "asc" }] },
      revisionesCriterio: { orderBy: [{ ronda: "asc" }, { ciclo: "asc" }, { createdAt: "asc" }] },
      supervisionesPregunta: { orderBy: [{ ronda: "asc" }, { ciclo: "asc" }, { createdAt: "asc" }] },
      supervisionesGenerales: { orderBy: [{ ronda: "asc" }, { ciclo: "asc" }, { createdAt: "asc" }] },
      postulacion: {
        include: {
          postulante: true,
          supervision: { include: { supervisor: true } },
          convocatoria: {
            include: {
              formulario: {
                include: {
                  preguntas: { orderBy: { orden: "asc" } },
                  rubrica: { include: { criterios: { orderBy: { orden: "asc" } } } },
                },
              },
            },
          },
          respuestas: {
            include: { versiones: { orderBy: { createdAt: "desc" } } },
          },
          asignaciones: {
            select: {
              rondaActual: true,
              revisiones: { select: { ronda: true, createdAt: true } },
              revisionesGenerales: { select: { ronda: true, createdAt: true } },
            },
          },
        },
      },
    },
  });
}

export type FichaEvaluacionAsignacion = NonNullable<Awaited<ReturnType<typeof cargarFichaEvaluacion>>>;
