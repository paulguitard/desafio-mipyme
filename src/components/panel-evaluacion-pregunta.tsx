"use client";

import { useState } from "react";
import type { PeldanoEscala } from "@/lib/preguntas";

type ItemHistorial = {
  id: string;
  ronda: number;
  veredicto: string;
  comentario: string;
  nota: number | null;
  createdAt?: string | null;
  etiqueta?: string;
};

function etiquetaNota(nota: number | null, escala: PeldanoEscala[]) {
  if (nota == null || escala.length === 0) return null;
  const peldano = escala.find((item) => item.valor === nota);
  return peldano?.etiqueta ? `Nota: ${nota} · ${peldano.etiqueta}` : `Nota: ${nota}`;
}

function ContenidoRevisionLectura({
  item,
  escala,
  soloNotas,
}: {
  item: ItemHistorial;
  escala: PeldanoEscala[];
  soloNotas: boolean;
}) {
  const notaTexto = etiquetaNota(item.nota, escala);

  if (soloNotas) {
    return (
      <div className="historial-feed-valor space-y-1">
        {notaTexto ? <p>{notaTexto}</p> : <p className="text-muted">Sin nota</p>}
      </div>
    );
  }

  if (item.veredicto === "OBSERVACION") {
    return (
      <div className="historial-feed-valor space-y-1">
        {item.comentario ? <p>{item.comentario}</p> : null}
        {notaTexto ? <p>{notaTexto}</p> : null}
      </div>
    );
  }

  return (
    <div className="historial-feed-valor space-y-1">
      <p>{item.veredicto === "OK" ? "Sin observaciones" : "Sin veredicto"}</p>
      {notaTexto ? <p>{notaTexto}</p> : null}
    </div>
  );
}

export function PanelEvaluacionPregunta({
  preguntaId,
  canEdit,
  ronda,
  veredictoInicial,
  comentarioInicial,
  notaInicial,
  escala,
  historial,
  soloNotas = false,
  namePrefix = "",
  tipo = "evaluacion",
}: {
  preguntaId: string;
  canEdit: boolean;
  ronda: number;
  veredictoInicial?: string;
  comentarioInicial?: string;
  notaInicial?: number | null;
  escala: PeldanoEscala[];
  historial: ItemHistorial[];
  soloNotas?: boolean;
  namePrefix?: string;
  tipo?: "evaluacion" | "supervision";
}) {
  const [veredicto, setVeredicto] = useState(soloNotas ? "OK" : (veredictoInicial ?? ""));
  const [nota, setNota] = useState<number | null>(notaInicial ?? null);
  const [comentario, setComentario] = useState(soloNotas ? "" : (comentarioInicial ?? ""));

  const campoVeredicto = `${namePrefix}veredicto-${preguntaId}`;
  const campoNota = `${namePrefix}nota-${preguntaId}`;
  const campoComentario = `${namePrefix}comentario-${preguntaId}`;
  const esSupervision = tipo === "supervision";

  const items: ItemHistorial[] = [...historial].sort((a, b) => b.ronda - a.ronda);
  if (!items.some((item) => item.ronda === ronda)) {
    items.unshift({
      id: `pendiente-${preguntaId}-${ronda}`,
      ronda,
      veredicto: soloNotas ? "OK" : (veredictoInicial ?? ""),
      comentario: soloNotas ? "" : (comentarioInicial ?? ""),
      nota: notaInicial ?? null,
      createdAt: null,
    });
  }

  if (soloNotas && escala.length === 0) {
    return (
      <div className="card space-y-2 p-4">
        <p className="text-muted">Esta pregunta no se califica con nota.</p>
      </div>
    );
  }

  return (
    <div className="card space-y-3 p-4">
      <input type="hidden" name={campoVeredicto} value={soloNotas ? "OK" : veredicto} />
      {escala.length > 0 && !esSupervision ? (
        <input type="hidden" name={campoNota} value={nota ?? ""} />
      ) : null}
      {!canEdit || soloNotas || veredicto !== "OBSERVACION" ? (
        <input type="hidden" name={campoComentario} value={soloNotas ? "" : comentario} />
      ) : null}

      <ol className="historial-feed">
        {items.map((item, index) => {
          const esActual = item.ronda === ronda;
          const editable = canEdit && esActual;

          return (
            <li key={item.id} className="historial-feed-item">
              <div className="historial-feed-rail" aria-hidden="true">
                <span className="historial-feed-dot" />
                {index < items.length - 1 ? <span className="historial-feed-line" /> : null}
              </div>
              <div className="historial-feed-card">
                <div className="historial-feed-meta">
                  <strong>
                    {item.etiqueta
                      ? item.etiqueta
                      : editable
                        ? soloNotas
                          ? `Tu nota (ronda ${item.ronda})`
                          : esSupervision
                            ? `Tu supervisión (ciclo ${item.ronda})`
                            : `Tu evaluación (ronda ${item.ronda})`
                        : soloNotas
                          ? `Nota (ronda ${item.ronda})`
                          : esSupervision
                            ? `Supervisión (ciclo ${item.ronda})`
                            : `Evaluación (ronda ${item.ronda})`}
                  </strong>
                  {index === 0 ? <span className="historial-feed-badge">Más reciente</span> : null}
                </div>
                {item.createdAt ? (
                  <time className="historial-feed-date" dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleString("es-CL")}
                  </time>
                ) : null}

                {editable ? (
                  <div className="mt-3 space-y-3">
                    {soloNotas ? null : (
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
                    )}
                    {escala.length > 0 && !esSupervision ? (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Nota</p>
                        <div className="flex flex-wrap gap-2">
                          {escala.map((peldano) => {
                            const activo = nota === peldano.valor;
                            return (
                              <button
                                key={peldano.valor}
                                className={`btn btn-sm ${activo ? "btn-navy" : "btn-ghost"}`}
                                type="button"
                                onClick={() => setNota(peldano.valor)}
                              >
                                {peldano.valor}
                                {peldano.etiqueta ? ` · ${peldano.etiqueta}` : ""}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                    {!soloNotas && veredicto === "OBSERVACION" ? (
                      <div className="field">
                        <label htmlFor={campoComentario}>Comentario (obligatorio)</label>
                        <textarea
                          className="input"
                          id={campoComentario}
                          name={campoComentario}
                          value={comentario}
                          onChange={(event) => setComentario(event.target.value)}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <ContenidoRevisionLectura item={item} escala={escala} soloNotas={soloNotas} />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
