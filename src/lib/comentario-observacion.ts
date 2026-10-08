import { sanitizeComentarioRichText } from "@/lib/html";
import { esHtmlVacio, pareceHtml } from "@/lib/preguntas";

function escapeHtml(valor: string) {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Convierte un comentario plano (con Enter) a HTML de párrafos, sin interpretar tags. */
export function htmlDesdeTextoPlano(valor: string): string {
  const texto = valor.replace(/\r\n/g, "\n");
  if (!texto.trim()) return "";
  return texto
    .split(/\n{2,}/)
    .map((bloque) => `<p>${escapeHtml(bloque).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** HTML para mostrar o editar un comentario guardado (nuevo con formato o legado plano). */
export function htmlParaVistaComentario(valor: string): string {
  if (!valor.trim()) return "";
  if (pareceHtml(valor)) return valor;
  return htmlDesdeTextoPlano(valor);
}

/** Sanitiza el HTML del comentario (N/C/S y viñetas). Vacío queda en string vacío. */
export function sanitizarComentarioObservacion(html: string): string {
  const limpio = sanitizeComentarioRichText(html);
  return esHtmlVacio(limpio) ? "" : limpio;
}
