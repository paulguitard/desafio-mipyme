import { esHtmlVacio } from "@/lib/preguntas";

export const MENSAJE_SELECCION_VEREDICTO =
  "Tienes que seleccionar alguna de las opciones.";

export const MENSAJE_COMENTARIO_VEREDICTO = "Debes incluir un comentario.";

export type CampoVeredicto = {
  veredicto: string;
  comentario: string;
};

export type OpcionesVeredictoIncompleto = {
  exigirSeleccion?: boolean;
  exigirComentarioSiempre?: boolean;
};

export function mensajeVeredictosIncompletos(
  campos: CampoVeredicto[],
  opciones?: OpcionesVeredictoIncompleto,
): string | null {
  const faltaSeleccion =
    (opciones?.exigirSeleccion ?? true) &&
    campos.some((campo) => campo.veredicto !== "OK" && campo.veredicto !== "OBSERVACION");
  const faltaComentario = campos.some((campo) => {
    if (opciones?.exigirComentarioSiempre) return esHtmlVacio(campo.comentario);
    return campo.veredicto === "OBSERVACION" && esHtmlVacio(campo.comentario);
  });
  const partes: string[] = [];
  if (faltaSeleccion) partes.push(MENSAJE_SELECCION_VEREDICTO);
  if (faltaComentario) partes.push(MENSAJE_COMENTARIO_VEREDICTO);
  return partes.length > 0 ? partes.join(" ") : null;
}

export function campoVeredictoIncompleto(
  campo: CampoVeredicto,
  opciones?: OpcionesVeredictoIncompleto,
): "seleccion" | "comentario" | null {
  if (
    (opciones?.exigirSeleccion ?? true) &&
    campo.veredicto !== "OK" &&
    campo.veredicto !== "OBSERVACION"
  ) {
    return "seleccion";
  }
  if (opciones?.exigirComentarioSiempre || campo.veredicto === "OBSERVACION") {
    if (esHtmlVacio(campo.comentario)) return "comentario";
  }
  return null;
}
