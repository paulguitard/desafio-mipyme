import { CasosPanel } from "@/components/casos-panel";
import { prisma } from "@/lib/db";
import {
  etiquetaAsignacionPanelEvaluador,
  FILTROS_EVALUADOR,
  grupoFiltroEvaluador,
} from "@/lib/casos-panel";
import { etiquetaNombreCaso } from "@/lib/nombre-caso";
import { requireCatalogoEvaluador } from "@/lib/session";
import { SupervisorHome } from "@/components/supervisor-home";

export default async function EvaluadorHomePage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const user = await requireCatalogoEvaluador();
  if (user.role === "SUPERVISOR") {
    return <SupervisorHome supervisorId={user.id} searchParams={searchParams} />;
  }

  const { filtro = "todas" } = await searchParams;
  const asignaciones = await prisma.asignacionEvaluador.findMany({
    where: { evaluadorId: user.id },
    include: {
      postulacion: {
        include: {
          postulante: { select: { name: true } },
          convocatoria: { select: { titulo: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const casos = asignaciones.map((item) => ({
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
      filtroInicial={filtro}
      casos={casos}
      tourFiltros="filtros-evaluacion"
      tourLista="lista-evaluaciones"
      emptyLabel="Aún no tienes evaluaciones asignadas."
    />
  );
}
