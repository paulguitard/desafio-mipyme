"use client";

export function irAPreguntaCaso(preguntaId: string) {
  document.getElementById(`pregunta-caso-${preguntaId}`)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function ResumenCambiosReenvio({
  preguntas,
}: {
  preguntas: { id: string; enunciado: string }[];
}) {
  if (preguntas.length === 0) return null;
  const cantidad = preguntas.length === 1 ? "1 pregunta" : `${preguntas.length} preguntas`;

  return (
    <nav className="cambios-reenvio" aria-label="Preguntas modificadas en el último envío">
      <span>Modificó {cantidad}</span>
      {preguntas.map((pregunta) => (
        <button
          key={pregunta.id}
          type="button"
          className="cambios-reenvio-enlace"
          title={pregunta.enunciado}
          onClick={() => irAPreguntaCaso(pregunta.id)}
        >
          {pregunta.enunciado}
        </button>
      ))}
    </nav>
  );
}
