export const TOKEN_PUBLICO_BYTES = 24;

export function esTokenPublicoValido(token: string) {
  return /^[A-Za-z0-9_-]{20,64}$/.test(token);
}

export function generarTokenPublico() {
  const bytes = new Uint8Array(TOKEN_PUBLICO_BYTES);
  crypto.getRandomValues(bytes);
  let binario = "";
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function rutaFichaPublica(token: string) {
  return `/ficha/${token}`;
}

export function withFichaToken(url: string, token: string | null | undefined) {
  if (!token || !esTokenPublicoValido(token)) return url;
  if (!url.startsWith("/api/archivos/")) return url;
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}ficha=${encodeURIComponent(token)}`;
}
