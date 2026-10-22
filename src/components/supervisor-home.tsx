import { CasosPanel } from "@/components/casos-panel";
import { prisma } from "@/lib/db";
import {
  etiquetaAsignacionPanelEvaluador,
  etiquetaAsignacionPanelSupervisor,
  BANDA_MOVIL_LABEL_SUPERVISOR,
  FILTROS_EVALUADOR,
  FILTROS_SUPERVISOR,
  grupoFiltroEvaluador,
  gruposDeSupervisor,
  resolverFiltroEvaluador,
  resolverFiltroSupervisor,
} from "@/lib/casos-panel";
import {
  modoRevisionDeConvocatoria,
  supervisorActuaComoEvaluador,
} from "@/lib/modo-revision";
import { etiquetaNombreCaso } from "@/lib/nombre-caso";

export async function SupervisorHome({
  supervisorId,
  searchParams,
}: {
  supervisorId: string;
  searchParams: Promise<{ filtro?: string }>;
}) {
  const { filtro } = await searchParams;

  const [asignacionesSupervision, asignacionesComoEvaluador] = await Promise.all([
    prisma.asignacionSupervisor.findMany({
      where: { supervisorId },
      include: {
        postulacion: {
          include: {
            postulante: { select: { name: true } },
            convocatoria: {
              select: {
                titulo: true,
                tipo: true,
                evaluadoresHabilitados: true,
                supervisoresHabilitados: true,
              },
            },
            asignaciones: {
              include: { evaluador: { select: { name: true } } },
              orderBy: { orden: "asc" },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.asignacionEvaluador.findMany({
      where: { evaluadorId: supervisorId },
      include: {
        postulacion: {
          include: {
            postulante: { select: { name: true } },
            convocatoria: {
              select: {
                titulo: true,
                tipo: true,
                evaluadoresHabilitados: true,
                supervisoresHabilitados: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const supervisiones = asignacionesSupervision.filter(
    (item) => !supervisorActuaComoEvaluador(modoRevisionDeConvocatoria(item.postulacion.convocatoria)),
  );
  const evaluacionesPropias = asignacionesComoEvaluador.filter((item) =>
    supervisorActuaComoEvaluador(modoRevisionDeConvocatoria(item.postulacion.convocatoria)),
  );

  if (evaluacionesPropias.length > 0 && supervisiones.length === 0) {
    const filtroActivo = resolverFiltroEvaluador(filtro);
    const casos = evaluacionesPropias.map((item) => ({
      id: item.id,
      href: `/evaluador/evaluaciones/${item.id}`,
      nombre: etiquetaNombreCaso(item.postulacion.nombreCaso),
      detalle: `${item.postulacion.convocatoria.titulo} · ${item.postulacion.postulante.name}`,
      estado: item.estado,
      etiqueta: etiquetaAsignacionPanelEvaluador(item.estado),
      grupos: [grupoFiltroEvaluador(item.estado, item.cicloSupervision)],
      updatedAt: item.updatedAt.getTime(),
    }));

    return (
      <CasosPanel
        titulo="Evaluaciones asignadas"
        filtros={FILTROS_EVALUADOR}
        filtroInicial={filtroActivo}
        casos={casos}
        tourFiltros="filtros-evaluacion"
        tourLista="lista-evaluaciones"
        emptyLabel="Aún no tienes evaluaciones asignadas."
      />
    );
  }

  const activo = resolverFiltroSupervisor(filtro);
  const casosSupervision = supervisiones.map((item) => ({
    id: item.id,
    href: `/evaluador/supervision/${item.postulacionId}`,
    nombre: etiquetaNombreCaso(item.postulacion.nombreCaso),
    estado: item.postulacion.asignaciones[0]?.estado ?? "PENDIENTE",
    etiqueta: etiquetaAsignacionPanelSupervisor(
      item.postulacion.asignaciones[0]?.estado ?? "PENDIENTE",
    ),
    grupos: gruposDeSupervisor(item.postulacion.asignaciones),
    updatedAt: item.updatedAt.getTime(),
    detalle: `${item.postulacion.convocatoria.titulo} · ${item.postulacion.postulante.name}`,
    extra: item.postulacion.asignaciones.map((asignacion) => ({
      nombre: asignacion.evaluador.name,
      estado: asignacion.estado,
      etiqueta: etiquetaAsignacionPanelSupervisor(asignacion.estado),
    })),
  }));

  const casosEvaluacion = evaluacionesPropias.map((item) => ({
    id: `eval-${item.id}`,
    href: `/evaluador/evaluaciones/${item.id}`,
    nombre: etiquetaNombreCaso(item.postulacion.nombreCaso),
    detalle: `${item.postulacion.convocatoria.titulo} · ${item.postulacion.postulante.name}`,
    estado: item.estado,
    etiqueta: etiquetaAsignacionPanelEvaluador(item.estado),
    grupos: gruposDeSupervisor([
      {
        estado: item.estado === "EN_SUPERVISION" ? "PENDIENTE" : item.estado,
        intencionPendiente: null,
        cicloSupervision: item.cicloSupervision,
      },
    ]),
    updatedAt: item.updatedAt.getTime(),
  }));

  // Si hay ambos tipos, mostramos supervisión clásica y añadimos las evaluaciones
  // propias en "esperando-evaluacion" / filtros equivalentes vía gruposDeSupervisor adaptados.
  // Para no mezclar filtros incompatibles, cuando hay evaluaciones propias además de
  // supervisiones, las listamos en el mismo panel con enlace directo a evaluación.
  const casos =
    evaluacionesPropias.length > 0
      ? [
          ...casosSupervision,
          ...casosEvaluacion.map((caso) => ({
            ...caso,
            // Fuerza aparición en "tu turno" / pendientes de acción del supervisor-evaluador
            grupos:
              caso.estado === "PENDIENTE" ||
              caso.estado === "EN_REVISION" ||
              caso.estado === "REPARADA" ||
              caso.estado === "DEVUELTA_SUPERVISOR"
                ? ["esperando-evaluacion"]
                : caso.estado === "CON_OBSERVACIONES"
                  ? ["esperando-respuesta"]
                  : caso.estado === "FINALIZADA"
                    ? ["finalizadas"]
                    : ["esperando-evaluacion"],
          })),
        ]
      : casosSupervision;

  return (
    <CasosPanel
      titulo={
        evaluacionesPropias.length > 0
          ? "Casos asignados"
          : "Evaluaciones a supervisar"
      }
      filtros={FILTROS_SUPERVISOR}
      filtroInicial={activo.id}
      casos={casos}
      tourFiltros="filtros-supervision"
      tourLista="lista-supervision"
      labelsBandaMovil={BANDA_MOVIL_LABEL_SUPERVISOR}
      emptyLabel="Aún no tienes participaciones asignadas."
    />
  );
}
