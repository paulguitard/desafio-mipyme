import { BadgeAsignacion } from "@/components/badges";
import { prisma } from "@/lib/db";
import { ESTADO_ASIGNACION_LABEL, type EstadoAsignacion } from "@/lib/estado";
import { asegurarPreguntaNombreCaso, etiquetaNombreCaso, extraerNombreCaso } from "@/lib/nombre-caso";
import { requireUser } from "@/lib/session";

const FILTROS: { id: string; label: string; estados?: EstadoAsignacion[] }[] = [
  { id: "todas", label: "Todas" },
  { id: "pendientes", label: "Pendientes", estados: ["PENDIENTE", "EN_REVISION"] },
  { id: "observaciones", label: "Con observaciones", estados: ["CON_OBSERVACIONES"] },
  { id: "reparadas", label: "Reparadas por el emprendedor", estados: ["REPARADA"] },
  { id: "finalizadas", label: "Finalizadas", estados: ["FINALIZADA"] },
];

export default async function EvaluadorHomePage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const user = await requireUser("EVALUADOR");
  const { filtro = "todas" } = await searchParams;
  const activo = FILTROS.find((f) => f.id === filtro) ?? FILTROS[0];

  const filtroAsignacion = {
    evaluadorId: user.id,
    ...(activo.estados ? { estado: { in: activo.estados } } : {}),
  };
  const refs = await prisma.asignacionEvaluador.findMany({
    where: filtroAsignacion,
    select: { postulacion: { select: { convocatoria: { select: { formularioId: true } } } } },
  });
  await Promise.all(
    [...new Set(refs.map((item) => item.postulacion.convocatoria.formularioId))].map((formularioId) =>
      asegurarPreguntaNombreCaso(formularioId),
    ),
  );

  const asignaciones = await prisma.asignacionEvaluador.findMany({
    where: filtroAsignacion,
    include: {
      postulacion: {
        include: {
          postulante: true,
          convocatoria: {
            include: { formulario: { include: { preguntas: { orderBy: { orden: "asc" } } } } },
          },
          respuestas: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="page-workspace grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden">
      <div className="shrink-0 space-y-4 bg-background">
      <h1 className="text-3xl font-extrabold text-navy">Evaluaciones asignadas</h1>
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
      {asignaciones.length === 0 ? <p className="text-muted">No hay evaluaciones en este filtro.</p> : null}
      {asignaciones.map((item) => (
        <a key={item.id} href={`/evaluador/evaluaciones/${item.id}`} className="card card-link block p-6">
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
            <BadgeAsignacion estado={item.estado} />
          </div>
          <p className="text-muted">
            Emprendedor: {item.postulacion.postulante.name} · {ESTADO_ASIGNACION_LABEL[item.estado as EstadoAsignacion]}
          </p>
        </a>
      ))}
      </div>
    </div>
  );
}
