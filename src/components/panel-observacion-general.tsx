"use client";

import { useState } from "react";
import type { NotaPreguntaGeneral, PeldanoEscala } from "@/lib/preguntas";
import { ordenHistorialRevision, textoEsperaRevision } from "@/lib/revision-ciclo";

type ItemHistorial = {
  id: string;
  ronda: number;
  ciclo?: number;
  veredicto: string;
  comentario: string;
  createdAt?: string | null;
  etiqueta?: string;
};

function etiquetaNota(nota: number | null, escala: PeldanoEscala[]) {
  if (nota == null || escala.length === 0) return "Sin nota";
  const peldano = escala.find((item) => item.valor === nota);
  return peldano?.etiqueta ? `Nota: ${nota} · ${peldano.etiqueta}` : `Nota: ${nota}`;
}

function ContenidoRevisionGeneralLectura({
  item,
  tipo,
  nombreResponsable,
}: {
  item: ItemHistorial;
  tipo: "evaluacion" | "supervision";
  nombreResponsable?: string | null;
}) {
  if (item.veredicto === "OBSERVACION") {
    return (
      <div className="historial-feed-valor space-y-1">
        {item.comentario ? <p>{item.comentario}</p> : null}
      </div>
    );
  }

  return (
    <div className="historial-feed-valor space-y-1">
      <p>{item.veredicto === "OK" ? "Sin observaciones" : textoEsperaRevision(tipo, nombreResponsable)}</p>
    </div>
  );
}

function SelectoresNotasGenerales({
  notas,
  canEdit,
  namePrefix,
}: {
  notas: NotaPreguntaGeneral[];
  canEdit: boolean;
  namePrefix: string;
}) {
  const [valores, setValores] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(notas.map((item) => [item.preguntaId, item.notaInicial])),
  );

  if (notas.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-semibold text-navy">Notas</h4>
        <p className="text-sm text-muted">Calificación de las preguntas que se evalúan con nota.</p>
      </div>
      {notas.map((item) => {
        const nota = valores[item.preguntaId] ?? null;
        const campoNota = `${namePrefix}nota-${item.preguntaId}`;
        const campoVeredicto = `${namePrefix}veredicto-${item.preguntaId}`;

        return (
          <div key={item.preguntaId} className="space-y-2">
            <p className="text-sm font-semibold">{item.enunciado}</p>
            {canEdit ? (
              <>
                <input type="hidden" name={campoVeredicto} value="OK" />
                <input type="hidden" name={campoNota} value={nota ?? ""} />
                <div className="flex flex-wrap gap-2">
                  {item.escala.map((peldano) => {
                    const activo = nota === peldano.valor;
                    return (
                      <button
                        key={peldano.valor}
                        className={`btn btn-sm ${activo ? "btn-navy" : "btn-ghost"}`}
                        type="button"
                        onClick={() =>
                          setValores((actual) => ({ ...actual, [item.preguntaId]: peldano.valor }))
                        }
                      >
                        {peldano.valor}
                        {peldano.etiqueta ? ` · ${peldano.etiqueta}` : ""}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm">{etiquetaNota(item.notaInicial, item.escala)}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PanelSupervisionPendiente() {
  return (
    <div className="card space-y-2 p-4">
      <p className="text-muted">Sin supervisión por el momento → a la espera de la evaluación</p>
    </div>
  );
}

export function PanelObservacionGeneral({
  canEdit,
  ronda,
  cicloActual,
  veredictoInicial,
  comentarioInicial,
  historial,
  namePrefix = "",
  tipo = "evaluacion",
  notasPreguntas = [],
  nombreResponsable,
}: {
  canEdit: boolean;
  ronda: number;
  cicloActual?: number;
  veredictoInicial?: string;
  comentarioInicial?: string;
  historial: ItemHistorial[];
  namePrefix?: string;
  tipo?: "evaluacion" | "supervision";
  notasPreguntas?: NotaPreguntaGeneral[];
  nombreResponsable?: string | null;
}) {
  const [veredicto, setVeredicto] = useState(veredictoInicial ?? "");
  const [comentario, setComentario] = useState(comentarioInicial ?? "");
  const campoVeredicto = `${namePrefix}veredicto-general`;
  const campoComentario = `${namePrefix}comentario-general`;
  const esSupervision = tipo === "supervision";
  const esItemActual = (item: ItemHistorial) =>
    item.ronda === ronda && (cicloActual == null || (item.ciclo ?? cicloActual) === cicloActual);

  const items: ItemHistorial[] = [...historial].sort(ordenHistorialRevision);
  if (!items.some(esItemActual)) {
    items.unshift({
      id: `pendiente-general-${ronda}-${cicloActual ?? "x"}`,
      ronda,
      ciclo: cicloActual,
      veredicto: veredictoInicial ?? "",
      comentario: comentarioInicial ?? "",
      createdAt: null,
    });
  }

  return (
    <div className="card space-y-3 p-4">
      {canEdit ? (
        <>
          <input type="hidden" name={campoVeredicto} value={veredicto} />
          {veredicto !== "OBSERVACION" ? (
            <input type="hidden" name={campoComentario} value={comentario} />
          ) : null}
        </>
      ) : null}

      {!esSupervision ? (
        <SelectoresNotasGenerales notas={notasPreguntas} canEdit={canEdit} namePrefix={namePrefix} />
      ) : null}

      <ol className="historial-feed">
        {items.map((item, index) => {
          const esActual = esItemActual(item);
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

                {editable ? (
                  <div className="mt-3 space-y-3">
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
                  <ContenidoRevisionGeneralLectura
                    item={item}
                    tipo={tipo}
                    nombreResponsable={nombreResponsable}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
