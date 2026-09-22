export const MODOS_EVALUACION = ["POR_PREGUNTA", "GENERAL"] as const;

export type ModoEvaluacion = (typeof MODOS_EVALUACION)[number];

export const MODO_EVALUACION_LABEL: Record<ModoEvaluacion, string> = {
  POR_PREGUNTA: "Evaluación pregunta por pregunta",
  GENERAL: "Evaluación general",
};

export const MODO_EVALUACION_BOTON: Record<ModoEvaluacion, string> = {
  POR_PREGUNTA: "Por pregunta",
  GENERAL: "General",
};

export function esModoEvaluacion(value: string): value is ModoEvaluacion {
  return (MODOS_EVALUACION as readonly string[]).includes(value);
}

export function parseModoEvaluacion(value: unknown): ModoEvaluacion {
  const raw = String(value ?? "").trim();
  return esModoEvaluacion(raw) ? raw : "POR_PREGUNTA";
}
