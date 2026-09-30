function recorteNombre(nombre: string | null | undefined) {
  return (nombre ?? "").slice(0, 14);
}

export function FichaCasoMeta({
  participante,
  evaluador,
}: {
  participante: string | null | undefined;
  evaluador: string | null | undefined;
}) {
  const nombreParticipante = participante ?? "";
  const nombreEvaluador = evaluador ?? "";

  return (
    <div className="ficha-caso-meta">
      <p title={nombreParticipante}>Particip.: {recorteNombre(nombreParticipante)}</p>
      <p title={nombreEvaluador}>Evaluador: {recorteNombre(nombreEvaluador)}</p>
    </div>
  );
}
