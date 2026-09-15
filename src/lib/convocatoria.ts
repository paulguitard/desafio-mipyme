import type { StoredFile } from "@/lib/preguntas";

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

export function toDatetimeLocalValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseFechaForm(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatoFechaCorta(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-CL", {
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

const TZ_CHILE = "America/Santiago";

function fechaCalendarioChile(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: TZ_CHILE });
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
