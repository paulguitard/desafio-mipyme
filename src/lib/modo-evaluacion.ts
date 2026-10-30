export const MODOS_EVALUACION = ["POR_PREGUNTA", "GENERAL", "RUBRICA"] as const;

export type ModoEvaluacion = (typeof MODOS_EVALUACION)[number];

export const MODO_EVALUACION_LABEL: Record<ModoEvaluacion, string> = {
  POR_PREGUNTA: "Evaluación pregunta por pregunta",
  GENERAL: "Evaluación general",
  RUBRICA: "Evaluación por rúbrica",
};

export const MODO_EVALUACION_BOTON: Record<ModoEvaluacion, string> = {
  POR_PREGUNTA: "Por pregunta",
  GENERAL: "General",
  RUBRICA: "Rúbrica",
};

export function esModoEvaluacion(value: string): value is ModoEvaluacion {
  return (MODOS_EVALUACION as readonly string[]).includes(value);
}

export function parseModoEvaluacion(value: unknown): ModoEvaluacion {
  const raw = String(value ?? "").trim();
  return esModoEvaluacion(raw) ? raw : "POR_PREGUNTA";
}

export function esModoRubrica(value: unknown): boolean {
  return parseModoEvaluacion(value) === "RUBRICA";
}

export function modoEvaluacionAlCrear(
  value: unknown,
  permitirPorPregunta: boolean,
): ModoEvaluacion {
  const raw = String(value ?? "").trim();
  if (raw === "RUBRICA") return "RUBRICA";
  if (!permitirPorPregunta) return "GENERAL";
  return parseModoEvaluacion(value);
}

export function puedeAsignarModoEvaluacion(
  modo: ModoEvaluacion,
  permitirPorPregunta: boolean,
  modoActual?: string | null,
): boolean {
  if (modo !== "POR_PREGUNTA") return true;
  if (permitirPorPregunta) return true;
  return modoActual === "POR_PREGUNTA";
}
