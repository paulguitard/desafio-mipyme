"use client";

import { useMemo, useState } from "react";
import { BotonAtras } from "@/components/boton-atras";
import { EvalDetalleCelda } from "@/components/eval-detalle-head";
import { FormularioEvaluacion } from "@/components/formulario-evaluacion";
import { HistorialVersionesRespuesta } from "@/components/historial-versiones-respuesta";
import { PanelEvaluacionPregunta } from "@/components/panel-evaluacion-pregunta";
import { PanelObservacionGeneral, PanelSupervisionPendiente } from "@/components/panel-observacion-general";
import { PreguntaCampo } from "@/components/pregunta-campo";
import { parseModoEvaluacion } from "@/lib/modo-evaluacion";
import { etiquetaNombreCaso } from "@/lib/nombre-caso";
import { notasParaEvaluacionGeneral, parseEscalaNotas } from "@/lib/preguntas";
import { historialEvaluacion, revisionVigente } from "@/lib/revision-ciclo";
import { historialSupervision } from "@/lib/supervision-ui";
import type { DetalleFichaAdmin } from "@/lib/convocatoria-admin-data";
import { normalizarCorreo } from "@/lib/correo";

export function FormularioSupervision({ data }: { data: DetalleFichaAdmin }) {
  const [asignacionId, setAsignacionId] = useState(data.asignaciones[0]?.id ?? "");
  const asignacion = useMemo(
    () => data.asignaciones.find((item) => item.id === asignacionId) ?? null,
    [asignacionId, data.asignaciones],
  );
  const modoEvaluacion = parseModoEvaluacion(data.modoEvaluacion);
  const esGeneral = modoEvaluacion === "GENERAL";
  const ronda = asignacion?.rondaActual ?? 1;
  const ciclo = asignacion?.cicloSupervision ?? 1;
  const canEdit = Boolean(asignacion && asignacion.estado === "EN_SUPERVISION");
  const nombreCaso = etiquetaNombreCaso(data.nombreCaso);

  if (!asignacion) {
    return (
      <div className="space-y-4">
        <BotonAtras href="/evaluador" />
        <p className="text-muted">Esta participación aún no tiene evaluadores asignados.</p>
      </div>
    );
  }

  return (
    <FormularioEvaluacion
      key={asignacion.id}
      asignacionId={asignacion.id}
      canEdit={canEdit}
      rolAccion="supervisor"
      intencionPendiente={asignacion.intencionPendiente}
      modoEvaluacion={modoEvaluacion}
      back={<BotonAtras href="/evaluador" />}
      title={
        <h1 className="text-3xl font-extrabold text-navy">
          {nombreCaso} · {data.convocatoriaTitulo}
        </h1>
      }
      headerEvaluacion={`Revisión de ${asignacion.evaluadorNombre}`}
      headerSupervision={
        data.supervisorNombre
          ? `Tu revisión de la evaluación de ${asignacion.evaluadorNombre}`
          : "Supervisión"
      }
      meta={
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <p className="text-muted">
              {data.emprendedorNombre} · {normalizarCorreo(data.emprendedorEmail)}
            </p>
            {asignacion.estado === "EN_SUPERVISION" ? (
              <p>
                {asignacion.intencionPendiente === "FINALIZAR"
                  ? "El evaluador pidió finalizar. Revisa y procede o devuelve observaciones."
                  : "El evaluador envió observaciones. Revisa y procede o devuelve observaciones."}
              </p>
            ) : asignacion.estado === "DEVUELTA_SUPERVISOR" ? (
              <p>Esperando que el evaluador corrija según tu última supervisión.</p>
            ) : null}
          </div>
          {data.asignaciones.length > 1 ? (
            <div className="ficha-detalle-admin-eval">
              <label htmlFor="supervision-evaluador">Evaluación de</label>
              <select
                className="input"
                id="supervision-evaluador"
                value={asignacionId}
                onChange={(event) => setAsignacionId(event.target.value)}
              >
                {data.asignaciones.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.evaluadorNombre}
                    {item.estado === "EN_SUPERVISION"
                      ? item.intencionPendiente === "FINALIZAR"
                        ? " · Por finalizar"
                        : " · Observaciones por revisar"
                      : item.estado === "FINALIZADA"
                        ? " · Finalizada"
                        : item.estado === "DEVUELTA_SUPERVISOR"
                          ? " · Devuelta"
                          : " · En curso"}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      }
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
      evaluacion={
        esGeneral ? (
          <EvalDetalleCelda panel="eval">
            <PanelObservacionGeneral
              canEdit={false}
              ronda={ronda}
              cicloActual={ciclo}
              namePrefix="eval-"
              nombreResponsable={asignacion.evaluadorNombre}
              notasPreguntas={notasParaEvaluacionGeneral(data.preguntas, asignacion.revisiones, ronda, ciclo)}
              veredictoInicial={
                revisionVigente(asignacion.revisionesGenerales, ronda, ciclo)?.veredicto
              }
              comentarioInicial={
                revisionVigente(asignacion.revisionesGenerales, ronda, ciclo)?.comentario
              }
              historial={historialEvaluacion(asignacion.revisionesGenerales)}
            />
          </EvalDetalleCelda>
        ) : (
          data.preguntas.map((pregunta) => {
            const actual = revisionVigente(
              asignacion.revisiones.filter((item) => item.preguntaId === pregunta.id),
              ronda,
              ciclo,
            );
            const historial = asignacion.revisiones.filter((item) => item.preguntaId === pregunta.id);
            const escala = pregunta.conNotas ? parseEscalaNotas(pregunta.escalaNotas) : [];
            return (
              <EvalDetalleCelda key={pregunta.id} panel="eval">
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
              </EvalDetalleCelda>
            );
          })
        )
      }
      supervision={
        esGeneral ? (
          <EvalDetalleCelda panel="sup">
            {!canEdit && asignacion.supervisionesGenerales.length === 0 ? (
              <PanelSupervisionPendiente />
            ) : (
              <PanelObservacionGeneral
                canEdit={canEdit}
                ronda={ciclo}
                tipo="supervision"
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
            )}
          </EvalDetalleCelda>
        ) : (
          data.preguntas.map((pregunta) => {
            const supervisiones = asignacion.supervisionesPregunta.filter(
              (item) => item.preguntaId === pregunta.id,
            );
            const actualSup = supervisiones.find((item) => item.ronda === ronda && item.ciclo === ciclo);
            return (
              <EvalDetalleCelda key={pregunta.id} panel="sup">
                <PanelEvaluacionPregunta
                  preguntaId={pregunta.id}
                  canEdit={canEdit}
                  ronda={ciclo}
                  veredictoInicial={actualSup?.veredicto}
                  comentarioInicial={actualSup?.comentario}
                  escala={[]}
                  tipo="supervision"
                  nombreResponsable={data.supervisorNombre}
                  historial={historialSupervision(supervisiones)}
                />
              </EvalDetalleCelda>
            );
          })
        )
      }
    />
  );
}
