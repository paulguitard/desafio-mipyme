"use client";

import { useMemo, useState } from "react";
import { HistorialVersionesRespuesta } from "@/components/historial-versiones-respuesta";
import { PanelEvaluacionPregunta } from "@/components/panel-evaluacion-pregunta";
import { PanelObservacionGeneral } from "@/components/panel-observacion-general";
import { PreguntaCampo } from "@/components/pregunta-campo";
import type { DetalleFichaAdmin } from "@/lib/convocatoria-admin-data";
import { parseModoEvaluacion } from "@/lib/modo-evaluacion";
import { etiquetaNombreCaso } from "@/lib/nombre-caso";
import { parseEscalaNotas } from "@/lib/preguntas";
import { historialSupervision } from "@/lib/supervision-ui";

export function FichaDetalleAdmin({ data }: { data: DetalleFichaAdmin }) {
  const [asignacionId, setAsignacionId] = useState(data.asignaciones[0]?.id ?? "");

  const asignacion = useMemo(
    () => data.asignaciones.find((item) => item.id === asignacionId) ?? null,
    [asignacionId, data.asignaciones],
  );

  const nombreCaso = etiquetaNombreCaso(data.nombreCaso);
  const modoEvaluacion = parseModoEvaluacion(data.modoEvaluacion);
  const esGeneral = modoEvaluacion === "GENERAL";
  const ciclo = asignacion?.cicloSupervision ?? 1;
  const ronda = asignacion?.rondaActual ?? 1;

  return (
    <div className="ficha-detalle-admin eval-shell-open">
      <div className="ficha-detalle-admin-meta">
        <div className="min-w-0">
          <p className="ficha-detalle-admin-caso">{nombreCaso}</p>
          <p className="text-muted">
            {data.emprendedorNombre} · {data.emprendedorEmail}
            {data.supervisorNombre ? ` · Supervisor: ${data.supervisorNombre}` : ""}
          </p>
        </div>
        {data.asignaciones.length > 0 ? (
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
        ) : null}
      </div>

      <section className="eval-detalle-shell" aria-label="Caso, evaluación y supervisión">
        <div className="page-scroll eval-detalle-body">
          <div className="eval-detalle-headers">
            <div className="eval-detalle-head is-caso">
              <h2>Caso</h2>
              <p>Respuestas del emprendedor</p>
            </div>
            <div className="eval-detalle-head is-eval">
              <h2>Evaluación</h2>
              <p>
                {asignacion
                  ? esGeneral
                    ? `Notas y observación general de ${asignacion.evaluadorNombre}`
                    : `Revisión de ${asignacion.evaluadorNombre}`
                  : "Sin evaluadores asignados"}
              </p>
            </div>
            <div className="eval-detalle-head is-sup">
              <h2>Supervisión</h2>
              <p>
                {data.supervisorNombre
                  ? `Revisión de ${data.supervisorNombre}`
                  : "Sin supervisor asignado"}
              </p>
            </div>
          </div>

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
                  {asignacion ? (
                    <PanelEvaluacionPregunta
                      preguntaId={pregunta.id}
                      canEdit={false}
                      ronda={ronda}
                      veredictoInicial={actual?.veredicto}
                      comentarioInicial={actual?.comentario}
                      notaInicial={actual?.nota}
                      escala={escala}
                      soloNotas={esGeneral}
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
                  {asignacion && !esGeneral ? (
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
                  ) : asignacion && esGeneral ? (
                    <div className="card space-y-2 p-4">
                      <p className="text-muted">La supervisión de este formulario es general.</p>
                    </div>
                  ) : (
                    <div className="card space-y-2 p-4">
                      <p className="text-muted">Sin supervisión.</p>
                    </div>
                  )}
                </div>
              </article>
            );
          })}

          {esGeneral && asignacion ? (
            <article className="eval-detalle-row">
              <div className="eval-detalle-cell is-caso" />
              <div className="eval-detalle-cell is-eval">
                <PanelObservacionGeneral
                  canEdit={false}
                  ronda={ronda}
                  namePrefix="eval-"
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
              </div>
              <div className="eval-detalle-cell is-sup">
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
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}
