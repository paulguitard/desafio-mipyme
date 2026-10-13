export function textoIntencionEvaluador(intencion: string | null | undefined) {
  if (intencion === "FINALIZAR") return "El evaluador pidió finalizar la evaluación.";
  if (intencion === "OBSERVACIONES") return "El evaluador pidió cambios al participante.";
  return "El evaluador envió esta evaluación.";
}

export function textoResultadoCorreo(
  resultado: "observaciones" | "finalizacion" | "OBSERVACIONES" | "FINALIZAR",
) {
  if (resultado === "finalizacion" || resultado === "FINALIZAR") {
    return "el caso quedó finalizado y aprobado";
  }
  return "se pidieron cambios al participante";
}

export function textoResultadoParaSupervisor(intencion: string | null | undefined) {
  if (intencion === "FINALIZAR") return "pidió finalizar la evaluación";
  return "pidió cambios al participante";
}
