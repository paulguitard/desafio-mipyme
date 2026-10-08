"use client";

import { useMemo, useState } from "react";
import { EvalDetalleCelda, EvalDetalleColumnas } from "@/components/eval-detalle-head";
import { HistorialVersionesRespuesta } from "@/components/historial-versiones-respuesta";
import { PanelHiloRevision } from "@/components/hilo-revision";
import { PreguntaCampo } from "@/components/pregunta-campo";
import { parseEscalaNotas } from "@/lib/preguntas";

export type RevisionParticipante = {
  id: string;
  preguntaId?: string;
  ronda: number;
  ciclo: number;
  veredicto: string;
  comentario: string;
  nota?: number | null;
  createdAt: string;
};

export type AsignacionParticipanteVista = {
  id: string;
  orden: number;
  estado: string;
  evaluadorNombre: string;
  rondaActual: number;
  cicloSupervision: number;
  revisiones: (RevisionParticipante & { preguntaId: string; nota: number | null })[];
  revisionesGenerales: RevisionParticipante[];
};

export type PreguntaParticipanteVista = {
  id: string;
  enunciado: string;
  ayuda: string;
  tipo: string;
  opciones: string;
  obligatoria: boolean;
  permiteArchivo: boolean;
  permiteImagen: boolean;
  permiteVideoLink?: boolean;
  conNotas: boolean;
  escalaNotas: string;
};

export type RespuestaParticipanteVista = {
  preguntaId: string;
  valor: string;
  archivos: string;
  versiones: { id: string; valor: string; archivos: string; createdAt: string }[];
};

function PanelVacio({ texto }: { texto: string }) {
  return (
    <div className="card space-y-2 p-4">
      <p className="text-muted">{texto}</p>
    </div>
  );
}

export function VistaCorreccionParticipante({
  preguntas,
  respuestas,
  asignaciones,
  observadas,
  modificadas = [],
  esGeneral,
  canEdit,
}: {
  preguntas: PreguntaParticipanteVista[];
  respuestas: RespuestaParticipanteVista[];
  asignaciones: AsignacionParticipanteVista[];
  observadas: string[];
  modificadas?: string[];
  esGeneral: boolean;
  canEdit: boolean;
}) {
  const observadasSet = useMemo(() => new Set(observadas), [observadas]);
  const modificadasSet = useMemo(() => new Set(modificadas), [modificadas]);
  const inicial =
    asignaciones.find((item) => item.estado === "CON_OBSERVACIONES")?.id ??
    asignaciones.find((item) => item.revisionesGenerales.length + item.revisiones.length > 0)?.id ??
    asignaciones[0]?.id ??
    "";
  const [asignacionId, setAsignacionId] = useState(inicial);
  const asignacion = asignaciones.find((item) => item.id === asignacionId) ?? asignaciones[0] ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {asignaciones.length > 1 ? (
        <div className="ficha-detalle-admin-meta px-0 pb-2">
          <div className="ficha-detalle-admin-eval">
            <label htmlFor="participante-detalle-evaluador">Evaluación de</label>
            <select
              className="input"
              id="participante-detalle-evaluador"
              value={asignacion?.id ?? ""}
              onChange={(event) => setAsignacionId(event.target.value)}
            >
              {asignaciones.map((item) => (
                <option key={item.id} value={item.id}>
                  Evaluación {item.orden} · {item.evaluadorNombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      <section
        className="eval-detalle-shell min-h-0 flex-1"
        aria-label="Tu caso y evaluación"
        data-tour="formulario-caso"
      >
        <EvalDetalleColumnas
          sinSupervision
          casoTitle="Tu caso"
          casoSubtitle="Tu respuesta"
          caso={preguntas.map((pregunta) => {
            const respuesta = respuestas.find((item) => item.preguntaId === pregunta.id);
            const locked =
              !esGeneral && canEdit && observadasSet.size > 0 && !observadasSet.has(pregunta.id);
            const modificada = modificadasSet.has(pregunta.id);
            return (
              <EvalDetalleCelda key={pregunta.id} panel="caso">
                <PreguntaCampo
                  pregunta={pregunta}
                  respuesta={respuesta ?? null}
                  disabled={!canEdit || locked}
                  modificada={modificada}
                  acciones={
                    respuesta?.versiones && respuesta.versiones.length > 0 ? (
                      <HistorialVersionesRespuesta
                        tipo={pregunta.tipo}
                        opciones={pregunta.opciones}
                        versiones={respuesta.versiones.map((version, index) => ({
                          id: version.id,
                          valor: version.valor,
                          archivos: version.archivos,
                          createdAt: version.createdAt,
                          numero: respuesta.versiones.length - index,
                        }))}
                        modificada={modificada}
                      />
                    ) : null
                  }
                />
              </EvalDetalleCelda>
            );
          })}
          evalTitle="Evaluación"
          evalSubtitle={
            asignacion
              ? `Observaciones de ${asignacion.evaluadorNombre}`
              : "Sin evaluaciones visibles"
          }
          evaluacion={
            esGeneral ? (
              <EvalDetalleCelda panel="eval">
                {asignacion ? (
                  <PanelHiloRevision
                    audiencia="participante"
                    asignacion={{
                      estado: asignacion.estado,
                      rondaActual: asignacion.rondaActual,
                      cicloSupervision: asignacion.cicloSupervision,
                    }}
                    revisiones={asignacion.revisionesGenerales}
                    nombreEvaluador={asignacion.evaluadorNombre}
                    preguntasNotas={preguntas}
                    revisionesNotas={asignacion.revisiones}
                  />
                ) : (
                  <PanelVacio texto="Todavía no hay una evaluación visible." />
                )}
              </EvalDetalleCelda>
            ) : (
              preguntas.map((pregunta) => {
                const historialPregunta =
                  asignacion?.revisiones.filter((item) => item.preguntaId === pregunta.id) ?? [];
                const escala = pregunta.conNotas ? parseEscalaNotas(pregunta.escalaNotas) : [];
                return (
                  <EvalDetalleCelda key={pregunta.id} panel="eval">
                    {asignacion ? (
                      <PanelHiloRevision
                        audiencia="participante"
                        asignacion={{
                          estado: asignacion.estado,
                          rondaActual: asignacion.rondaActual,
                          cicloSupervision: asignacion.cicloSupervision,
                        }}
                        preguntaId={pregunta.id}
                        escala={escala}
                        revisiones={historialPregunta}
                        nombreEvaluador={asignacion.evaluadorNombre}
                        textoVacio="Todavía no hay una evaluación visible en esta pregunta."
                      />
                    ) : (
                      <PanelVacio texto="Todavía no hay una evaluación visible en esta pregunta." />
                    )}
                  </EvalDetalleCelda>
                );
              })
            )
          }
        />
      </section>
    </div>
  );
}
