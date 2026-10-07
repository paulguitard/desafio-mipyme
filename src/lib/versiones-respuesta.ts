/**
 * El editor vuelve a emitir el mismo texto sin el `<span>` vacío que dejó
 * un pegado o un tamaño de letra que no se guarda. Eso no es una versión nueva.
 */

function textoDeValor(raw: string): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "string") return parsed;
  } catch {
    /* valor legado, sin JSON */
  }
  return raw;
}

/** Quita spans sin clase ni estilo y unifica `<br>`. */
export function htmlSinMarcasVacias(html: string): string {
  let actual = html.replace(/<br\s*\/?>/gi, "<br>");
  let previo = "";
  while (actual !== previo) {
    previo = actual;
    actual = actual.replace(/<span(?:\s+class="")?\s*>([\s\S]*?)<\/span>/gi, "$1");
  }
  return actual;
}

export function valoresRespuestaEquivalentes(tipo: string, valorA: string, valorB: string): boolean {
  if (valorA === valorB) return true;
  if (tipo !== "texto_largo") return false;
  return htmlSinMarcasVacias(textoDeValor(valorA)) === htmlSinMarcasVacias(textoDeValor(valorB));
}

export function respuestasEquivalentes(args: {
  tipo: string;
  valorA: string;
  archivosA: string;
  valorB: string;
  archivosB: string;
}): boolean {
  if (args.archivosA !== args.archivosB) return false;
  return valoresRespuestaEquivalentes(args.tipo, args.valorA, args.valorB);
}

export function versionesDistintas<T extends { valor: string; archivos: string }>(
  versiones: T[],
  tipo: string,
): T[] {
  if (versiones.length <= 1) return versiones;
  const kept: T[] = [];
  for (const version of [...versiones].reverse()) {
    const previa = kept[kept.length - 1];
    if (
      previa &&
      respuestasEquivalentes({
        tipo,
        valorA: previa.valor,
        archivosA: previa.archivos,
        valorB: version.valor,
        archivosB: version.archivos,
      })
    ) {
      continue;
    }
    kept.push(version);
  }
  return kept.reverse();
}
