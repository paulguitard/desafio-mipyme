import type { StoredFile } from "@/lib/preguntas";

export type PosicionImagen = { x: number; y: number };

const POSICION_CENTRO: PosicionImagen = { x: 50, y: 50 };

export function clampPorcentaje(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.min(100, Math.max(0, n));
}

export function parseImagenConvocatoria(raw: string): StoredFile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const file = parsed as StoredFile;
    if (!file.relativePath && !file.url) return null;
    return file;
  } catch {
    return null;
  }
}

export function parseImagenPosicion(raw: string): PosicionImagen {
  if (!raw) return POSICION_CENTRO;
  try {
    const parsed = JSON.parse(raw) as { posX?: unknown; posY?: unknown };
    if (!parsed || typeof parsed !== "object") return POSICION_CENTRO;
    return { x: clampPorcentaje(parsed.posX), y: clampPorcentaje(parsed.posY) };
  } catch {
    return POSICION_CENTRO;
  }
}

export function aplicarPosicionImagen(json: string, pos: PosicionImagen): string {
  if (!json) return json;
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return json;
    return JSON.stringify({
      ...parsed,
      posX: clampPorcentaje(pos.x),
      posY: clampPorcentaje(pos.y),
    });
  } catch {
    return json;
  }
}

export function objectPositionCss(pos: PosicionImagen): string {
  return `${pos.x}% ${pos.y}%`;
}

export const TZ_CHILE = "America/Santiago";

type PartesFecha = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function partesEnZona(date: Date, timeZone: string): PartesFecha {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function offsetMsEnZona(date: Date, timeZone: string): number {
  const p = partesEnZona(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - date.getTime();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Interpreta `YYYY-MM-DDTHH:mm` como hora civil de Chile, no como TZ del servidor ni del navegador. */
export function parseFechaForm(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) {
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? 0);
  const utcNaive = Date.UTC(year, month - 1, day, hour, minute, second);
  let instant = utcNaive - offsetMsEnZona(new Date(utcNaive), TZ_CHILE);
  instant = utcNaive - offsetMsEnZona(new Date(instant), TZ_CHILE);
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDatetimeLocalValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const p = partesEnZona(d, TZ_CHILE);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`;
}

export function formatoFechaCorta(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-CL", {
    timeZone: TZ_CHILE,
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatoRangoFechas(
  inicio: Date | string | null | undefined,
  cierre: Date | string | null | undefined,
): string {
  const desde = formatoFechaCorta(inicio);
  const hasta = formatoFechaCorta(cierre);
  if (desde && hasta) return `${desde} – ${hasta}`;
  if (desde) return `Desde ${desde}`;
  if (hasta) return `Hasta ${hasta}`;
  return "";
}

function fechaCalendarioChile(date: Date): string {
  const p = partesEnZona(date, TZ_CHILE);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

export function etiquetaCierreAbierto(cierre: Date | string | null | undefined): string {
  const hasta = formatoFechaCorta(cierre);
  if (!hasta) return "";
  return `Abierta hasta el ${hasta}`;
}

export function diasRestantesHasta(
  cierre: Date | string | null | undefined,
  now = new Date(),
): number | null {
  if (!cierre) return null;
  const hasta = typeof cierre === "string" ? new Date(cierre) : cierre;
  if (Number.isNaN(hasta.getTime())) return null;
  const [cy, cm, cd] = fechaCalendarioChile(hasta).split("-").map(Number);
  const [ny, nm, nd] = fechaCalendarioChile(now).split("-").map(Number);
  const cierreUtc = Date.UTC(cy, cm - 1, cd);
  const ahoraUtc = Date.UTC(ny, nm - 1, nd);
  return Math.max(0, Math.round((cierreUtc - ahoraUtc) / 86_400_000));
}

export function etiquetaDiasRestantes(dias: number | null): string {
  if (dias === null) return "";
  if (dias <= 0) return "Cierra hoy";
  if (dias === 1) return "Queda 1 día";
  return `Quedan ${dias} días`;
}

export function convocatoriaAbiertaParaPostular(
  convocatoria: {
    estado: string;
    fechaInicio?: Date | string | null;
    fechaCierre?: Date | string | null;
  },
  now = new Date(),
): boolean {
  if (convocatoria.estado !== "ABIERTA") return false;
  const inicio = convocatoria.fechaInicio ? new Date(convocatoria.fechaInicio) : null;
  const cierre = convocatoria.fechaCierre ? new Date(convocatoria.fechaCierre) : null;
  if (inicio && !Number.isNaN(inicio.getTime()) && now < inicio) return false;
  if (cierre && !Number.isNaN(cierre.getTime()) && now > cierre) return false;
  return true;
}

/** Reel y casos nuevos. No afecta casos ya iniciados. */
export function convocatoriaDisponibleParaNuevosCasos(
  convocatoria: {
    estado: string;
    visible?: boolean;
    fechaInicio?: Date | string | null;
    fechaCierre?: Date | string | null;
  },
  now = new Date(),
): boolean {
  if (convocatoria.visible === false) return false;
  return convocatoriaAbiertaParaPostular(convocatoria, now);
}
