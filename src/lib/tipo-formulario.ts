export const TIPOS_FORMULARIO = ["FEEDBACK", "CONTENIDO", "CARGA_INFORMACION"] as const;
export type TipoFormulario = (typeof TIPOS_FORMULARIO)[number];

export const TIPO_FORMULARIO_LABEL: Record<TipoFormulario, string> = {
  FEEDBACK: "Feedback",
  CONTENIDO: "Contenido",
  CARGA_INFORMACION: "Carga de información",
};

export function parseTipoFormulario(raw?: string | null): TipoFormulario {
  if (raw === "CONTENIDO") return "CONTENIDO";
  if (raw === "CARGA_INFORMACION") return "CARGA_INFORMACION";
  return "FEEDBACK";
}

export function esTipoFormulario(value: string): value is TipoFormulario {
  return (TIPOS_FORMULARIO as readonly string[]).includes(value);
}

export function esMentoriaContenido(tipo?: string | null): boolean {
  return parseTipoFormulario(tipo) === "CONTENIDO";
}

export function esCargaInformacion(tipo?: string | null): boolean {
  return parseTipoFormulario(tipo) === "CARGA_INFORMACION";
}

/** Solo Feedback tiene evaluadores, supervisores y notas. */
export function mentoriaTieneRevision(tipo?: string | null): boolean {
  return parseTipoFormulario(tipo) === "FEEDBACK";
}
