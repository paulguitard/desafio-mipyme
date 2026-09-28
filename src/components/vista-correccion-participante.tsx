"use client";

import { useMemo, useState } from "react";
import { EvalDetalleCelda, EvalDetalleColumnas } from "@/components/eval-detalle-head";
import { HistorialVersionesRespuesta } from "@/components/historial-versiones-respuesta";
import { PanelEvaluacionPregunta } from "@/components/panel-evaluacion-pregunta";
import { PanelObservacionGeneral } from "@/components/panel-observacion-general";
import { PreguntaCampo } from "@/components/pregunta-campo";
import { notasParaEvaluacionGeneral, parseEscalaNotas } from "@/lib/preguntas";
import { historialEvaluacionParticipante, revisionVigente } from "@/lib/revision-ciclo";

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

function rondaCicloVista(asignacion: AsignacionParticipanteVista, esGeneral: boolean) {
  const fuente = esGeneral ? asignacion.revisionesGenerales : asignacion.revisiones;
  const ultima = fuente[fuente.length - 1];
  return {
    ronda: ultima?.ronda ?? asignacion.rondaActual,
    ciclo: ultima?.ciclo ?? asignacion.cicloSupervision,
  };
}

export function VistaCorreccionParticipante({
  preguntas,
  respuestas,
  asignaciones,
  observadas,
  esGeneral,
  canEdit,
}: {
  preguntas: PreguntaParticipanteVista[];
  respuestas: RespuestaParticipanteVista[];
  asignaciones: AsignacionParticipanteVista[];
  observadas: string[];
  esGeneral: boolean;
  canEdit: boolean;
}) {
  const observadasSet = useMemo(() => new Set(observadas), [observadas]);
  const inicial =
    asignaciones.find((item) => item.estado === "CON_OBSERVACIONES")?.id ??
    asignaciones.find((item) => item.revisionesGenerales.length + item.revisiones.length > 0)?.id ??
    asignaciones[0]?.id ??
    "";
  const [asignacionId, setAsignacionId] = useState(inicial);
  const asignacion = asignaciones.find((item) => item.id === asignacionId) ?? asignaciones[0] ?? null;
  const vista = asignacion ? rondaCicloVista(asignacion, esGeneral) : { ronda: 1, ciclo: 1 };

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
        aria-label="Participante y evaluación"
        data-tour="formulario-caso"
      >
        <EvalDetalleColumnas
          sinSupervision
          casoTitle="Participante"
          casoSubtitle="Tu respuesta"
          caso={preguntas.map((pregunta) => {
            const respuesta = respuestas.find((item) => item.preguntaId === pregunta.id);
            const locked =
              !esGeneral && canEdit && observadasSet.size > 0 && !observadasSet.has(pregunta.id);
            return (
              <EvalDetalleCelda key={pregunta.id} panel="caso">
                <PreguntaCampo
                  pregunta={pregunta}
                  respuesta={respuesta ?? null}
                  disabled={!canEdit || locked}
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
                {asignacion && asignacion.revisionesGenerales.length > 0 ? (
                  <PanelObservacionGeneral
                    canEdit={false}
                    ronda={vista.ronda}
                    cicloActual={vista.ciclo}
                    namePrefix="eval-"
                    nombreResponsable={asignacion.evaluadorNombre}
                    notasPreguntas={notasParaEvaluacionGeneral(
                      preguntas,
                      asignacion.revisiones,
                      vista.ronda,
                      vista.ciclo,
                    )}
                    veredictoInicial={
                      revisionVigente(asignacion.revisionesGenerales, vista.ronda, vista.ciclo)
                        ?.veredicto
                    }
                    comentarioInicial={
                      revisionVigente(asignacion.revisionesGenerales, vista.ronda, vista.ciclo)
                        ?.comentario
                    }
                    historial={historialEvaluacionParticipante(asignacion.revisionesGenerales)}
                  />
                ) : (
                  <PanelVacio texto="Todavía no hay una evaluación visible." />
                )}
              </EvalDetalleCelda>
            ) : (
              preguntas.map((pregunta) => {
                const historialPregunta =
                  asignacion?.revisiones.filter((item) => item.preguntaId === pregunta.id) ?? [];
                const actual = revisionVigente(historialPregunta, vista.ronda, vista.ciclo);
                const escala = pregunta.conNotas ? parseEscalaNotas(pregunta.escalaNotas) : [];
                return (
                  <EvalDetalleCelda key={pregunta.id} panel="eval">
                    {historialPregunta.length > 0 && asignacion ? (
                      <PanelEvaluacionPregunta
                        preguntaId={pregunta.id}
                        canEdit={false}
                        ronda={vista.ronda}
                        cicloActual={vista.ciclo}
                        veredictoInicial={actual?.veredicto}
                        comentarioInicial={actual?.comentario}
                        notaInicial={actual?.nota}
                        escala={escala}
                        namePrefix="eval-"
                        nombreResponsable={asignacion.evaluadorNombre}
                        historial={historialEvaluacionParticipante(historialPregunta)}
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
