"use client";

import { useState } from "react";
import { enviarObservaciones, finalizarEvaluacion, guardarRevision } from "@/actions/evaluaciones";
import {
  enviarObservacionesSupervision,
  guardarSupervision,
  procederSupervision,
} from "@/actions/supervisiones";
import { ConfirmacionEnvio } from "@/components/confirmacion-envio";
import { IndicadorGuardando } from "@/components/indicador-guardando";
import { EvalDetalleColumnas } from "@/components/eval-detalle-head";
import { useAccionOptimista } from "@/lib/use-dato-optimista";
import type { IntencionSupervision } from "@/lib/estado";
import type { ModoEvaluacion } from "@/lib/modo-evaluacion";

type AccionEnvio =
  | "enviar-observaciones-supervisor"
  | "finalizar-evaluacion"
  | "enviar-observaciones-evaluador"
  | "proceder";

type PendienteEnvio = {
  formData: FormData;
  accion: AccionEnvio;
};

export function FormularioEvaluacion({
  asignacionId,
  canEdit,
  modoEvaluacion = "POR_PREGUNTA",
  rolAccion = "evaluador",
  intencionPendiente = null,
  back,
  title,
  meta,
  caso,
  evaluacion,
  supervision,
  headerEvaluacion,
  headerSupervision,
}: {
  asignacionId: string;
  canEdit: boolean;
  modoEvaluacion?: ModoEvaluacion;
  rolAccion?: "evaluador" | "supervisor" | "lectura";
  intencionPendiente?: IntencionSupervision | string | null;
  back: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  caso: React.ReactNode;
  evaluacion: React.ReactNode;
  supervision: React.ReactNode;
  headerEvaluacion?: string;
  headerSupervision?: string;
}) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendienteEnvio, setPendienteEnvio] = useState<PendienteEnvio | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const accion = useAccionOptimista();
  const esGeneral = modoEvaluacion === "GENERAL";
  const esSupervisor = rolAccion === "supervisor";
  const mostrarAcciones = canEdit && rolAccion !== "lectura" && !bloqueado;
  const finalizaAlProceder = intencionPendiente === "FINALIZAR";

  function abrirConfirmacion(formData: FormData, tipo: AccionEnvio) {
    setPendienteEnvio({ formData, accion: tipo });
  }

  function confirmarEnvio() {
    if (!pendienteEnvio) return;
    const { formData, accion: tipo } = pendienteEnvio;
    setPendienteEnvio(null);
    setError(null);
    let persistir: (data: FormData) => Promise<{ error?: string } | { ok: boolean } | void>;
    let mensajeOk = "";
    if (tipo === "enviar-observaciones-supervisor") {
      persistir = enviarObservaciones;
      mensajeOk = "Observaciones enviadas al supervisor.";
    } else if (tipo === "finalizar-evaluacion") {
      persistir = finalizarEvaluacion;
      mensajeOk = "Finalización enviada al supervisor.";
    } else if (tipo === "enviar-observaciones-evaluador") {
      persistir = enviarObservacionesSupervision;
      mensajeOk = "Observaciones enviadas al evaluador.";
    } else {
      persistir = procederSupervision;
      mensajeOk = "Supervisión procedida.";
    }
    setMensaje(mensajeOk);
    setBloqueado(true);
    void accion.ejecutar(() => persistir(formData), {
      onError: (mensajeError) => {
        setMensaje(null);
        setError(mensajeError);
        setBloqueado(false);
      },
    });
  }

  function guardarRevisionActual(
    persistir: (data: FormData) => Promise<{ error?: string } | { ok: boolean } | void>,
    mensajeOk: string,
  ) {
    return (formData: FormData) => {
      setError(null);
      setMensaje(mensajeOk);
      void accion.ejecutar(() => persistir(formData), {
        onError: (mensajeError) => {
          setMensaje(null);
          setError(mensajeError);
        },
      });
    };
  }

  const modalConfirmacion = (() => {
    if (!pendienteEnvio) return null;
    const { accion } = pendienteEnvio;

    if (accion === "enviar-observaciones-supervisor") {
      return {
        title: "¿Enviar a supervisor?",
        confirmLabel: "Enviar a supervisor",
        body: (
          <>
            <p>Las observaciones se enviarán al supervisor.</p>
            <p>No podrás editar hasta que el supervisor las devuelva.</p>
          </>
        ),
      };
    }

    if (accion === "finalizar-evaluacion") {
      return {
        title: "¿Finalizar evaluación?",
        confirmLabel: "Finalizar evaluación",
        body: (
          <>
            <p>La finalización se enviará al supervisor.</p>
            <p>
              {esGeneral
                ? "La observación general debe quedar sin observaciones y con nota si corresponde."
                : "Todas las preguntas deben quedar sin observaciones y con nota si corresponde."}
            </p>
            <p>
              No podrás editar mientras esté en supervisión. Si el supervisor procede, la evaluación
              quedará cerrada.
            </p>
          </>
        ),
      };
    }

    if (accion === "enviar-observaciones-evaluador") {
      return {
        title: "¿Enviar observaciones?",
        confirmLabel: "Enviar observaciones",
        body: (
          <>
            <p>Las observaciones se enviarán al evaluador.</p>
            <p>No podrás seguir editando hasta que el evaluador vuelva a enviar.</p>
          </>
        ),
      };
    }

    if (finalizaAlProceder) {
      return {
        title: "¿Proceder con la finalización?",
        confirmLabel: "Proceder",
        body: (
          <>
            <p>Se cerrará la evaluación.</p>
            <p>El participante y el evaluador no podrán seguir editando.</p>
          </>
        ),
      };
    }

    return {
      title: "¿Proceder con las observaciones?",
      confirmLabel: "Proceder",
      body: (
        <>
          <p>Las observaciones se enviarán al participante, que podrá corregir lo observado.</p>
          <p>Esta supervisión quedará cerrada.</p>
        </>
      ),
    };
  })();

  return (
    <form className="page-workspace grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden">
      <div className="shrink-0 space-y-3 bg-background">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span data-tour="volver">{back}</span>
            <div className="min-w-0 flex-1">{title}</div>
          </div>
          {mostrarAcciones ? (
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              {esSupervisor ? (
                <>
                  <button
                    className="btn btn-sm btn-secondary"
                    data-tour="guardar-revision"
                    type="submit"
                    formAction={guardarRevisionActual(guardarSupervision, "Supervisión guardada.")}
                  >
                    Guardar revisión
                  </button>
                  <button
                    className="btn btn-sm btn-gold"
                    data-tour="enviar-observaciones"
                    type="submit"
                    formAction={(formData) => {
                      abrirConfirmacion(formData, "enviar-observaciones-evaluador");
                    }}
                  >
                    Enviar observaciones
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    data-tour="proceder"
                    type="submit"
                    formAction={(formData) => {
                      abrirConfirmacion(formData, "proceder");
                    }}
                  >
                    Proceder
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-sm btn-secondary"
                    data-tour="guardar-revision"
                    type="submit"
                    formAction={guardarRevisionActual(guardarRevision, "Revisión guardada.")}
                  >
                    Guardar revisión
                  </button>
                  <button
                    className="btn btn-sm btn-gold"
                    data-tour="enviar-supervisor"
                    type="submit"
                    formAction={(formData) => {
                      abrirConfirmacion(formData, "enviar-observaciones-supervisor");
                    }}
                  >
                    Enviar a supervisor
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    type="submit"
                    formAction={(formData) => {
                      abrirConfirmacion(formData, "finalizar-evaluacion");
                    }}
                  >
                    Finalizar evaluación
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
        {meta}
        {mensaje ? <p className="text-emerald-800">{mensaje}</p> : null}
        {error ? <p className="text-danger">{error}</p> : null}
        <IndicadorGuardando visible={accion.guardando} />
      </div>

      <section className="eval-detalle-shell" aria-label="Caso, evaluación y supervisión">
        <input type="hidden" name="asignacionId" value={asignacionId} />
        <EvalDetalleColumnas
          bloqueado={bloqueado}
          casoTitle="Caso"
          casoSubtitle="Respuestas del participante"
          caso={caso}
          evalTitle="Evaluación"
          evalSubtitle={
            headerEvaluacion ?? (esGeneral ? "Revisión de la respuesta" : "Revisión por pregunta")
          }
          evaluacion={evaluacion}
          supTitle="Supervisión"
          supSubtitle={
            headerSupervision ??
            (esGeneral
              ? "Revisión general de la evaluación"
              : "Revisión de la evaluación por pregunta")
          }
          supervision={supervision}
        />
      </section>

      {modalConfirmacion ? (
        <ConfirmacionEnvio
          open
          title={modalConfirmacion.title}
          confirmLabel={modalConfirmacion.confirmLabel}
          confirming={false}
          onCancel={() => setPendienteEnvio(null)}
          onConfirm={confirmarEnvio}
        >
          {modalConfirmacion.body}
        </ConfirmacionEnvio>
      ) : null}
    </form>
  );
}
