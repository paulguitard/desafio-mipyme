export type RevisionConCiclo = {
  ronda: number;
  ciclo?: number;
};

export function coincideRevisionCiclo(
  item: RevisionConCiclo,
  ronda: number,
  ciclo: number,
) {
  return item.ronda === ronda && (item.ciclo ?? 1) === ciclo;
}

/** Exact match of the current evaluation round+cycle (what the participant may see). */
export function revisionVigente<T extends RevisionConCiclo>(
  items: T[],
  ronda: number,
  ciclo: number,
): T | undefined {
  return items.find((item) => coincideRevisionCiclo(item, ronda, ciclo));
}

/** Current cycle if saved; otherwise the previous cycle of the same round (for prefill). */
export function revisionParaEditar<T extends RevisionConCiclo>(
  items: T[],
  ronda: number,
  ciclo: number,
): T | undefined {
  const vigente = revisionVigente(items, ronda, ciclo);
  if (vigente) return vigente;
  return items
    .filter((item) => item.ronda === ronda && (item.ciclo ?? 1) < ciclo)
    .sort((a, b) => (b.ciclo ?? 1) - (a.ciclo ?? 1))[0];
}

export function historialEvaluacion(
  items: {
    id: string;
    ronda: number;
    ciclo: number;
    veredicto: string;
    comentario: string;
    nota?: number | null;
    createdAt: string;
  }[],
) {
  return items.map((item) => ({
    id: item.id,
    ronda: item.ronda,
    ciclo: item.ciclo,
    veredicto: item.veredicto,
    comentario: item.comentario,
    nota: item.nota ?? null,
    createdAt: item.createdAt,
    etiqueta: `Evaluación (ronda ${item.ronda} · ciclo ${item.ciclo})`,
  }));
}

const ESTADOS_EVALUACION_VISIBLE_PARTICIPANTE = new Set([
  "CON_OBSERVACIONES",
  "REPARADA",
  "FINALIZADA",
]);

/** Rondas ya enviadas al participante, o la ronda actual si ya procedió la supervisión. */
export function rondaVisibleParticipante(
  ronda: number,
  asignacion: { estado: string; rondaActual: number },
) {
  if (ronda < asignacion.rondaActual) return true;
  if (ronda > asignacion.rondaActual) return false;
  return ESTADOS_EVALUACION_VISIBLE_PARTICIPANTE.has(asignacion.estado);
}

/** Último ciclo de cada ronda (la versión que cerró el ida y vuelta con supervisión). */
export function ultimasVersionesPorRonda<T extends RevisionConCiclo>(items: T[]): T[] {
  const porRonda = new Map<number, T>();
  for (const item of items) {
    const actual = porRonda.get(item.ronda);
    if (!actual || (item.ciclo ?? 1) > (actual.ciclo ?? 1)) {
      porRonda.set(item.ronda, item);
    }
  }
  return [...porRonda.values()].sort((a, b) => a.ronda - b.ronda);
}

export function revisionesParaParticipante<T extends RevisionConCiclo>(
  items: T[],
  asignacion: { estado: string; rondaActual: number },
): T[] {
  return ultimasVersionesPorRonda(
    items.filter((item) => rondaVisibleParticipante(item.ronda, asignacion)),
  );
}

export function historialEvaluacionParticipante(
  items: {
    id: string;
    ronda: number;
    ciclo: number;
    veredicto: string;
    comentario: string;
    nota?: number | null;
    createdAt: string;
  }[],
) {
  return historialEvaluacion(items).map((item) => ({
    ...item,
    etiqueta: `Evaluación (ronda ${item.ronda})`,
  }));
}

export function textoEsperaRevision(
  tipo: "evaluacion" | "supervision",
  nombre?: string | null,
) {
  const accion = tipo === "supervision" ? "supervisión" : "evaluación";
  const quien = nombre?.trim();
  return quien ? `Esperando ${accion} de ${quien}` : `Esperando ${accion}`;
}

export function ordenHistorialRevision(
  a: { ronda: number; ciclo?: number },
  b: { ronda: number; ciclo?: number },
) {
  if (b.ronda !== a.ronda) return b.ronda - a.ronda;
  return (b.ciclo ?? 0) - (a.ciclo ?? 0);
}
