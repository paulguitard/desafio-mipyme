import type { DetalleFichaAdmin } from "@/lib/convocatoria-admin-data";
import { etiquetaNombreCaso } from "@/lib/nombre-caso";

/** Ancho del documento = Letter a 96dpi (sin márgenes). */
export const CASO_PDF_DOC_WIDTH = 816;

const LETTER_W_MM = 215.9;
const LETTER_H_MM = 279.4;
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

/** Solo filas de texto (getClientRects), no bloques enteros de respuesta. */
export function collectLineasTexto(root: HTMLElement): FranjaLinea[] {
  const rootRect = root.getBoundingClientRect();
  const lineas: FranjaLinea[] = [];
  const seen = new Set<string>();

  const toLocal = (rect: DOMRect) => ({
    top: rect.top - rootRect.top + root.scrollTop,
    bottom: rect.bottom - rootRect.top + root.scrollTop,
  });

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
      ".caso-pdf-documento p, .caso-pdf-documento li, .caso-pdf-documento h3, .texto-solo-lectura, .rte-content, .pregunta-lectura-enunciado",
    )
    .forEach((el) => {
      try {
        const range = document.createRange();
        range.selectNodeContents(el);
        for (const rect of Array.from(range.getClientRects())) {
          if (rect.width < 2) continue;
          const local = toLocal(rect);
          pushLinea(local.top, local.bottom);
        }
      } catch {
        /* ignore */
      }
    });

  return lineas.sort((a, b) => a.top - b.top || a.bottom - b.bottom);
}

/**
 * Si el corte ideal parte una fila de texto, sube el corte al inicio de ESA fila
 * (solo esa línea pasa a la página siguiente; el resto de la respuesta se queda).
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

  // Mover solo esa fila a la página siguiente.
  if (lineaCortada.top > y + MIN_AVANCE_PX) {
    return lineaCortada.top;
  }

  // La fila empezó al inicio de la página: cerrar en la última fila completa antes del target.
  const finesCompletos = lineas
    .filter((f) => f.bottom > y + 8 && f.bottom <= target + 0.5)
    .map((f) => f.bottom);
  if (finesCompletos.length > 0) {
    return Math.max(...finesCompletos);
  }

  // Incluir completa la fila corta anclada arriba.
  return Math.min(lineaCortada.bottom, total);
}

export function calcularCortesLetter(root: HTMLElement, pageHeightPx: number): { y: number; height: number }[] {
  const total = Math.max(root.scrollHeight, 1);
  const lineas = collectLineasTexto(root);
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

function agregarPaginasLetter(
  pdf: InstanceType<typeof import("jspdf").jsPDF>,
  canvas: HTMLCanvasElement,
  cortesDom: { y: number; height: number }[],
  scaleY: number,
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

  const canvas = await domToCanvas(root, {
    width: CASO_PDF_DOC_WIDTH,
    height: scrollHeight,
    scale,
    backgroundColor: "#f4f6fa",
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
  agregarPaginasLetter(pdf, canvas, cortes, scaleY);
  pdf.save(nombreArchivoCasoPdf(data));
}
