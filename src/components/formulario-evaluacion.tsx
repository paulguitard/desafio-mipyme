"use client";

import { useState } from "react";
import { enviarObservaciones, finalizarEvaluacion, guardarRevision } from "@/actions/evaluaciones";

export function FormularioEvaluacion({
  asignacionId,
  canEdit,
  back,
  title,
  meta,
  children,
}: {
  asignacionId: string;
  canEdit: boolean;
  back: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form className="page-workspace grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden">
      <div className="shrink-0 space-y-3 bg-background">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {back}
            <div className="min-w-0 flex-1">{title}</div>
          </div>
          {canEdit ? (
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
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
                  if (!window.confirm("¿Enviar observaciones al emprendedor?")) return;
                  const result = await enviarObservaciones(formData);
                  if (result?.error) {
                    setError(result.error);
                    setMensaje(null);
                  } else {
                    setError(null);
                    setMensaje("Observaciones enviadas.");
                  }
                }}
              >
                Enviar observaciones
              </button>
              <button
                className="btn btn-sm btn-primary"
                type="submit"
                formAction={async (formData) => {
                  if (!window.confirm("¿Finalizar esta evaluación? Todas las preguntas deben quedar sin observaciones y con nota si corresponde.")) return;
                  const result = await finalizarEvaluacion(formData);
                  if (result?.error) {
                    setError(result.error);
                    setMensaje(null);
                  } else {
                    setError(null);
                    setMensaje("Evaluación finalizada.");
                  }
                }}
              >
                Finalizar evaluación
              </button>
            </div>
          ) : null}
        </div>
        {meta}
        {mensaje ? <p className="text-emerald-800">{mensaje}</p> : null}
        {error ? <p className="text-danger">{error}</p> : null}
      </div>

      <section className="eval-detalle-shell" aria-label="Caso y evaluación">
        <div className="page-scroll eval-detalle-body">
          <input type="hidden" name="asignacionId" value={asignacionId} />
          <div className="eval-detalle-headers">
            <div className="eval-detalle-head is-caso">
              <h2>Caso</h2>
              <p>Respuestas del emprendedor</p>
            </div>
            <div className="eval-detalle-head is-eval">
              <h2>Evaluación</h2>
              <p>Tu revisión por pregunta</p>
            </div>
          </div>
          {children}
        </div>
      </section>
    </form>
  );
}
