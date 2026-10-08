import { CasosPanel } from "@/components/casos-panel";
import { prisma } from "@/lib/db";
import {
  etiquetaAsignacionPanelSupervisor,
  BANDA_MOVIL_LABEL_SUPERVISOR,
  FILTROS_SUPERVISOR,
  gruposDeSupervisor,
  resolverFiltroSupervisor,
} from "@/lib/casos-panel";
import { etiquetaNombreCaso } from "@/lib/nombre-caso";

export async function SupervisorHome({
  supervisorId,
  searchParams,
}: {
  supervisorId: string;
  searchParams: Promise<{ filtro?: string }>;
}) {
  const { filtro } = await searchParams;
  const activo = resolverFiltroSupervisor(filtro);

  const asignaciones = await prisma.asignacionSupervisor.findMany({
    where: { supervisorId },
    include: {
      postulacion: {
        include: {
          postulante: { select: { name: true } },
          convocatoria: { select: { titulo: true } },
          asignaciones: { include: { evaluador: { select: { name: true } } }, orderBy: { orden: "asc" } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const casos = asignaciones.map((item) => ({
    id: item.id,
    href: `/evaluador/supervision/${item.postulacionId}`,
    nombre: etiquetaNombreCaso(item.postulacion.nombreCaso),
    detalle: `${item.postulacion.convocatoria.titulo} · ${item.postulacion.postulante.name}`,
    estado: item.postulacion.asignaciones[0]?.estado ?? "PENDIENTE",
    etiqueta: etiquetaAsignacionPanelSupervisor(item.postulacion.asignaciones[0]?.estado ?? "PENDIENTE"),
    grupos: gruposDeSupervisor(item.postulacion.asignaciones),
    updatedAt: item.updatedAt.getTime(),
    extra: item.postulacion.asignaciones.map((asignacion) => ({
      nombre: asignacion.evaluador.name,
      estado: asignacion.estado,
      etiqueta: etiquetaAsignacionPanelSupervisor(asignacion.estado),
    })),
  }));

  return (
    <CasosPanel
      titulo="Evaluaciones a supervisar"
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
