/** Junta espacios/saltos y parte bloques muy largos para que el texto llene el renglón. */
export function textoContinuo(valor: string) {
  return valor
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\S{14,}/g, (bloque) => bloque.match(/.{1,12}/g)?.join("\u200B") ?? bloque);
}
