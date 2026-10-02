import {
  isStoredFile,
  isStoredVideoLink,
  type StoredAttachment,
  type StoredFile,
  type StoredVideoLink,
} from "@/lib/preguntas";

export const CLASES_MEDIO = ["imagen", "video", "archivo"] as const;
export type ClaseMedioContenido = (typeof CLASES_MEDIO)[number];

export function parseClaseMedio(raw?: string | null): ClaseMedioContenido | null {
  if (raw === "imagen" || raw === "video" || raw === "archivo") return raw;
  return null;
}

export function parseMedioPayload(raw: string): StoredAttachment | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const item = parsed as StoredAttachment;
    if (isStoredFile(item) || isStoredVideoLink(item)) return item;
    return null;
  } catch {
    return null;
  }
}

export function serializeMedioPayload(item: StoredAttachment): string {
  return JSON.stringify(item);
}

export type MedioContenidoVista = {
  id: string;
  orden: number;
  clase: ClaseMedioContenido;
  attachment: StoredAttachment;
};

export type PiezaContenidoVista = {
  id: string;
  orden: number;
  titulo: string;
  descripcion?: string;
  medios: MedioContenidoVista[];
  marcada?: boolean;
};

export function medioDesdeFila(medio: {
  id: string;
  orden: number;
  clase: string;
  payload: string;
}): MedioContenidoVista | null {
  const clase = parseClaseMedio(medio.clase);
  const attachment = parseMedioPayload(medio.payload);
  if (!clase || !attachment) return null;
  return { id: medio.id, orden: medio.orden, clase, attachment };
}

export function porcentajeVistoContenido(vistas: number, totalCasillas: number) {
  if (totalCasillas <= 0) return 0;
  return Math.min(100, Math.round((Math.max(0, vistas) / totalCasillas) * 100));
}

export function etiquetaAvanceContenido(vistas: number, totalCasillas: number) {
  return `${porcentajeVistoContenido(vistas, totalCasillas)}% visto`;
}
