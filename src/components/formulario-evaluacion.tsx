"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { enviarObservaciones, finalizarEvaluacion, guardarRevision } from "@/actions/evaluaciones";
import {
  enviarObservacionesSupervision,
  guardarSupervision,
  procederSupervision,
} from "@/actions/supervisiones";
import { AvisoEntradaCaso } from "@/components/aviso-entrada-caso";
import { ConfirmacionEnvio } from "@/components/confirmacion-envio";
import { EnvioExitoso } from "@/components/envio-exitoso";
import { IndicadorGuardando } from "@/components/indicador-guardando";
import { ModalGuardado, type EstadoModalGuardado } from "@/components/modal-guardado";
import { EvalDetalleColumnas } from "@/components/eval-detalle-head";
import type { AvisoEntradaCaso as AvisoEntradaCasoDatos } from "@/lib/aviso-entrada-caso";
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
  avisoEntrada = null,
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
  avisoEntrada?: AvisoEntradaCasoDatos | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardadoModal, setGuardadoModal] = useState<EstadoModalGuardado | null>(null);
  const [pendienteEnvio, setPendienteEnvio] = useState<PendienteEnvio | null>(null);
  const [exito, setExito] = useState<{ title: string; detalle: string } | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const accion = useAccionOptimista();
  const esGeneral = modoEvaluacion === "GENERAL";
  const esSupervisor = rolAccion === "supervisor";
  const mostrarAcciones = canEdit && rolAccion !== "lectura" && !bloqueado;
  const finalizaAlProceder = intencionPendiente === "FINALIZAR";
  const conservarCampos = bloqueado || exito !== null;
  const camposVisibles = useRef({ caso, evaluacion, supervision });
  if (!conservarCampos) camposVisibles.current = { caso, evaluacion, supervision };

  function datosDelFormulario() {
    return formRef.current ? new FormData(formRef.current) : null;
  }

  function abrirConfirmacion(tipo: AccionEnvio) {
    const formData = datosDelFormulario();
    if (!formData) return;
    setPendienteEnvio({ formData, accion: tipo });
  }

  function confirmarEnvio() {
    if (!pendienteEnvio) return;
    const { formData, accion: tipo } = pendienteEnvio;
    setPendienteEnvio(null);
    setError(null);
    let persistir: (data: FormData) => Promise<{ error?: string } | { ok: boolean } | void>;
    let exitoEnvio: { title: string; detalle: string };
    if (tipo === "enviar-observaciones-supervisor") {
      persistir = enviarObservaciones;
      exitoEnvio = {
        title: "Enviado al supervisor",
        detalle: "Las observaciones se enviaron al supervisor.",
      };
    } else if (tipo === "finalizar-evaluacion") {
      persistir = finalizarEvaluacion;
      exitoEnvio = {
        title: "Finalización enviada",
        detalle: "La finalización se envió al supervisor.",
      };
    } else if (tipo === "enviar-observaciones-evaluador") {
      persistir = enviarObservacionesSupervision;
      exitoEnvio = {
        title: "Observaciones enviadas al evaluador",
        detalle: "Las observaciones se enviaron al evaluador.",
      };
    } else if (finalizaAlProceder) {
      persistir = procederSupervision;
      exitoEnvio = {
        title: "Evaluación finalizada",
        detalle: "La evaluación quedó cerrada.",
      };
    } else {
      persistir = procederSupervision;
      exitoEnvio = {
        title: "Observaciones enviadas",
        detalle: "Las observaciones se enviaron al participante.",
      };
    }
    setBloqueado(true);
    void accion.ejecutar(() => persistir(formData), {
      onOk: () => {
        setExito(exitoEnvio);
      },
      onError: (mensajeError) => {
        setError(mensajeError);
        setBloqueado(false);
      },
    });
  }

  function guardarRevisionActual(
    persistir: (data: FormData) => Promise<{ error?: string } | { ok: boolean } | void>,
  ) {
    return () => {
      if (accion.guardando || guardadoModal) return;
      const formData = datosDelFormulario();
      if (!formData) return;
      setError(null);
      setGuardadoModal("guardando");
      void accion.ejecutar(() => persistir(formData), {
        onOk: () => {
          setGuardadoModal("exito");
        },
        onError: (mensajeError) => {
          setGuardadoModal("error");
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
    <form
      ref={formRef}
      onSubmit={(event) => event.preventDefault()}
      className={`page-workspace is-formulario-caso grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden${
        mostrarAcciones ? " has-acciones-caso" : ""
      }`}
    >
      <div className="shrink-0 space-y-3 bg-background">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span data-tour="volver">{back}</span>
            <div className="min-w-0 flex-1">{title}</div>
          </div>
          {mostrarAcciones ? (
            <div className="formulario-caso-acciones flex shrink-0 flex-nowrap justify-end gap-2">
              {esSupervisor ? (
                <>
                  <button
                    className="btn btn-sm btn-secondary"
                    data-tour="guardar-revision"
                    type="button"
                    disabled={Boolean(guardadoModal) || accion.guardando}
                    onClick={guardarRevisionActual(guardarSupervision)}
                  >
                    Guardar revisión
                  </button>
                  <button
                    className="btn btn-sm btn-gold"
                    data-tour="enviar-observaciones"
                    type="button"
                    disabled={Boolean(guardadoModal) || accion.guardando}
                    onClick={() => abrirConfirmacion("enviar-observaciones-evaluador")}
                  >
                    Enviar observaciones
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    data-tour="proceder"
                    type="button"
                    disabled={Boolean(guardadoModal) || accion.guardando}
                    onClick={() => abrirConfirmacion("proceder")}
                  >
                    Proceder
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-sm btn-secondary"
                    data-tour="guardar-revision"
                    type="button"
                    disabled={Boolean(guardadoModal) || accion.guardando}
                    onClick={guardarRevisionActual(guardarRevision)}
                  >
                    Guardar revisión
                  </button>
                  <button
                    className="btn btn-sm btn-gold"
                    data-tour="enviar-supervisor"
                    type="button"
                    disabled={Boolean(guardadoModal) || accion.guardando}
                    onClick={() => abrirConfirmacion("enviar-observaciones-supervisor")}
                  >
                    Enviar a supervisor
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    data-tour="finalizar-evaluacion"
                    type="button"
                    disabled={Boolean(guardadoModal) || accion.guardando}
                    onClick={() => abrirConfirmacion("finalizar-evaluacion")}
                  >
                    Finalizar evaluación
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
        {meta}
        {error && guardadoModal !== "error" ? <p className="text-danger">{error}</p> : null}
        <IndicadorGuardando visible={accion.guardando && !guardadoModal} />
      </div>

      <section className="eval-detalle-shell h-full min-h-0" aria-label="Caso, evaluación y supervisión">
        <input type="hidden" name="asignacionId" value={asignacionId} />
        <EvalDetalleColumnas
          bloqueado={bloqueado && !exito}
          casoTitle="Caso"
          casoSubtitle="Respuestas del participante"
          caso={conservarCampos ? camposVisibles.current.caso : caso}
          evalTitle="Evaluación"
          evalSubtitle={
            headerEvaluacion ?? (esGeneral ? "Revisión de la respuesta" : "Revisión por pregunta")
          }
          evaluacion={conservarCampos ? camposVisibles.current.evaluacion : evaluacion}
          supTitle="Supervisión"
          supSubtitle={
            headerSupervision ??
            (esGeneral
              ? "Revisión general de la evaluación"
              : "Revisión de la evaluación por pregunta")
          }
          supervision={conservarCampos ? camposVisibles.current.supervision : supervision}
        />
      </section>

      <AvisoEntradaCaso aviso={avisoEntrada} />
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
      <ModalGuardado
        open={guardadoModal !== null}
        estado={guardadoModal ?? "guardando"}
        error={error}
        onAceptar={() => {
          setGuardadoModal(null);
          if (guardadoModal === "error") setError(null);
        }}
      />
      <EnvioExitoso
        open={exito !== null}
        title={exito?.title ?? ""}
        detalle={exito?.detalle}
        onAceptar={() => router.push("/evaluador")}
      />
    </form>
  );
}
