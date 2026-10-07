export const MENSAJE_SELECCION_VEREDICTO =
  "Tienes que seleccionar alguna de las opciones.";

export const MENSAJE_COMENTARIO_VEREDICTO =
  "Si comentas observaciones, debes incluir un comentario.";

export type CampoVeredicto = {
  veredicto: string;
  comentario: string;
};

export function mensajeVeredictosIncompletos(campos: CampoVeredicto[]): string | null {
  const faltaSeleccion = campos.some(
    (campo) => campo.veredicto !== "OK" && campo.veredicto !== "OBSERVACION",
  );
  const faltaComentario = campos.some(
    (campo) => campo.veredicto === "OBSERVACION" && campo.comentario.trim() === "",
  );
  const partes: string[] = [];
  if (faltaSeleccion) partes.push(MENSAJE_SELECCION_VEREDICTO);
  if (faltaComentario) partes.push(MENSAJE_COMENTARIO_VEREDICTO);
  return partes.length > 0 ? partes.join(" ") : null;
}

export function campoVeredictoIncompleto(campo: CampoVeredicto): "seleccion" | "comentario" | null {
  if (campo.veredicto !== "OK" && campo.veredicto !== "OBSERVACION") return "seleccion";
  if (campo.veredicto === "OBSERVACION" && campo.comentario.trim() === "") return "comentario";
  return null;
}
