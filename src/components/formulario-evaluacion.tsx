"use client";

import { useState } from "react";
import { enviarObservaciones, finalizarEvaluacion, guardarRevision } from "@/actions/evaluaciones";
import {
  enviarObservacionesSupervision,
  guardarSupervision,
  procederSupervision,
} from "@/actions/supervisiones";
import type { ModoEvaluacion } from "@/lib/modo-evaluacion";

function mensajeAccion(result: { error?: string } | { ok: boolean; error?: undefined } | void | null) {
  if (result && "error" in result && result.error) return result.error;
  return null;
}

export function FormularioEvaluacion({
  asignacionId,
  canEdit,
  modoEvaluacion = "POR_PREGUNTA",
  rolAccion = "evaluador",
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
  const esGeneral = modoEvaluacion === "GENERAL";
  const esSupervisor = rolAccion === "supervisor";
  const mostrarAcciones = canEdit && rolAccion !== "lectura";

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
                    formAction={async (formData) => {
                      if (!window.confirm("¿Enviar observaciones al evaluador?")) return;
                      const result = await enviarObservacionesSupervision(formData);
                      const errorAccion = mensajeAccion(result);
                      if (errorAccion) {
                        setError(errorAccion);
                        setMensaje(null);
                      } else {
                        setError(null);
                        setMensaje("Observaciones enviadas al evaluador.");
                      }
                    }}
                  >
                    Enviar observaciones
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    type="submit"
                    formAction={async (formData) => {
                      if (
                        !window.confirm(
                          "¿Proceder? Si el evaluador envió observaciones, irán al emprendedor. Si finalizó, se cerrará esta evaluación.",
                        )
                      ) {
                        return;
                      }
                      const result = await procederSupervision(formData);
                      const errorAccion = mensajeAccion(result);
                      if (errorAccion) {
                        setError(errorAccion);
                        setMensaje(null);
                      } else {
                        setError(null);
                        setMensaje("Supervisión procedida.");
                      }
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
                    formAction={async (formData) => {
                      if (!window.confirm("¿Enviar observaciones al supervisor?")) return;
                      const result = await enviarObservaciones(formData);
                      if (result?.error) {
                        setError(result.error);
                        setMensaje(null);
                      } else {
                        setError(null);
                        setMensaje("Observaciones enviadas al supervisor.");
                      }
                    }}
                  >
                    Enviar observaciones
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    type="submit"
                    formAction={async (formData) => {
                      if (
                        !window.confirm(
                          esGeneral
                            ? "¿Enviar la finalización al supervisor? La observación general debe quedar sin observaciones y con nota si corresponde."
                            : "¿Enviar la finalización al supervisor? Todas las preguntas deben quedar sin observaciones y con nota si corresponde.",
                        )
                      ) {
                        return;
                      }
                      const result = await finalizarEvaluacion(formData);
                      if (result?.error) {
                        setError(result.error);
                        setMensaje(null);
                      } else {
                        setError(null);
                        setMensaje("Finalización enviada al supervisor.");
                      }
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
        <div className="page-scroll eval-detalle-body is-tres">
          <input type="hidden" name="asignacionId" value={asignacionId} />
          <div className="eval-detalle-headers">
            <div className="eval-detalle-head is-caso">
              <h2>Caso</h2>
              <p>Respuestas del emprendedor</p>
            </div>
            <div className="eval-detalle-head is-eval">
              <h2>Evaluación</h2>
              <p>
                {headerEvaluacion ??
                  (esGeneral ? "Notas por pregunta y observación general" : "Revisión por pregunta")}
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
          {children}
          {observacionGeneral || observacionGeneralSupervision ? (
            <article className="eval-detalle-row">
              <div className="eval-detalle-cell is-caso" />
              <div className="eval-detalle-cell is-eval">{observacionGeneral}</div>
              <div className="eval-detalle-cell is-sup">{observacionGeneralSupervision}</div>
            </article>
          ) : null}
        </div>
      </section>
    </form>
  );
}
