function recorteNombre(nombre: string | null | undefined) {
  return (nombre ?? "").slice(0, 14);
}

export function FichaCasoMeta({
  participante,
  evaluador,
  mostrarEvaluador = true,
}: {
  participante: string | null | undefined;
  evaluador?: string | null;
  mostrarEvaluador?: boolean;
}) {
  const nombreParticipante = participante ?? "";
  const nombreEvaluador = evaluador ?? "";

  return (
    <div className="ficha-caso-meta">
      <p title={nombreParticipante}>Particip.: {recorteNombre(nombreParticipante)}</p>
      {mostrarEvaluador ? (
        <p title={nombreEvaluador}>Evaluador: {recorteNombre(nombreEvaluador)}</p>
      ) : null}
    </div>
  );
}
