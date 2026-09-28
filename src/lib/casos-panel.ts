import type { EstadoAsignacion } from "@/lib/estado";
import { ESTADO_ASIGNACION_LABEL } from "@/lib/estado";
import {
  estadoAsignacionFicha,
  estadoSupervisionFicha,
  etiquetaEstadoAsignacionFicha,
} from "@/lib/convocatoria-evaluacion-filtros";

export type BandaPelota = "todas" | "tu-turno" | "evaluador" | "supervisor" | "participante" | "cerrados";

export const BANDA_PELOTA_LABEL: Record<BandaPelota, string> = {
  todas: "",
  "tu-turno": "Tu turno",
  evaluador: "Turno del evaluador",
  supervisor: "Turno del supervisor",
  participante: "Turno del participante",
  cerrados: "Cerrados",
};

export type FiltroCaso = {
  id: string;
  label: string;
  banda: BandaPelota;
  estados?: readonly EstadoAsignacion[];
};

export const FILTROS_EVALUADOR: FiltroCaso[] = [
  { id: "todas", label: "Todas", banda: "todas" },
  {
    id: "pendientes",
    label: "Pendientes",
    banda: "tu-turno",
    estados: ["PENDIENTE", "EN_REVISION", "DEVUELTA_SUPERVISOR"],
  },
  { id: "reparadas", label: "Reparadas por el participante", banda: "tu-turno", estados: ["REPARADA"] },
  { id: "supervision", label: "Esperando supervisión", banda: "supervisor", estados: ["EN_SUPERVISION"] },
  { id: "observaciones", label: "Esperando respuesta", banda: "participante", estados: ["CON_OBSERVACIONES"] },
  { id: "finalizadas", label: "Finalizadas", banda: "cerrados", estados: ["FINALIZADA"] },
];

export const FILTROS_SUPERVISOR: FiltroCaso[] = [
  { id: "todas", label: "Todas", banda: "todas" },
  { id: "observaciones", label: "Observaciones por revisar", banda: "tu-turno" },
  { id: "finalizar", label: "Finalización por revisar", banda: "tu-turno" },
  { id: "esperando-evaluacion", label: "Esperando evaluación", banda: "evaluador" },
  { id: "esperando-respuesta", label: "Esperando respuesta", banda: "participante" },
  { id: "finalizadas", label: "Finalizadas", banda: "cerrados" },
];

const FILTRO_SUPERVISOR_LEGADO: Record<string, string> = {
  devueltas: "esperando-evaluacion",
  en_curso: "esperando-evaluacion",
};

const URGENCIA_PENDIENTE: Record<string, number> = {
  DEVUELTA_SUPERVISOR: 0,
  EN_REVISION: 1,
  PENDIENTE: 2,
};

export function grupoFiltroEvaluador(estado: string): string {
  if (estado === "PENDIENTE" || estado === "EN_REVISION" || estado === "DEVUELTA_SUPERVISOR") {
    return "pendientes";
  }
  if (estado === "REPARADA") return "reparadas";
  if (estado === "EN_SUPERVISION") return "supervision";
  if (estado === "CON_OBSERVACIONES") return "observaciones";
  if (estado === "FINALIZADA") return "finalizadas";
  return "pendientes";
}

export function compararUrgenciaPendiente(a: string, b: string) {
  return (URGENCIA_PENDIENTE[a] ?? 9) - (URGENCIA_PENDIENTE[b] ?? 9);
}

export function etiquetaAsignacionPanelEvaluador(estado: string) {
  const ficha = estadoAsignacionFicha(estado);
  if (ficha === "pendiente") {
    return ESTADO_ASIGNACION_LABEL[estado as EstadoAsignacion] ?? "Pendiente";
  }
  return etiquetaEstadoAsignacionFicha(ficha);
}

export function etiquetaAsignacionPanelSupervisor(estado: string) {
  return etiquetaEstadoAsignacionFicha(estadoAsignacionFicha(estado));
}

export function resolverFiltroSupervisor(filtro?: string) {
  const id = FILTRO_SUPERVISOR_LEGADO[filtro ?? ""] ?? filtro ?? "todas";
  return FILTROS_SUPERVISOR.find((f) => f.id === id) ?? FILTROS_SUPERVISOR[0];
}

export type AsignacionSupervisionVista = {
  estado: string;
  intencionPendiente: string | null;
};

export function supervisorCoincideFiltro(
  filtroId: string,
  evals: AsignacionSupervisionVista[],
): boolean {
  if (filtroId === "todas") return true;
  if (filtroId === "observaciones") {
    return evals.some((a) => a.estado === "EN_SUPERVISION" && a.intencionPendiente === "OBSERVACIONES");
  }
  if (filtroId === "finalizar") {
    return evals.some((a) => a.estado === "EN_SUPERVISION" && a.intencionPendiente === "FINALIZAR");
  }
  if (filtroId === "esperando-respuesta") {
    return estadoSupervisionFicha(evals) === "esperando-respuesta";
  }
  if (filtroId === "esperando-evaluacion") {
    return estadoSupervisionFicha(evals) === "esperando-evaluacion";
  }
  if (filtroId === "finalizadas") {
    return evals.length > 0 && evals.every((a) => a.estado === "FINALIZADA");
  }
  return false;
}

export type BandaFiltros<T extends { banda: BandaPelota }> = {
  id: BandaPelota;
  label: string;
  filtros: T[];
};

export function agruparFiltrosPorBanda<T extends { banda: BandaPelota }>(filtros: T[]): BandaFiltros<T>[] {
  const bandas: BandaFiltros<T>[] = [];
  for (const filtro of filtros) {
    const ultima = bandas[bandas.length - 1];
    if (ultima && ultima.id === filtro.banda) {
      ultima.filtros.push(filtro);
      continue;
    }
    bandas.push({
      id: filtro.banda,
      label: BANDA_PELOTA_LABEL[filtro.banda],
      filtros: [filtro],
    });
  }
  return bandas;
}

export function gruposVisibles<T>(
  filtros: FiltroCaso[],
  activoId: string,
  itemsDe: (filtroId: string) => T[],
): { id: string; label: string; banda: BandaPelota; items: T[] }[] {
  const secciones = filtros.filter((f) => f.id !== "todas");
  const fuente = activoId === "todas" ? secciones : secciones.filter((f) => f.id === activoId);
  return fuente
    .map((f) => ({ id: f.id, label: f.label, banda: f.banda, items: itemsDe(f.id) }))
    .filter((g) => activoId !== "todas" || g.items.length > 0);
}

export type CasoPanelExtra = {
  nombre: string;
  estado: string;
  etiqueta: string;
  intencion: string | null;
};

export type CasoPanelVista = {
  id: string;
  href: string;
  nombre: string;
  detalle: string;
  estado: string;
  etiqueta: string;
  grupos: string[];
  updatedAt: number;
  extra?: CasoPanelExtra[];
};

export function conteosCasos(casos: CasoPanelVista[], filtros: FiltroCaso[]) {
  const counts: Record<string, number> = { todas: casos.length };
  for (const item of filtros) {
    if (item.id === "todas") continue;
    counts[item.id] = casos.filter((caso) => caso.grupos.includes(item.id)).length;
  }
  return counts;
}

export function itemsDeGrupo(casos: CasoPanelVista[], filtroId: string) {
  const items = casos.filter((caso) => caso.grupos.includes(filtroId));
  if (filtroId === "pendientes") {
    items.sort((a, b) => {
      const urgencia = compararUrgenciaPendiente(a.estado, b.estado);
      if (urgencia !== 0) return urgencia;
      return b.updatedAt - a.updatedAt;
    });
  }
  return items;
}

export function gruposDeSupervisor(evals: AsignacionSupervisionVista[]) {
  return FILTROS_SUPERVISOR.filter((f) => f.id !== "todas" && supervisorCoincideFiltro(f.id, evals)).map(
    (f) => f.id,
  );
}
