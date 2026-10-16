import { resolveVideoEmbed } from "@/lib/preguntas";

export function parseDestinoAdjuntoPdf(raw: string, origen: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  let base: URL;
  try {
    url = new URL(trimmed);
    base = new URL(origen);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.origin === base.origin && url.pathname.startsWith("/api/archivos/")) {
    return url.href;
  }
  if (resolveVideoEmbed(url.href)) return url.href;
  return null;
}

export function urlAbridorEnlacePdf(dest: string, origen: string) {
  const base = origen.replace(/\/$/, "");
  return `${base}/abrir-enlace?to=${encodeURIComponent(dest)}`;
}

export function inyectarNewWindowEnAnotacionesUri(bytes: Uint8Array): Uint8Array {
  const needle = "/S /URI /URI (";
  const replacement = "/S /URI /NewWindow true /URI (";
  let text = "";
  for (let i = 0; i < bytes.length; i += 1) text += String.fromCharCode(bytes[i]);
  if (!text.includes(needle)) return bytes;
  const next = text.replaceAll(needle, replacement);
  const out = new Uint8Array(next.length);
  for (let i = 0; i < next.length; i += 1) out[i] = next.charCodeAt(i) & 0xff;
  return out;
}

/** Script inline: abre el adjunto en otra pestaña y vuelve al PDF (Chrome navega esta pestaña). */
export function scriptAperturaAdjuntoPdf(dest: string) {
  return `(function(){
  var dest = ${JSON.stringify(dest)};
  var key = "pdf-abrir:" + dest;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    setTimeout(function () { sessionStorage.removeItem(key); }, 2000);
  } catch (e) {}
  var w = window.open(dest, "_blank");
  if (w) {
    w.opener = null;
    if (window.history.length > 1) window.history.back();
    else window.close();
  }
})();`;
}

export function descargarBytesPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}
