"use client";

import { useState } from "react";
import type { PeldanoEscala } from "@/lib/preguntas";

export function PanelEvaluacionPregunta({
  preguntaId,
  canEdit,
  ronda,
  veredictoInicial,
  comentarioInicial,
  notaInicial,
  escala,
  historial,
}: {
  preguntaId: string;
  canEdit: boolean;
  ronda: number;
  veredictoInicial?: string;
  comentarioInicial?: string;
  notaInicial?: number | null;
  escala: PeldanoEscala[];
  historial: { id: string; ronda: number; veredicto: string; comentario: string; nota: number | null }[];
}) {
  const [veredicto, setVeredicto] = useState(veredictoInicial ?? "");
  const [nota, setNota] = useState<number | null>(notaInicial ?? null);
  const [comentario, setComentario] = useState(comentarioInicial ?? "");

  return (
    <div className="card space-y-3 p-4">
      <input type="hidden" name={`veredicto-${preguntaId}`} value={veredicto} />
      {escala.length > 0 ? (
        <input type="hidden" name={`nota-${preguntaId}`} value={nota ?? ""} />
      ) : null}

      {canEdit ? (
        <>
          <p className="font-semibold">Tu evaluación (ronda {ronda})</p>
          <div className="flex flex-wrap gap-2">
            <button
              className={`btn btn-sm ${veredicto === "OBSERVACION" ? "btn-primary" : "btn-secondary"}`}
              type="button"
              onClick={() => setVeredicto("OBSERVACION")}
            >
              Comentar observaciones
            </button>
            <button
              className={`btn btn-sm ${veredicto === "OK" ? "btn-primary" : "btn-secondary"}`}
              type="button"
              onClick={() => setVeredicto("OK")}
            >
              Sin observaciones
            </button>
          </div>
          {escala.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Nota</p>
              <div className="flex flex-wrap gap-2">
                {escala.map((item) => {
                  const activo = nota === item.valor;
                  return (
                    <button
                      key={item.valor}
                      className={`btn btn-sm ${activo ? "btn-navy" : "btn-ghost"}`}
                      type="button"
                      onClick={() => setNota(item.valor)}
                    >
                      {item.valor}
                      {item.etiqueta ? ` · ${item.etiqueta}` : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {veredicto === "OBSERVACION" ? (
            <div className="field">
              <label htmlFor={`comentario-${preguntaId}`}>Comentario (obligatorio)</label>
              <textarea
                className="input"
                id={`comentario-${preguntaId}`}
                name={`comentario-${preguntaId}`}
                value={comentario}
                onChange={(event) => setComentario(event.target.value)}
              />
            </div>
          ) : (
            <input type="hidden" name={`comentario-${preguntaId}`} value={comentario} />
          )}
        </>
      ) : (
        <div className="space-y-2">
          <p className="font-semibold">Evaluación (ronda {ronda})</p>
          <p>
            {veredictoInicial === "OK"
              ? "Sin observaciones"
              : veredictoInicial === "OBSERVACION"
                ? "Con observaciones"
                : "Sin veredicto"}
          </p>
          {escala.length > 0 && notaInicial != null ? (
            <p>
              Nota: {notaInicial}
              {escala.find((item) => item.valor === notaInicial)?.etiqueta
                ? ` · ${escala.find((item) => item.valor === notaInicial)?.etiqueta}`
                : ""}
            </p>
          ) : null}
          {comentarioInicial ? <p>{comentarioInicial}</p> : null}
        </div>
      )}

      {historial.length > 0 ? (
        <div className="rounded-xl border border-border bg-white p-3">
          <h3 className="font-semibold">Observaciones anteriores de esta evaluación</h3>
          <ul className="mt-2 space-y-2">
            {historial.map((item) => (
              <li key={item.id}>
                Ronda {item.ronda}: {item.veredicto === "OK" ? "Sin observaciones" : "Con observaciones"}
                {item.nota != null ? ` · Nota ${item.nota}` : ""}
                {item.comentario ? ` — ${item.comentario}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
