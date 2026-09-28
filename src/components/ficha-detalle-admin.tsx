"use client";

import { useMemo, useState } from "react";
import { EvalDetalleCelda, EvalDetalleColumnas } from "@/components/eval-detalle-head";
import { HistorialVersionesRespuesta } from "@/components/historial-versiones-respuesta";
import { PanelEvaluacionPregunta } from "@/components/panel-evaluacion-pregunta";
import { PanelObservacionGeneral, PanelSupervisionPendiente } from "@/components/panel-observacion-general";
import { PreguntaCampo } from "@/components/pregunta-campo";
import type { DetalleFichaAdmin } from "@/lib/convocatoria-admin-data";
import { normalizarCorreo } from "@/lib/correo";
import { parseModoEvaluacion } from "@/lib/modo-evaluacion";
import { notasParaEvaluacionGeneral, parseEscalaNotas } from "@/lib/preguntas";
import { historialEvaluacion, revisionVigente } from "@/lib/revision-ciclo";
import { historialSupervision } from "@/lib/supervision-ui";

function lineaPersona(
  nombre: string | null | undefined,
  email: string | null | undefined,
  vacio: string,
) {
  const partes = [nombre, email ? normalizarCorreo(email) : email].filter(Boolean);
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
        <EvalDetalleColumnas
          casoTitle="Caso"
          casoSubtitle={lineaPersona(
            data.emprendedorNombre,
            data.emprendedorEmail,
            "Sin participante",
          )}
          caso={data.preguntas.map((pregunta) => {
            const respuesta = data.respuestas.find((item) => item.preguntaId === pregunta.id);
            return (
              <EvalDetalleCelda key={pregunta.id} panel="caso">
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
              </EvalDetalleCelda>
            );
          })}
          evalTitle="Evaluación"
          evalSubtitle={lineaPersona(
            asignacion?.evaluadorNombre,
            asignacion?.evaluadorEmail,
            "Sin evaluadores asignados",
          )}
          evaluacion={
            esGeneral ? (
              <EvalDetalleCelda panel="eval">
                {asignacion ? (
                  <PanelObservacionGeneral
                    canEdit={false}
                    ronda={ronda}
                    cicloActual={ciclo}
                    namePrefix="eval-"
                    nombreResponsable={asignacion.evaluadorNombre}
                    notasPreguntas={notasParaEvaluacionGeneral(
                      data.preguntas,
                      asignacion.revisiones,
                      ronda,
                      ciclo,
                    )}
                    veredictoInicial={
                      revisionVigente(asignacion.revisionesGenerales, ronda, ciclo)?.veredicto
                    }
                    comentarioInicial={
                      revisionVigente(asignacion.revisionesGenerales, ronda, ciclo)?.comentario
                    }
                    historial={historialEvaluacion(asignacion.revisionesGenerales)}
                  />
                ) : (
                  <div className="card space-y-2 p-4">
                    <p className="text-muted">Aún no hay evaluadores asignados a esta ficha.</p>
                  </div>
                )}
              </EvalDetalleCelda>
            ) : (
              data.preguntas.map((pregunta) => {
                const actual = revisionVigente(
                  asignacion?.revisiones.filter((item) => item.preguntaId === pregunta.id) ?? [],
                  ronda,
                  ciclo,
                );
                const historial =
                  asignacion?.revisiones.filter((item) => item.preguntaId === pregunta.id) ?? [];
                const escala = pregunta.conNotas ? parseEscalaNotas(pregunta.escalaNotas) : [];
                return (
                  <EvalDetalleCelda key={pregunta.id} panel="eval">
                    {asignacion ? (
                      <PanelEvaluacionPregunta
                        preguntaId={pregunta.id}
                        canEdit={false}
                        ronda={ronda}
                        cicloActual={ciclo}
                        veredictoInicial={actual?.veredicto}
                        comentarioInicial={actual?.comentario}
                        notaInicial={actual?.nota}
                        escala={escala}
                        namePrefix="eval-"
                        nombreResponsable={asignacion.evaluadorNombre}
                        historial={historialEvaluacion(historial)}
                      />
                    ) : (
                      <div className="card space-y-2 p-4">
                        <p className="text-muted">Aún no hay evaluadores asignados a esta ficha.</p>
                      </div>
                    )}
                  </EvalDetalleCelda>
                );
              })
            )
          }
          supTitle="Supervisión"
          supSubtitle={lineaPersona(
            data.supervisorNombre,
            data.supervisorEmail,
            "Sin supervisor asignado",
          )}
          supervision={
            esGeneral ? (
              <EvalDetalleCelda panel="sup">
                {asignacion && asignacion.supervisionesGenerales.length > 0 ? (
                  <PanelObservacionGeneral
                    canEdit={false}
                    ronda={ciclo}
                    tipo="supervision"
                    namePrefix="sup-"
                    nombreResponsable={data.supervisorNombre}
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
              </EvalDetalleCelda>
            ) : (
              data.preguntas.map((pregunta) => {
                const supervisiones =
                  asignacion?.supervisionesPregunta.filter((item) => item.preguntaId === pregunta.id) ??
                  [];
                const actualSup = supervisiones.find(
                  (item) => item.ronda === ronda && item.ciclo === ciclo,
                );
                return (
                  <EvalDetalleCelda key={pregunta.id} panel="sup">
                    {asignacion ? (
                      <PanelEvaluacionPregunta
                        preguntaId={pregunta.id}
                        canEdit={false}
                        ronda={ciclo}
                        veredictoInicial={actualSup?.veredicto}
                        comentarioInicial={actualSup?.comentario}
                        escala={[]}
                        tipo="supervision"
                        namePrefix="sup-"
                        nombreResponsable={data.supervisorNombre}
                        historial={historialSupervision(supervisiones)}
                      />
                    ) : (
                      <div className="card space-y-2 p-4">
                        <p className="text-muted">Sin supervisión.</p>
                      </div>
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
