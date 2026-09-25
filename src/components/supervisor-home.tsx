import { BadgeAsignacion, BadgePostulacion } from "@/components/badges";
import { prisma } from "@/lib/db";
import { ESTADO_ASIGNACION_LABEL, type EstadoAsignacion } from "@/lib/estado";
import { asegurarPreguntaNombreCaso, etiquetaNombreCaso, extraerNombreCaso } from "@/lib/nombre-caso";

const FILTROS = [
  { id: "todas", label: "Todas" },
  { id: "observaciones", label: "Observaciones por revisar" },
  { id: "finalizar", label: "Finalización por revisar" },
  { id: "devueltas", label: "Devueltas al evaluador" },
  { id: "finalizadas", label: "Finalizadas" },
] as const;

export async function SupervisorHome({
  supervisorId,
  searchParams,
}: {
  supervisorId: string;
  searchParams: Promise<{ filtro?: string }>;
}) {
  const { filtro = "todas" } = await searchParams;
  const activo = FILTROS.find((f) => f.id === filtro) ?? FILTROS[0];

  const refs = await prisma.asignacionSupervisor.findMany({
    where: { supervisorId },
    select: { postulacion: { select: { convocatoria: { select: { formularioId: true } } } } },
  });
  await Promise.all(
    [...new Set(refs.map((item) => item.postulacion.convocatoria.formularioId))].map((formularioId) =>
      asegurarPreguntaNombreCaso(formularioId),
    ),
  );

  const asignaciones = await prisma.asignacionSupervisor.findMany({
    where: { supervisorId },
    include: {
      postulacion: {
        include: {
          postulante: true,
          convocatoria: {
            include: { formulario: { include: { preguntas: { orderBy: { orden: "asc" } } } } },
          },
          respuestas: true,
          asignaciones: { include: { evaluador: true }, orderBy: { orden: "asc" } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const visibles = asignaciones.filter((item) => {
    const evals = item.postulacion.asignaciones;
    if (activo.id === "todas") return true;
    if (activo.id === "observaciones") {
      return evals.some((a) => a.estado === "EN_SUPERVISION" && a.intencionPendiente === "OBSERVACIONES");
    }
    if (activo.id === "finalizar") {
      return evals.some((a) => a.estado === "EN_SUPERVISION" && a.intencionPendiente === "FINALIZAR");
    }
    if (activo.id === "devueltas") {
      return evals.some((a) => a.estado === "DEVUELTA_SUPERVISOR");
    }
    if (activo.id === "finalizadas") {
      return evals.length > 0 && evals.every((a) => a.estado === "FINALIZADA");
    }
    return true;
  });

  return (
    <div className="page-workspace grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden">
      <div className="shrink-0 space-y-4 bg-background">
        <h1 className="text-3xl font-extrabold text-navy">Postulaciones a supervisar</h1>
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((item) => (
            <a
              key={item.id}
              href={`/evaluador?filtro=${item.id}`}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                item.id === activo.id
                  ? "bg-red !text-white shadow-md"
                  : "bg-white text-navy ring-1 ring-border hover:bg-navy-soft"
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
      <div className="page-scroll min-h-0 overflow-y-auto space-y-6 pr-1">
        {visibles.length === 0 ? <p className="text-muted">No hay postulaciones en este filtro.</p> : null}
        {visibles.map((item) => (
          <a
            key={item.id}
            href={`/evaluador/supervision/${item.postulacionId}`}
            className="card card-link block p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-navy">
                {etiquetaNombreCaso(
                  extraerNombreCaso(
                    item.postulacion.convocatoria.formulario.preguntas,
                    item.postulacion.respuestas,
                  ),
                )}{" "}
                · {item.postulacion.convocatoria.titulo}
              </h2>
              <BadgePostulacion estado={item.postulacion.estado} />
            </div>
            <p className="mt-2 text-muted">Participante: {item.postulacion.postulante.name}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {item.postulacion.asignaciones.length === 0 ? (
                <li className="text-sm text-muted">Sin evaluadores asignados</li>
              ) : (
                item.postulacion.asignaciones.map((asignacion) => (
                  <li key={asignacion.id} className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-navy">{asignacion.evaluador.name}</span>
                    <BadgeAsignacion estado={asignacion.estado} />
                    {asignacion.estado === "EN_SUPERVISION" && asignacion.intencionPendiente ? (
                      <span className="text-xs text-muted">
                        {asignacion.intencionPendiente === "FINALIZAR"
                          ? "Finalización"
                          : "Observaciones"}
                      </span>
                    ) : null}
                    <span className="sr-only">
                      {ESTADO_ASIGNACION_LABEL[asignacion.estado as EstadoAsignacion]}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </a>
        ))}
      </div>
    </div>
  );
}
