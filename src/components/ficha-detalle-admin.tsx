"use client";

import { useMemo, useState } from "react";
import { EvalDetalleHead, useEvalPanelesColapsables } from "@/components/eval-detalle-head";
import { HistorialVersionesRespuesta } from "@/components/historial-versiones-respuesta";
import { PanelEvaluacionPregunta } from "@/components/panel-evaluacion-pregunta";
import { PanelObservacionGeneral, PanelSupervisionPendiente } from "@/components/panel-observacion-general";
import { PreguntaCampo } from "@/components/pregunta-campo";
import type { DetalleFichaAdmin } from "@/lib/convocatoria-admin-data";
import { parseModoEvaluacion } from "@/lib/modo-evaluacion";
import { notasParaEvaluacionGeneral, parseEscalaNotas } from "@/lib/preguntas";
import { historialSupervision } from "@/lib/supervision-ui";

function lineaPersona(
  nombre: string | null | undefined,
  email: string | null | undefined,
  vacio: string,
) {
  const partes = [nombre, email].filter(Boolean);
  return partes.length > 0 ? partes.join(" · ") : vacio;
}

export function FichaDetalleAdmin({ data }: { data: DetalleFichaAdmin }) {
  const [asignacionId, setAsignacionId] = useState(data.asignaciones[0]?.id ?? "");

  const asignacion = useMemo(
    () => data.asignaciones.find((item) => item.id === asignacionId) ?? null,
    [asignacionId, data.asignaciones],
  );

  const modoEvaluacion = parseModoEvaluacion(data.modoEvaluacion);
  const esGeneral = modoEvaluacion === "GENERAL";
  const ciclo = asignacion?.cicloSupervision ?? 1;
  const ronda = asignacion?.rondaActual ?? 1;
  const paneles = useEvalPanelesColapsables();

  return (
    <div className="ficha-detalle-admin eval-shell-open">
      {data.asignaciones.length > 0 ? (
        <div className="ficha-detalle-admin-meta">
          <div className="ficha-detalle-admin-eval">
            <label htmlFor="ficha-detalle-evaluador">Evaluación de</label>
            <select
              className="input"
              id="ficha-detalle-evaluador"
              value={asignacionId}
              onChange={(event) => setAsignacionId(event.target.value)}
            >
              {data.asignaciones.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.evaluadorNombre}
                  {item.estado === "FINALIZADA"
                    ? " · Finalizada"
                    : item.estado === "CON_OBSERVACIONES" || item.estado === "REPARADA"
                      ? " · Observada"
                      : item.estado === "EN_SUPERVISION"
                        ? " · En supervisión"
                        : item.estado === "DEVUELTA_SUPERVISOR"
                          ? " · Devuelta"
                          : " · Pendiente"}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      <section className="eval-detalle-shell" aria-label="Caso, evaluación y supervisión">
        <div
          className={`page-scroll eval-detalle-body${esGeneral ? " is-general" : ""}${paneles.bodyClassName ? ` ${paneles.bodyClassName}` : ""}`}
        >
          <div className="eval-detalle-headers">
            <EvalDetalleHead
              panel="caso"
              title="Caso"
              subtitle={lineaPersona(
                data.emprendedorNombre,
                data.emprendedorEmail,
                "Sin participante",
              )}
            />
            <EvalDetalleHead
              panel="eval"
              title="Evaluación"
              subtitle={lineaPersona(
                asignacion?.evaluadorNombre,
                asignacion?.evaluadorEmail,
                "Sin evaluadores asignados",
              )}
              collapsed={paneles.evalColapsado}
              onToggle={paneles.toggleEval}
            />
            <EvalDetalleHead
              panel="sup"
              title="Supervisión"
              subtitle={lineaPersona(
                data.supervisorNombre,
                data.supervisorEmail,
                "Sin supervisor asignado",
              )}
              collapsed={paneles.supColapsado}
              onToggle={paneles.toggleSup}
            />
          </div>

          {esGeneral ? (
            <>
              <div className="eval-detalle-cell is-eval is-general-panel">
                {asignacion ? (
                  <PanelObservacionGeneral
                    canEdit={false}
                    ronda={ronda}
                    namePrefix="eval-"
                    notasPreguntas={notasParaEvaluacionGeneral(
                      data.preguntas,
                      asignacion.revisiones,
                      ronda,
                    )}
                    veredictoInicial={
                      asignacion.revisionesGenerales.find((item) => item.ronda === ronda)?.veredicto
                    }
                    comentarioInicial={
                      asignacion.revisionesGenerales.find((item) => item.ronda === ronda)?.comentario
                    }
                    historial={asignacion.revisionesGenerales.map((item) => ({
                      id: item.id,
                      ronda: item.ronda,
                      veredicto: item.veredicto,
                      comentario: item.comentario,
                      createdAt: item.createdAt,
                    }))}
                  />
                ) : (
                  <div className="card space-y-2 p-4">
                    <p className="text-muted">Aún no hay evaluadores asignados a esta ficha.</p>
                  </div>
                )}
              </div>
              <div className="eval-detalle-cell is-sup is-general-panel">
                {asignacion && asignacion.supervisionesGenerales.length > 0 ? (
                  <PanelObservacionGeneral
                    canEdit={false}
                    ronda={ciclo}
                    tipo="supervision"
                    namePrefix="sup-"
                    veredictoInicial={
                      asignacion.supervisionesGenerales.find(
                        (item) => item.ronda === ronda && item.ciclo === ciclo,
                      )?.veredicto
                    }
                    comentarioInicial={
                      asignacion.supervisionesGenerales.find(
                        (item) => item.ronda === ronda && item.ciclo === ciclo,
                      )?.comentario
                    }
                    historial={historialSupervision(asignacion.supervisionesGenerales)}
                  />
                ) : (
                  <PanelSupervisionPendiente />
                )}
              </div>
            </>
          ) : null}

          <div className={esGeneral ? "eval-detalle-caso-stack" : "contents"}>
          {data.preguntas.map((pregunta) => {
            const respuesta = data.respuestas.find((item) => item.preguntaId === pregunta.id);
            const actual = asignacion?.revisiones.find(
              (item) => item.preguntaId === pregunta.id && item.ronda === ronda,
            );
            const historial =
              asignacion?.revisiones.filter((item) => item.preguntaId === pregunta.id) ?? [];
            const escala = pregunta.conNotas ? parseEscalaNotas(pregunta.escalaNotas) : [];
            const supervisiones =
              asignacion?.supervisionesPregunta.filter((item) => item.preguntaId === pregunta.id) ?? [];
            const actualSup = supervisiones.find((item) => item.ronda === ronda && item.ciclo === ciclo);

            return (
              <article key={pregunta.id} className="eval-detalle-row">
                <div className="eval-detalle-cell is-caso">
                  <PreguntaCampo
                    pregunta={pregunta}
                    respuesta={respuesta ?? null}
                    disabled
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
                </div>
                <div className="eval-detalle-cell is-eval">
                  {esGeneral ? null : asignacion ? (
                    <PanelEvaluacionPregunta
                      preguntaId={pregunta.id}
                      canEdit={false}
                      ronda={ronda}
                      veredictoInicial={actual?.veredicto}
                      comentarioInicial={actual?.comentario}
                      notaInicial={actual?.nota}
                      escala={escala}
                      namePrefix="eval-"
                      historial={historial.map((item) => ({
                        id: item.id,
                        ronda: item.ronda,
                        veredicto: item.veredicto,
                        comentario: item.comentario,
                        nota: item.nota,
                        createdAt: item.createdAt,
                      }))}
                    />
                  ) : (
                    <div className="card space-y-2 p-4">
                      <p className="text-muted">Aún no hay evaluadores asignados a esta ficha.</p>
                    </div>
                  )}
                </div>
                <div className="eval-detalle-cell is-sup">
                  {esGeneral ? null : asignacion ? (
                    <PanelEvaluacionPregunta
                      preguntaId={pregunta.id}
                      canEdit={false}
                      ronda={ciclo}
                      veredictoInicial={actualSup?.veredicto}
                      comentarioInicial={actualSup?.comentario}
                      escala={[]}
                      tipo="supervision"
                      namePrefix="sup-"
                      historial={historialSupervision(supervisiones)}
                    />
                  ) : (
                    <div className="card space-y-2 p-4">
                      <p className="text-muted">Sin supervisión.</p>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
          </div>
        </div>
      </section>
    </div>
  );
}
