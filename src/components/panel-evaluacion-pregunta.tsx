"use client";

import { useState } from "react";
import type { PeldanoEscala } from "@/lib/preguntas";
import { ordenHistorialRevision, textoEsperaRevision } from "@/lib/revision-ciclo";
import { textoContinuo } from "@/lib/texto-continuo";

type ItemHistorial = {
  id: string;
  ronda: number;
  ciclo?: number;
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
  tipo,
  nombreResponsable,
}: {
  item: ItemHistorial;
  escala: PeldanoEscala[];
  tipo: "evaluacion" | "supervision";
  nombreResponsable?: string | null;
}) {
  const notaTexto = etiquetaNota(item.nota, escala);

  if (item.veredicto === "OBSERVACION") {
    return (
      <div className="historial-feed-valor space-y-1 texto-solo-lectura">
        {item.comentario ? <p>{textoContinuo(item.comentario)}</p> : null}
        {notaTexto ? <p>{notaTexto}</p> : null}
      </div>
    );
  }

  return (
    <div className="historial-feed-valor space-y-1 texto-solo-lectura">
      <p>
        {item.veredicto === "OK"
          ? "Sin observaciones"
          : textoEsperaRevision(tipo, nombreResponsable)}
      </p>
      {notaTexto ? <p>{notaTexto}</p> : null}
    </div>
  );
}

export function PanelEvaluacionPregunta({
  preguntaId,
  canEdit,
  ronda,
  cicloActual,
  veredictoInicial,
  comentarioInicial,
  notaInicial,
  escala,
  historial,
  namePrefix = "",
  tipo = "evaluacion",
  nombreResponsable,
}: {
  preguntaId: string;
  canEdit: boolean;
  ronda: number;
  cicloActual?: number;
  veredictoInicial?: string;
  comentarioInicial?: string;
  notaInicial?: number | null;
  escala: PeldanoEscala[];
  historial: ItemHistorial[];
  namePrefix?: string;
  tipo?: "evaluacion" | "supervision";
  nombreResponsable?: string | null;
}) {
  const [veredicto, setVeredicto] = useState(veredictoInicial ?? "");
  const [nota, setNota] = useState<number | null>(notaInicial ?? null);
  const [comentario, setComentario] = useState(comentarioInicial ?? "");

  const campoVeredicto = `${namePrefix}veredicto-${preguntaId}`;
  const campoNota = `${namePrefix}nota-${preguntaId}`;
  const campoComentario = `${namePrefix}comentario-${preguntaId}`;
  const esSupervision = tipo === "supervision";
  const esItemActual = (item: ItemHistorial) =>
    item.ronda === ronda && (cicloActual == null || (item.ciclo ?? cicloActual) === cicloActual);

  const items: ItemHistorial[] = [...historial].sort(ordenHistorialRevision);
  if (!items.some(esItemActual)) {
    items.unshift({
      id: `pendiente-${preguntaId}-${ronda}-${cicloActual ?? "x"}`,
      ronda,
      ciclo: cicloActual,
      veredicto: veredictoInicial ?? "",
      comentario: comentarioInicial ?? "",
      nota: notaInicial ?? null,
      createdAt: null,
    });
  }

  return (
    <div className="revision-panel">
      {canEdit ? (
        <>
          <input type="hidden" name={campoVeredicto} value={veredicto} />
          {escala.length > 0 && !esSupervision ? (
            <input type="hidden" name={campoNota} value={nota ?? ""} />
          ) : null}
          {veredicto !== "OBSERVACION" ? (
            <input type="hidden" name={campoComentario} value={comentario} />
          ) : null}
        </>
      ) : null}

      <ol className="historial-feed">
        {items.map((item, index) => {
          const esActual = esItemActual(item);
          const editable = canEdit && esActual;

          return (
            <li key={item.id} className={`historial-feed-item${editable ? " is-edicion" : ""}`}>
              <div className="historial-feed-rail" aria-hidden="true">
                <span className="historial-feed-dot" />
                {index < items.length - 1 ? <span className="historial-feed-line" /> : null}
              </div>
              <div className={`historial-feed-card ${editable ? "pregunta-edicion" : "pregunta-lectura"}`}>
                <div className={editable ? "pregunta-edicion-enunciado" : "pregunta-lectura-enunciado"}>
                  <div className="historial-feed-meta">
                    <strong>
                      {item.etiqueta
                        ? item.etiqueta
                        : editable
                          ? esSupervision
                            ? `Tu supervisión (ciclo ${item.ronda})`
                            : `Tu evaluación (ronda ${item.ronda}${item.ciclo != null ? ` · ciclo ${item.ciclo}` : ""})`
                          : esSupervision
                            ? `Supervisión (ciclo ${item.ronda})`
                            : `Evaluación (ronda ${item.ronda}${item.ciclo != null ? ` · ciclo ${item.ciclo}` : ""})`}
                    </strong>
                    {index === 0 ? <span className="historial-feed-badge">Más reciente</span> : null}
                  </div>
                  {item.createdAt ? (
                    <time className="historial-feed-date" dateTime={item.createdAt}>
                      {new Date(item.createdAt).toLocaleString("es-CL")}
                    </time>
                  ) : null}
                </div>
                {editable ? (
                  <div className="pregunta-edicion-cuerpo space-y-3">
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
                    {veredicto === "OBSERVACION" ? (
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
                  <div className="pregunta-lectura-cuerpo">
                    <ContenidoRevisionLectura
                      item={item}
                      escala={escala}
                      tipo={tipo}
                      nombreResponsable={nombreResponsable}
                    />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
