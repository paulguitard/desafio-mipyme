export const TIPOS_FORMULARIO = ["FEEDBACK", "CONTENIDO"] as const;
export type TipoFormulario = (typeof TIPOS_FORMULARIO)[number];

export const TIPO_FORMULARIO_LABEL: Record<TipoFormulario, string> = {
  FEEDBACK: "Feedback",
  CONTENIDO: "Contenido",
};

export function parseTipoFormulario(raw?: string | null): TipoFormulario {
  return raw === "CONTENIDO" ? "CONTENIDO" : "FEEDBACK";
}

export function esTipoFormulario(value: string): value is TipoFormulario {
  return (TIPOS_FORMULARIO as readonly string[]).includes(value);
}

export function esMentoriaContenido(tipo?: string | null): boolean {
  return parseTipoFormulario(tipo) === "CONTENIDO";
}
