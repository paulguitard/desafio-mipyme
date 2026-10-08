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

export const BANDA_MOVIL_LABEL_EVALUADOR: Record<BandaPelota, string> = {
  todas: "Todas",
  "tu-turno": "Tu turno de evaluar",
  evaluador: "Turno del evaluador",
  supervisor: "Turno del supervisor",
  participante: "Turno del participante",
  cerrados: "Cerradas y finalizadas",
};

export const BANDA_MOVIL_LABEL_SUPERVISOR: Record<BandaPelota, string> = {
  todas: "Todas",
  "tu-turno": "Tu turno de supervisar",
  evaluador: "Turno del evaluador",
  supervisor: "Turno del supervisor",
  participante: "Turno del participante",
  cerrados: "Cerradas y finalizadas",
};

export type FiltroCaso = {
  id: string;
  label: string;
  labelCorto?: string;
  descripcion?: string;
  banda: BandaPelota;
  estados?: readonly EstadoAsignacion[];
};

export const FILTROS_EVALUADOR: FiltroCaso[] = [
  { id: "todas", label: "Todas", banda: "todas" },
  {
    id: "pendientes",
    label: "Pendientes",
    banda: "tu-turno",
    estados: ["PENDIENTE", "EN_REVISION"],
    descripcion:
      "Primer envío del participante: todavía no hay una evaluación enviada.",
  },
  {
    id: "observadas-supervisor",
    label: "Observadas por el supervisor",
    labelCorto: "Observadas",
    banda: "tu-turno",
    estados: ["DEVUELTA_SUPERVISOR"],
    descripcion:
      "El supervisor revisó tu evaluación y te la devolvió con observaciones. Ajusta tu revisión y vuelve a enviarla.",
  },
  {
    id: "reparadas",
    label: "Reparadas por el participante",
    labelCorto: "Reparadas",
    banda: "tu-turno",
    estados: ["REPARADA"],
    descripcion:
      "Casos que ya evaluaste y el participante corrigió o actualizó para que los vuelvas a revisar.",
  },
  {
    id: "supervision",
    label: "Esperando supervisión",
    labelCorto: "Supervisión",
    banda: "supervisor",
    estados: ["EN_SUPERVISION"],
    descripcion: "Casos que ya enviaste al supervisor y están a la espera de su revisión.",
  },
  {
    id: "observaciones",
    label: "Esperando respuesta",
    labelCorto: "Respuesta",
    banda: "participante",
    estados: ["CON_OBSERVACIONES"],
    descripcion: "Casos con observaciones enviadas al participante, a la espera de que las corrija.",
  },
  {
    id: "finalizadas",
    label: "Finalizadas",
    banda: "cerrados",
    estados: ["FINALIZADA"],
    descripcion: "Casos cerrados. Ya no requieren acción tuya.",
  },
];

export const FILTROS_SUPERVISOR: FiltroCaso[] = [
  { id: "todas", label: "Todas", banda: "todas" },
  {
    id: "observaciones",
    label: "Observaciones por revisar",
    labelCorto: "Observaciones",
    banda: "tu-turno",
    descripcion:
      "El evaluador te envió observaciones para que las revises: puedes proceder o devolverlas.",
  },
  {
    id: "finalizar",
    label: "Aprobaciones por revisar",
    labelCorto: "Aprobaciones",
    banda: "tu-turno",
    descripcion:
      "El evaluador pidió finalizar el caso. Revisa y confirma el cierre o devuelve observaciones.",
  },
  {
    id: "esperando-evaluacion",
    label: "Esperando evaluación",
    labelCorto: "Evaluación",
    banda: "evaluador",
    descripcion:
      "Casos en manos del evaluador: primer envío, en revisión o reparados por el participante.",
  },
  {
    id: "esperando-evaluacion-corregida",
    label: "Esperando evaluación corregida",
    labelCorto: "Corregida",
    banda: "evaluador",
    descripcion:
      "Casos que devolviste al evaluador. Están a la espera de que envíe la evaluación corregida.",
  },
  {
    id: "esperando-respuesta",
    label: "Esperando respuesta",
    labelCorto: "Respuesta",
    banda: "participante",
    descripcion: "Casos con observaciones ya enviadas al participante, a la espera de su corrección.",
  },
  {
    id: "finalizadas",
    label: "Finalizadas",
    banda: "cerrados",
    descripcion: "Casos cerrados. Ya no requieren acción tuya.",
  },
];

const FILTRO_SUPERVISOR_LEGADO: Record<string, string> = {
  devueltas: "esperando-evaluacion-corregida",
  en_curso: "esperando-evaluacion",
};

const URGENCIA_PENDIENTE: Record<string, number> = {
  DEVUELTA_SUPERVISOR: 0,
  EN_REVISION: 1,
  PENDIENTE: 2,
};

export function grupoFiltroEvaluador(estado: string, cicloSupervision = 1): string {
  if (estado === "DEVUELTA_SUPERVISOR" || (estado === "EN_REVISION" && cicloSupervision > 1)) {
    return "observadas-supervisor";
  }
  if (estado === "PENDIENTE" || estado === "EN_REVISION") {
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

const FILTRO_BANDA_TU_TURNO: FiltroCaso = {
  id: "tu-turno",
  label: BANDA_MOVIL_LABEL_SUPERVISOR["tu-turno"],
  banda: "tu-turno",
};

export function esIdBandaFiltro(id: string, filtros: FiltroCaso[]) {
  return filtros.some((item) => item.banda === id && item.id !== id);
}

export function resolverFiltroEvaluador(filtro?: string) {
  const id = filtro ?? "tu-turno";
  if (
    id === "tu-turno" ||
    esIdBandaFiltro(id, FILTROS_EVALUADOR) ||
    FILTROS_EVALUADOR.some((item) => item.id === id)
  ) {
    return id;
  }
  return "tu-turno";
}

export function resolverFiltroSupervisor(filtro?: string) {
  const id = FILTRO_SUPERVISOR_LEGADO[filtro ?? ""] ?? filtro ?? "tu-turno";
  if (id === "tu-turno") return FILTRO_BANDA_TU_TURNO;
  if (esIdBandaFiltro(id, FILTROS_SUPERVISOR)) {
    return {
      id,
      label: BANDA_MOVIL_LABEL_SUPERVISOR[id as BandaPelota],
      banda: id as BandaPelota,
    };
  }
  return FILTROS_SUPERVISOR.find((f) => f.id === id) ?? FILTRO_BANDA_TU_TURNO;
}

export type AsignacionSupervisionVista = {
  estado: string;
  intencionPendiente: string | null;
  cicloSupervision?: number;
};

export function evaluadorDebeCorregirEvaluacion(asignacion: {
  estado: string;
  cicloSupervision?: number;
}) {
  return (
    asignacion.estado === "DEVUELTA_SUPERVISOR" ||
    (asignacion.estado === "EN_REVISION" && (asignacion.cicloSupervision ?? 1) > 1)
  );
}

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
  const esperaEvaluacion = estadoSupervisionFicha(evals) === "esperando-evaluacion";
  const hayCorreccion = evals.some(evaluadorDebeCorregirEvaluacion);
  if (filtroId === "esperando-evaluacion-corregida") {
    return esperaEvaluacion && hayCorreccion;
  }
  if (filtroId === "esperando-evaluacion") {
    return esperaEvaluacion && !hayCorreccion;
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
): {
  id: string;
  label: string;
  labelCorto?: string;
  descripcion?: string;
  banda: BandaPelota;
  items: T[];
}[] {
  const secciones = filtros.filter((f) => f.id !== "todas");
  const vistaBanda = esIdBandaFiltro(activoId, filtros);
  const fuente =
    activoId === "todas"
      ? secciones
      : vistaBanda
        ? secciones.filter((f) => f.banda === activoId)
        : secciones.filter((f) => f.id === activoId);
  return fuente
    .map((f) => ({
      id: f.id,
      label: f.label,
      labelCorto: f.labelCorto,
      descripcion: f.descripcion,
      banda: f.banda,
      items: itemsDe(f.id),
    }))
    .filter((g) => activoId === "todas" || vistaBanda ? g.items.length > 0 : true);
}

export type CasoPanelExtra = {
  nombre: string;
  estado: string;
  etiqueta: string;
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
  const bandas = new Set(filtros.map((item) => item.banda));
  for (const banda of bandas) {
    if (banda === "todas") continue;
    const ids = new Set(filtros.filter((item) => item.banda === banda).map((item) => item.id));
    counts[banda] = casos.filter((caso) => caso.grupos.some((grupo) => ids.has(grupo))).length;
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
