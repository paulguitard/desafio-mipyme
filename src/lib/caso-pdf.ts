import type { DetalleFichaAdmin } from "@/lib/convocatoria-admin-data";
import { etiquetaNombreCaso } from "@/lib/nombre-caso";
import {
  descargarBytesPdf,
  inyectarNewWindowEnAnotacionesUri,
  urlAbridorEnlacePdf,
} from "@/lib/pdf-enlace-externo";

/** Ancho del documento = Letter a 96dpi (sin márgenes). */
export const CASO_PDF_DOC_WIDTH = 816;

export const LETTER_W_MM = 215.9;
export const LETTER_H_MM = 279.4;
const MAX_CANVAS_EDGE = 16384;
const JPEG_QUALITY = 0.94;
/** Mínimo de contenido en una página antes de adelantar un corte. */
const MIN_AVANCE_PX = 48;
/** Altura máxima de una "fila" de texto; por encima se ignora (párrafo/tarjeta). */
const MAX_LINEA_PX = 56;

export function slugArchivoPdf(texto: string) {
  return (
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "caso"
  );
}

export function nombreArchivoCasoPdf(data: Pick<DetalleFichaAdmin, "nombreCaso" | "emprendedorNombre">) {
  const caso = slugArchivoPdf(etiquetaNombreCaso(data.nombreCaso));
  const persona = slugArchivoPdf(data.emprendedorNombre);
  return `${caso}-${persona}.pdf`;
}

function escalaSegura(scrollHeight: number, preferida = 2) {
  const altoEstimado = Math.ceil(scrollHeight * preferida);
  if (altoEstimado <= MAX_CANVAS_EDGE) return preferida;
  return Math.max(1, Math.floor((MAX_CANVAS_EDGE / Math.max(1, scrollHeight)) * 100) / 100);
}

export type FranjaLinea = { top: number; bottom: number };

export type PdfLinkHotspot = {
  url: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
};

function blobComoDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(blob);
  });
}

/** Evita re-fetch CORS/302 de Cloudinary al capturar el DOM. */
export async function incrustarImagenesComoDataUrl(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.currentSrc || img.getAttribute("src") || "";
      if (!src || src.startsWith("data:")) return;
      try {
        const absolute = /^https?:\/\//i.test(src) ? src : new URL(src, window.location.origin).href;
        const mismaOrigen = new URL(absolute).origin === window.location.origin;
        const res = await fetch(absolute, { credentials: mismaOrigen ? "include" : "omit" });
        if (!res.ok) return;
        const blob = await res.blob();
        if (!blob.type.startsWith("image/")) return;
        const dataUrl = await blobComoDataUrl(blob);
        if (!dataUrl.startsWith("data:image/")) return;
        img.src = dataUrl;
        if (!img.complete) {
          await new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          });
        }
      } catch {
        /* la captura usará el src original o el placeholder */
      }
    }),
  );
}

async function fetchImagenParaCaptura(url: string): Promise<string | false> {
  try {
    const absolute = /^https?:\/\//i.test(url) ? url : new URL(url, window.location.origin).href;
    const mismaOrigen = new URL(absolute).origin === window.location.origin;
    const res = await fetch(absolute, { credentials: mismaOrigen ? "include" : "omit" });
    if (!res.ok) return false;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return false;
    const dataUrl = await blobComoDataUrl(blob);
    return dataUrl.startsWith("data:image/") ? dataUrl : false;
  } catch {
    return false;
  }
}

export function absolutizarUrlPdf(url: string, origen: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = origen.replace(/\/$/, "");
  if (trimmed.startsWith("/")) return `${base}${trimmed}`;
  return trimmed;
}

function toLocalRect(root: HTMLElement, rootRect: DOMRect, rect: DOMRect) {
  return {
    top: rect.top - rootRect.top + root.scrollTop,
    bottom: rect.bottom - rootRect.top + root.scrollTop,
    left: rect.left - rootRect.left + root.scrollLeft,
    right: rect.right - rootRect.left + root.scrollLeft,
  };
}

/** Miniaturas/bloques que no deben partirse entre páginas. */
export function collectBloquesPdf(root: HTMLElement): FranjaLinea[] {
  const rootRect = root.getBoundingClientRect();
  const bloques: FranjaLinea[] = [];
  const seen = new Set<string>();

  root.querySelectorAll<HTMLElement>("[data-pdf-bloque]").forEach((el) => {
    const local = toLocalRect(root, rootRect, el.getBoundingClientRect());
    const h = local.bottom - local.top;
    if (h < 4) return;
    const key = `${Math.round(local.top)}:${Math.round(local.bottom)}`;
    if (seen.has(key)) return;
    seen.add(key);
    bloques.push({ top: local.top, bottom: local.bottom });
  });

  return bloques.sort((a, b) => a.top - b.top || a.bottom - b.bottom);
}

/** Solo filas de texto (getClientRects), no bloques enteros de respuesta. */
export function collectLineasTexto(root: HTMLElement): FranjaLinea[] {
  const rootRect = root.getBoundingClientRect();
  const lineas: FranjaLinea[] = [];
  const seen = new Set<string>();

  const pushLinea = (top: number, bottom: number) => {
    const h = bottom - top;
    if (h < 4 || h > MAX_LINEA_PX) return;
    const key = `${Math.round(top)}:${Math.round(bottom)}`;
    if (seen.has(key)) return;
    seen.add(key);
    lineas.push({ top, bottom });
  };

  root
    .querySelectorAll(
      [
        ".caso-pdf-documento p",
        ".caso-pdf-documento li",
        ".caso-pdf-documento h3",
        ".caso-pdf-documento h4",
        ".caso-pdf-documento h5",
        ".texto-solo-lectura",
        ".rte-content",
        ".pregunta-lectura-enunciado",
      ].join(", "),
    )
    .forEach((el) => {
      try {
        const range = document.createRange();
        range.selectNodeContents(el);
        for (const rect of Array.from(range.getClientRects())) {
          if (rect.width < 2) continue;
          const local = toLocalRect(root, rootRect, rect);
          pushLinea(local.top, local.bottom);
        }
      } catch {
        /* ignore */
      }
    });

  return lineas.sort((a, b) => a.top - b.top || a.bottom - b.bottom);
}

export function collectPdfLinkHotspots(root: HTMLElement, origen: string): PdfLinkHotspot[] {
  const rootRect = root.getBoundingClientRect();
  const hotspots: PdfLinkHotspot[] = [];

  root.querySelectorAll<HTMLElement>("[data-pdf-link]").forEach((el) => {
    const raw = el.getAttribute("data-pdf-link") ?? "";
    const url = absolutizarUrlPdf(raw, origen);
    if (!url) return;
    const local = toLocalRect(root, rootRect, el.getBoundingClientRect());
    if (local.bottom - local.top < 2 || local.right - local.left < 2) return;
    hotspots.push({
      url,
      top: local.top,
      bottom: local.bottom,
      left: local.left,
      right: local.right,
    });
  });

  return hotspots;
}

/**
 * Si el corte ideal parte una fila de texto o una miniatura, sube el corte al inicio
 * de ESA franja (solo esa franja pasa a la página siguiente).
 */
export function ajustarCorteSinPartirTexto(
  y: number,
  target: number,
  total: number,
  lineas: FranjaLinea[],
): number {
  if (target >= total) return total;

  const lineaCortada = lineas.find((f) => target > f.top + 0.5 && target < f.bottom - 0.5);
  if (!lineaCortada) return Math.min(target, total);

  // Mover solo esa fila/miniatura a la página siguiente.
  if (lineaCortada.top > y + MIN_AVANCE_PX) {
    return lineaCortada.top;
  }

  // La franja empezó al inicio de la página: cerrar en la última franja completa antes del target.
  const finesCompletos = lineas
    .filter((f) => f.bottom > y + 8 && f.bottom <= target + 0.5)
    .map((f) => f.bottom);
  if (finesCompletos.length > 0) {
    return Math.max(...finesCompletos);
  }

  // Incluir completa la franja corta anclada arriba.
  return Math.min(lineaCortada.bottom, total);
}

export function calcularCortesLetter(root: HTMLElement, pageHeightPx: number): { y: number; height: number }[] {
  const total = Math.max(root.scrollHeight, 1);
  const lineas = [...collectLineasTexto(root), ...collectBloquesPdf(root)].sort(
    (a, b) => a.top - b.top || a.bottom - b.bottom,
  );
  const cortes: { y: number; height: number }[] = [];
  let y = 0;

  while (y < total - 0.5) {
    const target = y + pageHeightPx;
    if (target >= total) {
      cortes.push({ y, height: total - y });
      break;
    }

    const cutAt = ajustarCorteSinPartirTexto(y, target, total, lineas);
    const height = Math.max(1, Math.min(cutAt, total) - y);
    cortes.push({ y, height });
    y += height;

    if (height < 1) break;
  }

  return cortes;
}

/** Mapea un hotspot DOM al rectángulo en mm dentro de una página Letter. */
export function rectHotspotEnPaginaMm(
  hotspot: PdfLinkHotspot,
  corte: { y: number; height: number },
  docWidthPx: number = CASO_PDF_DOC_WIDTH,
): { x: number; y: number; w: number; h: number } | null {
  const top = Math.max(hotspot.top, corte.y);
  const bottom = Math.min(hotspot.bottom, corte.y + corte.height);
  const left = Math.max(0, hotspot.left);
  const right = Math.min(docWidthPx, hotspot.right);
  if (bottom - top < 2 || right - left < 2) return null;

  const pageHeightDom = (LETTER_H_MM / LETTER_W_MM) * docWidthPx;
  const pxToMmX = LETTER_W_MM / docWidthPx;
  const yDom = top - corte.y;
  const hDom = bottom - top;

  return {
    x: left * pxToMmX,
    y: (yDom / pageHeightDom) * LETTER_H_MM,
    w: (right - left) * pxToMmX,
    h: (hDom / pageHeightDom) * LETTER_H_MM,
  };
}

function agregarPaginasLetter(
  pdf: InstanceType<typeof import("jspdf").jsPDF>,
  canvas: HTMLCanvasElement,
  cortesDom: { y: number; height: number }[],
  scaleY: number,
  hotspots: PdfLinkHotspot[],
  docWidthPx: number,
  origen: string,
) {
  const pageCanvasH = Math.max(1, Math.round((LETTER_H_MM / LETTER_W_MM) * canvas.width));

  cortesDom.forEach((corte, index) => {
    if (index > 0) pdf.addPage([LETTER_W_MM, LETTER_H_MM], "portrait");

    // Misma conversión en ambos extremos para evitar desfaces de 1px (letras a la mitad).
    const y0 = Math.round(corte.y * scaleY);
    const y1 = Math.round((corte.y + corte.height) * scaleY);
    const sliceH = Math.max(1, Math.min(y1, canvas.height) - y0);

    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = pageCanvasH;
    const ctx = slice.getContext("2d");
    if (!ctx) throw new Error("No se pudo preparar la página del PDF.");
    ctx.fillStyle = "#f4f6fa";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, y0, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

    const imgData = slice.toDataURL("image/jpeg", JPEG_QUALITY);
    pdf.addImage(imgData, "JPEG", 0, 0, LETTER_W_MM, LETTER_H_MM, undefined, "FAST");

    for (const hotspot of hotspots) {
      const rect = rectHotspotEnPaginaMm(hotspot, corte, docWidthPx);
      if (!rect) continue;
      pdf.link(rect.x, rect.y, rect.w, rect.h, { url: urlAbridorEnlacePdf(hotspot.url, origen) });
    }
  });
}

export async function generarYDescargarCasoPdf(root: HTMLElement, data: DetalleFichaAdmin) {
  const [{ domToCanvas }, { jsPDF }] = await Promise.all([
    import("modern-screenshot"),
    import("jspdf"),
  ]);

  const scrollHeight = Math.max(root.scrollHeight, root.offsetHeight, 1);
  const scale = escalaSegura(scrollHeight);
  const pageHeightDom = (LETTER_H_MM / LETTER_W_MM) * CASO_PDF_DOC_WIDTH;
  const origen = typeof window !== "undefined" ? window.location.origin : "";
  const hotspots = collectPdfLinkHotspots(root, origen);
  await incrustarImagenesComoDataUrl(root);

  const canvas = await domToCanvas(root, {
    width: CASO_PDF_DOC_WIDTH,
    height: scrollHeight,
    scale,
    backgroundColor: "#f4f6fa",
    fetchFn: fetchImagenParaCaptura,
    fetch: {
      requestInit: { credentials: "include" },
    },
    style: {
      opacity: "1",
      transform: "none",
      left: "0",
      top: "0",
      position: "static",
      width: `${CASO_PDF_DOC_WIDTH}px`,
      fontFamily: getComputedStyle(document.body).fontFamily,
    },
  });

  if (canvas.width < 1 || canvas.height < 1) {
    throw new Error("La captura del caso quedó vacía.");
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [LETTER_W_MM, LETTER_H_MM],
    compress: true,
  });

  const cortes = calcularCortesLetter(root, pageHeightDom);
  const scaleY = canvas.height / scrollHeight;
  agregarPaginasLetter(pdf, canvas, cortes, scaleY, hotspots, CASO_PDF_DOC_WIDTH, origen);
  const bytes = inyectarNewWindowEnAnotacionesUri(new Uint8Array(pdf.output("arraybuffer")));
  descargarBytesPdf(bytes, nombreArchivoCasoPdf(data));
}
