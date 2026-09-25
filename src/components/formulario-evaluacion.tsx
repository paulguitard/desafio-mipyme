"use client";

import { useState } from "react";
import { enviarObservaciones, finalizarEvaluacion, guardarRevision } from "@/actions/evaluaciones";
import {
  enviarObservacionesSupervision,
  guardarSupervision,
  procederSupervision,
} from "@/actions/supervisiones";
import { ConfirmacionEnvio } from "@/components/confirmacion-envio";
import type { IntencionSupervision } from "@/lib/estado";
import type { ModoEvaluacion } from "@/lib/modo-evaluacion";

function mensajeAccion(result: { error?: string } | { ok: boolean; error?: undefined } | void | null) {
  if (result && "error" in result && result.error) return result.error;
  return null;
}

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
  children,
  observacionGeneral,
  observacionGeneralSupervision,
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
  children: React.ReactNode;
  observacionGeneral?: React.ReactNode;
  observacionGeneralSupervision?: React.ReactNode;
  headerEvaluacion?: string;
  headerSupervision?: string;
}) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendienteEnvio, setPendienteEnvio] = useState<PendienteEnvio | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const esGeneral = modoEvaluacion === "GENERAL";
  const esSupervisor = rolAccion === "supervisor";
  const mostrarAcciones = canEdit && rolAccion !== "lectura";
  const finalizaAlProceder = intencionPendiente === "FINALIZAR";

  function abrirConfirmacion(formData: FormData, accion: AccionEnvio) {
    if (confirmando) return;
    setPendienteEnvio({ formData, accion });
  }

  async function confirmarEnvio() {
    if (!pendienteEnvio || confirmando) return;
    setConfirmando(true);
    setError(null);
    setMensaje(null);
    try {
      const { formData, accion } = pendienteEnvio;
      let result: { error?: string } | { ok: boolean } | void | null = null;
      let mensajeOk = "";

      if (accion === "enviar-observaciones-supervisor") {
        result = await enviarObservaciones(formData);
        mensajeOk = "Observaciones enviadas al supervisor.";
      } else if (accion === "finalizar-evaluacion") {
        result = await finalizarEvaluacion(formData);
        mensajeOk = "Finalización enviada al supervisor.";
      } else if (accion === "enviar-observaciones-evaluador") {
        result = await enviarObservacionesSupervision(formData);
        mensajeOk = "Observaciones enviadas al evaluador.";
      } else {
        result = await procederSupervision(formData);
        mensajeOk = "Supervisión procedida.";
      }

      const errorAccion = mensajeAccion(result);
      if (errorAccion) {
        setError(errorAccion);
        setPendienteEnvio(null);
        return;
      }
      setMensaje(mensajeOk);
      setPendienteEnvio(null);
    } finally {
      setConfirmando(false);
    }
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
            {back}
            <div className="min-w-0 flex-1">{title}</div>
          </div>
          {mostrarAcciones ? (
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              {esSupervisor ? (
                <>
                  <button
                    className="btn btn-sm btn-secondary"
                    type="submit"
                    disabled={confirmando}
                    formAction={async (formData) => {
                      const result = await guardarSupervision(formData);
                      const errorAccion = mensajeAccion(result);
                      if (errorAccion) {
                        setError(errorAccion);
                        setMensaje(null);
                      } else {
                        setError(null);
                        setMensaje("Supervisión guardada.");
                      }
                    }}
                  >
                    Guardar revisión
                  </button>
                  <button
                    className="btn btn-sm btn-gold"
                    type="submit"
                    disabled={confirmando}
                    formAction={(formData) => {
                      abrirConfirmacion(formData, "enviar-observaciones-evaluador");
                    }}
                  >
                    Enviar observaciones
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    type="submit"
                    disabled={confirmando}
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
                    type="submit"
                    disabled={confirmando}
                    formAction={async (formData) => {
                      const result = await guardarRevision(formData);
                      if (result?.error) {
                        setError(result.error);
                        setMensaje(null);
                      } else {
                        setError(null);
                        setMensaje("Revisión guardada.");
                      }
                    }}
                  >
                    Guardar revisión
                  </button>
                  <button
                    className="btn btn-sm btn-gold"
                    type="submit"
                    disabled={confirmando}
                    formAction={(formData) => {
                      abrirConfirmacion(formData, "enviar-observaciones-supervisor");
                    }}
                  >
                    Enviar a supervisor
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    type="submit"
                    disabled={confirmando}
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
      </div>

      <section className="eval-detalle-shell" aria-label="Caso, evaluación y supervisión">
        <div className={`page-scroll eval-detalle-body is-tres${esGeneral ? " is-general" : ""}`}>
          <input type="hidden" name="asignacionId" value={asignacionId} />
          <div className="eval-detalle-headers">
            <div className="eval-detalle-head is-caso">
              <h2>Caso</h2>
              <p>Respuestas del participante</p>
            </div>
            <div className="eval-detalle-head is-eval">
              <h2>Evaluación</h2>
              <p>
                {headerEvaluacion ??
                  (esGeneral ? "Observación general" : "Revisión por pregunta")}
              </p>
            </div>
            <div className="eval-detalle-head is-sup">
              <h2>Supervisión</h2>
              <p>
                {headerSupervision ??
                  (esGeneral ? "Revisión general de la evaluación" : "Revisión de la evaluación por pregunta")}
              </p>
            </div>
          </div>
          {esGeneral ? (
            <>
              <div className="eval-detalle-cell is-eval is-general-panel">{observacionGeneral}</div>
              <div className="eval-detalle-cell is-sup is-general-panel">
                {observacionGeneralSupervision}
              </div>
              <div className="eval-detalle-caso-stack">{children}</div>
            </>
          ) : (
            children
          )}
        </div>
      </section>

      {modalConfirmacion ? (
        <ConfirmacionEnvio
          open
          title={modalConfirmacion.title}
          confirmLabel={modalConfirmacion.confirmLabel}
          confirming={confirmando}
          onCancel={() => {
            if (!confirmando) setPendienteEnvio(null);
          }}
          onConfirm={confirmarEnvio}
        >
          {modalConfirmacion.body}
        </ConfirmacionEnvio>
      ) : null}
    </form>
  );
}
