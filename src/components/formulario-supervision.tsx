"use client";

import { useMemo, useState } from "react";
import { AvisoEntradaCaso } from "@/components/aviso-entrada-caso";
import { BotonAtras } from "@/components/boton-atras";
import { EvalDetalleCelda } from "@/components/eval-detalle-head";
import { FichaCasoMeta } from "@/components/ficha-caso-meta";
import { FormularioEvaluacion } from "@/components/formulario-evaluacion";
import { HistorialVersionesRespuesta } from "@/components/historial-versiones-respuesta";
import { PanelHiloRevision } from "@/components/hilo-revision";
import { PreguntaCampo } from "@/components/pregunta-campo";
import { ResumenCambiosReenvio } from "@/components/resumen-cambios-reenvio";
import { preguntasModificadasEnUltimoEnvio } from "@/lib/cambios-reenvio";
import { parseModoEvaluacion } from "@/lib/modo-evaluacion";
import { avisoEntradaSupervisor } from "@/lib/aviso-entrada-caso";
import { etiquetaNombreCaso } from "@/lib/nombre-caso";
import { parseEscalaNotas } from "@/lib/preguntas";
import { revisionParaEditar } from "@/lib/revision-ciclo";
import type { DetalleFichaAdmin } from "@/lib/convocatoria-admin-data";

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
  const avisoEntrada = asignacion
    ? avisoEntradaSupervisor(asignacion.estado, asignacion.intencionPendiente)
    : null;
  const idsModificadas = useMemo(() => {
    return new Set(
      preguntasModificadasEnUltimoEnvio({
        respuestas: data.respuestas.map((respuesta) => ({
          preguntaId: respuesta.preguntaId,
          tipo: data.preguntas.find((pregunta) => pregunta.id === respuesta.preguntaId)?.tipo ?? "texto_corto",
          versiones: respuesta.versiones,
        })),
        asignaciones: data.asignaciones.map((item) => ({
          rondaActual: item.rondaActual,
          revisiones: [
            ...item.revisiones.map((revision) => ({
              ronda: revision.ronda,
              createdAt: revision.createdAt,
            })),
            ...item.revisionesGenerales.map((revision) => ({
              ronda: revision.ronda,
              createdAt: revision.createdAt,
            })),
          ],
        })),
      }),
    );
  }, [data.asignaciones, data.preguntas, data.respuestas]);
  const preguntasModificadas = data.preguntas
    .filter((pregunta) => idsModificadas.has(pregunta.id))
    .map((pregunta) => ({ id: pregunta.id, enunciado: pregunta.enunciado }));

  if (!asignacion) {
    return (
      <div className="space-y-4">
        <BotonAtras href="/evaluador" />
        <p className="text-muted">Esta participación aún no tiene evaluadores asignados.</p>
      </div>
    );
  }

  const veredictosIniciales = esGeneral
    ? {
        general: revisionParaEditar(asignacion.supervisionesGenerales, ronda, ciclo)?.veredicto ?? "",
      }
    : Object.fromEntries(
        data.preguntas.map((pregunta) => [
          pregunta.id,
          revisionParaEditar(
            asignacion.supervisionesPregunta.filter((item) => item.preguntaId === pregunta.id),
            ronda,
            ciclo,
          )?.veredicto ?? "",
        ]),
      );

  return (
    <>
    <AvisoEntradaCaso aviso={avisoEntrada} />
    <FormularioEvaluacion
      key={asignacion.id}
      asignacionId={asignacion.id}
      canEdit={canEdit}
      rolAccion="supervisor"
      intencionPendiente={asignacion.intencionPendiente}
      modoEvaluacion={modoEvaluacion}
      back={<BotonAtras href="/evaluador" />}
      title={
        <h1 className="formulario-caso-titulo text-3xl font-extrabold text-navy">
          {nombreCaso} · {data.convocatoriaTitulo}
        </h1>
      }
      headerEvaluacion={esGeneral ? "Comentario del caso" : "Comentarios por pregunta"}
      veredictoSupervisionInicial={
        esGeneral
          ? (asignacion.supervisionesGenerales.find(
              (item) => item.ronda === ronda && item.ciclo === ciclo,
            )?.veredicto ?? "")
          : ""
      }
      veredictosIniciales={veredictosIniciales}
      meta={
        <div className="space-y-3">
          <FichaCasoMeta
            participante={data.emprendedorNombre}
            evaluador={asignacion.evaluadorNombre}
          />
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
      caso={
        <>
          <ResumenCambiosReenvio preguntas={preguntasModificadas} />
          {data.preguntas.map((pregunta) => {
        const respuesta = data.respuestas.find((item) => item.preguntaId === pregunta.id);
        const modificada = idsModificadas.has(pregunta.id);
        return (
          <EvalDetalleCelda key={pregunta.id} panel="caso">
            <PreguntaCampo
              pregunta={pregunta}
              respuesta={respuesta ?? null}
              disabled
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
        </>
      }
      evaluacion={
        esGeneral ? (
          <EvalDetalleCelda panel="eval">
            <PanelHiloRevision
              audiencia="equipo"
              asignacion={{
                estado: asignacion.estado,
                rondaActual: ronda,
                cicloSupervision: ciclo,
              }}
              revisiones={asignacion.revisionesGenerales}
              supervisiones={asignacion.supervisionesGenerales}
              nombreEvaluador={asignacion.evaluadorNombre}
              nombreSupervisor={data.supervisorNombre}
              canEdit={canEdit}
              rolEditor={canEdit ? "supervisor" : null}
              preguntasNotas={data.preguntas}
              revisionesNotas={asignacion.revisiones}
            />
          </EvalDetalleCelda>
        ) : (
          data.preguntas.map((pregunta) => {
            const escala = pregunta.conNotas ? parseEscalaNotas(pregunta.escalaNotas) : [];
            return (
              <EvalDetalleCelda key={pregunta.id} panel="eval">
                <PanelHiloRevision
                  audiencia="equipo"
                  asignacion={{
                    estado: asignacion.estado,
                    rondaActual: ronda,
                    cicloSupervision: ciclo,
                  }}
                  preguntaId={pregunta.id}
                  escala={escala}
                  revisiones={asignacion.revisiones.filter((item) => item.preguntaId === pregunta.id)}
                  supervisiones={asignacion.supervisionesPregunta.filter(
                    (item) => item.preguntaId === pregunta.id,
                  )}
                  nombreEvaluador={asignacion.evaluadorNombre}
                  nombreSupervisor={data.supervisorNombre}
                  canEdit={canEdit}
                  rolEditor={canEdit ? "supervisor" : null}
                  respuestaModificada={idsModificadas.has(pregunta.id)}
                />
              </EvalDetalleCelda>
            );
          })
        )
      }
    />
    </>
  );
}
