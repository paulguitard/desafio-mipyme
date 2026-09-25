export const ESTADOS_ASIGNACION = [
  "PENDIENTE",
  "EN_REVISION",
  "EN_SUPERVISION",
  "DEVUELTA_SUPERVISOR",
  "CON_OBSERVACIONES",
  "REPARADA",
  "FINALIZADA",
] as const;

export type EstadoAsignacion = (typeof ESTADOS_ASIGNACION)[number];

export const ESTADOS_POSTULACION = [
  "BORRADOR",
  "ENVIADA",
  "EN_EVALUACION",
  "CON_OBSERVACIONES",
  "REPARADA_POR_EL_EMPRENDEDOR",
  "FINALIZADA",
] as const;

export type EstadoPostulacion = (typeof ESTADOS_POSTULACION)[number];

export const INTENCIONES_SUPERVISION = ["OBSERVACIONES", "FINALIZAR"] as const;
export type IntencionSupervision = (typeof INTENCIONES_SUPERVISION)[number];

export const ESTADO_POSTULACION_LABEL: Record<EstadoPostulacion, string> = {
  BORRADOR: "Borrador",
  ENVIADA: "Enviada",
  EN_EVALUACION: "En evaluación",
  CON_OBSERVACIONES: "Con observaciones",
  REPARADA_POR_EL_EMPRENDEDOR: "Reparada por el participante",
  FINALIZADA: "Finalizada",
};

export const ESTADO_ASIGNACION_LABEL: Record<EstadoAsignacion, string> = {
  PENDIENTE: "Pendiente",
  EN_REVISION: "En revisión",
  EN_SUPERVISION: "En supervisión",
  DEVUELTA_SUPERVISOR: "Devuelta por el supervisor",
  CON_OBSERVACIONES: "Con observaciones",
  REPARADA: "Reparada por el participante",
  FINALIZADA: "Finalizada",
};

export function evaluadorPuedeEditar(estado: string) {
  return (
    estado !== "FINALIZADA" &&
    estado !== "CON_OBSERVACIONES" &&
    estado !== "EN_SUPERVISION"
  );
}

export function derivarEstadoPostulacion(args: {
  enviadaAt: Date | null;
  asignaciones: { estado: string }[];
}): EstadoPostulacion {
  if (!args.enviadaAt) return "BORRADOR";
  if (args.asignaciones.length === 0) return "ENVIADA";
  if (args.asignaciones.every((a) => a.estado === "FINALIZADA")) {
    return "FINALIZADA";
  }

  const noFinal = args.asignaciones.filter((a) => a.estado !== "FINALIZADA");
  const hayPendienteRevision = noFinal.some(
    (a) =>
      a.estado === "PENDIENTE" ||
      a.estado === "EN_REVISION" ||
      a.estado === "EN_SUPERVISION" ||
      a.estado === "DEVUELTA_SUPERVISOR",
  );
  const hayReparada = noFinal.some((a) => a.estado === "REPARADA");
  const hayObservaciones = noFinal.some((a) => a.estado === "CON_OBSERVACIONES");

  if (hayPendienteRevision) {
    if (hayReparada) return "REPARADA_POR_EL_EMPRENDEDOR";
    return "EN_EVALUACION";
  }
  if (hayReparada) return "REPARADA_POR_EL_EMPRENDEDOR";
  if (hayObservaciones) return "CON_OBSERVACIONES";
  return "EN_EVALUACION";
}

export function postulacionEditable(
  estadoPostulacion: EstadoPostulacion,
  convocatoriaAbierta: boolean,
): boolean {
  if (!convocatoriaAbierta) return false;
  return estadoPostulacion === "BORRADOR" || estadoPostulacion === "CON_OBSERVACIONES";
}

export function rondaRespuestaEmprendedor(
  asignaciones: { estado: string; rondaActual: number }[],
): number {
  if (asignaciones.length === 0) return 1;
  return Math.max(
    ...asignaciones.map((asignacion) =>
      asignacion.estado === "CON_OBSERVACIONES"
        ? asignacion.rondaActual + 1
        : asignacion.rondaActual,
    ),
  );
}
