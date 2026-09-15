export const ESTADOS_ASIGNACION = [
  "PENDIENTE",
  "EN_REVISION",
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

export const ESTADO_POSTULACION_LABEL: Record<EstadoPostulacion, string> = {
  BORRADOR: "Borrador",
  ENVIADA: "Enviada",
  EN_EVALUACION: "En evaluación",
  CON_OBSERVACIONES: "Con observaciones",
  REPARADA_POR_EL_EMPRENDEDOR: "Reparada por el emprendedor",
  FINALIZADA: "Finalizada",
};

export const ESTADO_ASIGNACION_LABEL: Record<EstadoAsignacion, string> = {
  PENDIENTE: "Pendiente",
  EN_REVISION: "En revisión",
  CON_OBSERVACIONES: "Con observaciones",
  REPARADA: "Reparada por el emprendedor",
  FINALIZADA: "Finalizada",
};

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
    (a) => a.estado === "PENDIENTE" || a.estado === "EN_REVISION",
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
