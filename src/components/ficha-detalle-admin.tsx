"use client";

import { useMemo, useState } from "react";
import { EvalDetalleCelda, EvalDetalleColumnas } from "@/components/eval-detalle-head";
import { HistorialVersionesRespuesta } from "@/components/historial-versiones-respuesta";
import { PanelHiloRevision } from "@/components/hilo-revision";
import { PreguntaCampo } from "@/components/pregunta-campo";
import { PiezaContenidoVista } from "@/components/pieza-contenido-vista";
import type { DetalleFichaAdmin } from "@/lib/convocatoria-admin-data";
import { normalizarCorreo } from "@/lib/correo";
import { parseModoEvaluacion } from "@/lib/modo-evaluacion";
import { parseEscalaNotas } from "@/lib/preguntas";
import { esMentoriaContenido } from "@/lib/tipo-formulario";

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
  const esContenido = esMentoriaContenido(data.tipo);

  if (esContenido) {
    return (
      <div className="ficha-detalle-admin eval-shell-open">
        <section className="eval-detalle-shell" aria-label="Contenido visto por el participante">
          <EvalDetalleColumnas
            sinSupervision
            casoTitle="Contenido"
            casoSubtitle={lineaPersona(
              data.emprendedorNombre,
              data.emprendedorEmail,
              "Sin participante",
            )}
            caso={(data.piezas ?? []).map((pieza) => (
              <EvalDetalleCelda key={pieza.id} panel="caso">
                <PiezaContenidoVista pieza={pieza} />
              </EvalDetalleCelda>
            ))}
            evalTitle="Evaluación"
            evalSubtitle="Sin evaluación"
            evaluacion={
              <EvalDetalleCelda panel="eval">
                <div className="card space-y-2 p-4">
                  <p className="text-muted">Las asesorías de contenido no tienen evaluación.</p>
                </div>
              </EvalDetalleCelda>
            }
          />
        </section>
      </div>
    );
  }

  return (
    <div className="ficha-detalle-admin eval-shell-open">
      {data.asignaciones.length > 1 ? (
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
          sinSupervision
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
          evalTitle="Evaluación y Supervisión"
          evalSubtitle={lineaPersona(
            asignacion?.evaluadorNombre,
            asignacion?.evaluadorEmail,
            "Sin evaluadores asignados",
          )}
          evaluacion={
            esGeneral ? (
              <EvalDetalleCelda panel="eval">
                {asignacion ? (
                  <PanelHiloRevision
                    audiencia="equipo"
                    asignacion={{
                      estado: asignacion.estado,
                      rondaActual: asignacion.rondaActual,
                      cicloSupervision: asignacion.cicloSupervision,
                    }}
                    revisiones={asignacion.revisionesGenerales}
                    supervisiones={asignacion.supervisionesGenerales}
                    nombreEvaluador={asignacion.evaluadorNombre}
                    nombreSupervisor={data.supervisorNombre}
                    preguntasNotas={data.preguntas}
                    revisionesNotas={asignacion.revisiones}
                  />
                ) : (
                  <div className="card space-y-2 p-4">
                    <p className="text-muted">Aún no hay evaluadores asignados a esta ficha.</p>
                  </div>
                )}
              </EvalDetalleCelda>
            ) : (
              data.preguntas.map((pregunta) => {
                const escala = pregunta.conNotas ? parseEscalaNotas(pregunta.escalaNotas) : [];
                return (
                  <EvalDetalleCelda key={pregunta.id} panel="eval">
                    {asignacion ? (
                      <PanelHiloRevision
                        audiencia="equipo"
                        asignacion={{
                          estado: asignacion.estado,
                          rondaActual: asignacion.rondaActual,
                          cicloSupervision: asignacion.cicloSupervision,
                        }}
                        preguntaId={pregunta.id}
                        escala={escala}
                        revisiones={asignacion.revisiones.filter((item) => item.preguntaId === pregunta.id)}
                        supervisiones={asignacion.supervisionesPregunta.filter(
                          (item) => item.preguntaId === pregunta.id,
                        )}
                        nombreEvaluador={asignacion.evaluadorNombre}
                        nombreSupervisor={data.supervisorNombre}
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
        />
      </section>
    </div>
  );
}
