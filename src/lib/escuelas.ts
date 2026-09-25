export const ESCUELAS = [
  "Administración y Gestión Empresarial",
  "Artes e Industrias Creativas",
  "Desarrollo Social y Educación",
  "Estética Integral",
  "Gastronomía, Hotelería y Turismo",
  "Ingeniería, Energía y Tecnología",
  "Salud y Deporte",
] as const;

export type Escuela = (typeof ESCUELAS)[number];

export function isEscuela(value: string): value is Escuela {
  return (ESCUELAS as readonly string[]).includes(value);
}

/** Normaliza el valor de escuela desde formulario o CSV. Cadena vacía → null. */
export function parseEscuelaInput(raw: string | null | undefined): string | null {
  const trimmed = String(raw ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}
