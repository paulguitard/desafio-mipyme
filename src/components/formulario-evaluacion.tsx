"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { enviarObservaciones, finalizarEvaluacion, guardarRevision } from "@/actions/evaluaciones";
import {
  enviarObservacionesSupervision,
  guardarSupervision,
  procederSupervision,
} from "@/actions/supervisiones";
import { AvisoEntradaCaso } from "@/components/aviso-entrada-caso";
import { ConfirmacionEnvio } from "@/components/confirmacion-envio";
import { IndicadorGuardando } from "@/components/indicador-guardando";
import {
  ModalGuardado,
  ModalProgreso,
  type EstadoModalProgreso,
} from "@/components/modal-guardado";
import { EvalDetalleColumnas } from "@/components/eval-detalle-head";
import { ProveedorVeredictoSupervision } from "@/components/veredicto-supervision-context";
import type { AvisoEntradaCaso as AvisoEntradaCasoDatos } from "@/lib/aviso-entrada-caso";
import {
  campoVeredictoIncompleto,
  mensajeVeredictosIncompletos,
  type CampoVeredicto,
} from "@/lib/veredicto-seleccion";
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

function leerCampoVeredicto(form: HTMLFormElement, grupo: HTMLElement): CampoVeredicto {
  const name = grupo.dataset.veredictoOpciones ?? "";
  const veredicto =
    form.querySelector<HTMLInputElement>(`input[type="hidden"][name="${CSS.escape(name)}"]`)?.value ??
    "";
  const comentarioName = name.replace("veredicto-", "comentario-");
  const comentario =
    form.querySelector<HTMLTextAreaElement>(`textarea[name="${CSS.escape(comentarioName)}"]`)
      ?.value ??
    form.querySelector<HTMLInputElement>(`input[name="${CSS.escape(comentarioName)}"]`)?.value ??
    "";
  return { veredicto, comentario };
}

function marcarVeredictosPendientes(form: HTMLFormElement) {
  form.querySelectorAll(".is-seleccion-pendiente, .is-comentario-pendiente").forEach((nodo) => {
    nodo.classList.remove("is-seleccion-pendiente", "is-comentario-pendiente");
  });

  const grupos = [...form.querySelectorAll<HTMLElement>("[data-veredicto-opciones]")];
  const campos = grupos.map((grupo) => ({ grupo, ...leerCampoVeredicto(form, grupo) }));
  const mensaje = mensajeVeredictosIncompletos(campos);
  if (!mensaje) return null;

  let primero: HTMLElement | null = null;
  for (const campo of campos) {
    const falta = campoVeredictoIncompleto(campo);
    if (falta === "seleccion") {
      campo.grupo.classList.add("is-seleccion-pendiente");
      primero ??= campo.grupo;
    } else if (falta === "comentario") {
      const name = (campo.grupo.dataset.veredictoOpciones ?? "").replace(
        "veredicto-",
        "comentario-",
      );
      const textarea = form.querySelector<HTMLTextAreaElement>(
        `textarea[name="${CSS.escape(name)}"]`,
      );
      textarea?.classList.add("is-comentario-pendiente");
      primero ??= textarea ?? campo.grupo;
    }
  }

  if (primero) enfocarVeredictoPendiente(primero);
  return mensaje;
}

function asegurarPanelVisible(nodo: HTMLElement) {
  const col = nodo.closest<HTMLElement>(".eval-detalle-col");
  if (!col) return;
  if (col.classList.contains("is-collapsed")) {
    col.querySelector<HTMLButtonElement>(".eval-detalle-collapse")?.click();
  }
  if (getComputedStyle(col).display !== "none") return;
  const panel = col.classList.contains("is-sup")
    ? "supervision"
    : col.classList.contains("is-eval")
      ? "evaluacion"
      : "caso";
  col
    .closest(".eval-detalle-movil")
    ?.querySelector<HTMLButtonElement>(`[data-tour="pestaña-${panel}"]`)
    ?.click();
}

function enfocarVeredictoPendiente(nodo: HTMLElement) {
  asegurarPanelVisible(nodo);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      nodo.scrollIntoView({ behavior: "smooth", block: "center" });
      if (nodo instanceof HTMLTextAreaElement) {
        nodo.focus({ preventScroll: true });
      } else {
        nodo.querySelector("button")?.focus({ preventScroll: true });
      }
    });
  });
}

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
  headerEvaluacion,
  veredictoSupervisionInicial = "",
  veredictosIniciales = {},
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
  headerEvaluacion?: string;
  veredictoSupervisionInicial?: string;
  veredictosIniciales?: Record<string, string>;
  avisoEntrada?: AvisoEntradaCasoDatos | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardadoModal, setGuardadoModal] = useState<EstadoModalProgreso | null>(null);
  const [envioModal, setEnvioModal] = useState<EstadoModalProgreso | null>(null);
  const [detalleEnvio, setDetalleEnvio] = useState<string | null>(null);
  const [pendienteEnvio, setPendienteEnvio] = useState<PendienteEnvio | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const accion = useAccionOptimista();
  const esGeneral = modoEvaluacion === "GENERAL";
  const esSupervisor = rolAccion === "supervisor";
  const [veredictos, setVeredictos] = useState<Record<string, string>>(() =>
    Object.keys(veredictosIniciales).length > 0
      ? veredictosIniciales
      : { general: veredictoSupervisionInicial },
  );
  const reportarVeredicto = useCallback((clave: string, veredicto: string) => {
    setVeredictos((actual) =>
      actual[clave] === veredicto ? actual : { ...actual, [clave]: veredicto },
    );
  }, []);
  const mostrarAcciones = canEdit && rolAccion !== "lectura" && !bloqueado;
  const veredictoGeneral = veredictos.general ?? "";
  const valoresVeredicto = esGeneral
    ? [veredictoGeneral]
    : Object.entries(veredictos)
        .filter(([clave]) => clave !== "general")
        .map(([, valor]) => valor);
  const todosElegidos =
    valoresVeredicto.length > 0 &&
    valoresVeredicto.every((valor) => valor === "OK" || valor === "OBSERVACION");
  const hayObservacion = valoresVeredicto.some((valor) => valor === "OBSERVACION");
  const todosSinObservaciones =
    valoresVeredicto.length > 0 && valoresVeredicto.every((valor) => valor === "OK");
  const puedeEnviarObservaciones = esGeneral ? veredictoGeneral === "OBSERVACION" : todosElegidos && hayObservacion;
  const ocultarDevolverEvaluador = esSupervisor && !puedeEnviarObservaciones;
  const ocultarProceder = esSupervisor && !todosSinObservaciones;
  const ocultarEnviarSupervisor = !esSupervisor && !puedeEnviarObservaciones;
  const ocultarFinalizar = !esSupervisor && !todosSinObservaciones;
  const finalizaAlProceder = intencionPendiente === "FINALIZAR";
  const conservarCampos = bloqueado || envioModal === "exito";
  const camposVisibles = useRef({ caso, evaluacion });
  if (!conservarCampos) camposVisibles.current = { caso, evaluacion };

  function datosDelFormulario() {
    return formRef.current ? new FormData(formRef.current) : null;
  }

  function abrirConfirmacion(tipo: AccionEnvio) {
    const form = formRef.current;
    const formData = datosDelFormulario();
    if (!form || !formData) return;
    const mensaje = marcarVeredictosPendientes(form);
    if (mensaje) {
      setError(mensaje);
      return;
    }
    setError(null);
    setPendienteEnvio({ formData, accion: tipo });
  }

  function limpiarAvisoSiQuedoCompleto(event: React.SyntheticEvent) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const enOpciones = target.closest("[data-veredicto-opciones]");
    const enComentario =
      target instanceof HTMLTextAreaElement && target.name.includes("comentario-");
    if (!enOpciones && !enComentario) return;
    const form = formRef.current;
    if (!form?.querySelector(".is-seleccion-pendiente, .is-comentario-pendiente")) {
      setError(null);
    }
  }

  function confirmarEnvio() {
    if (!pendienteEnvio) return;
    const { formData, accion: tipo } = pendienteEnvio;
    setPendienteEnvio(null);
    setError(null);
    let persistir: (data: FormData) => Promise<{ error?: string } | { ok: boolean } | void>;
    let detalleExito: string;
    if (tipo === "enviar-observaciones-supervisor") {
      persistir = enviarObservaciones;
      detalleExito = "Las observaciones se enviaron al supervisor.";
    } else if (tipo === "finalizar-evaluacion") {
      persistir = finalizarEvaluacion;
      detalleExito = "La finalización se envió al supervisor.";
    } else if (tipo === "enviar-observaciones-evaluador") {
      persistir = enviarObservacionesSupervision;
      detalleExito = "Las observaciones se enviaron al evaluador.";
    } else if (finalizaAlProceder) {
      persistir = procederSupervision;
      detalleExito = "La evaluación quedó cerrada.";
    } else {
      persistir = procederSupervision;
      detalleExito = "Las observaciones se enviaron al participante.";
    }
    setBloqueado(true);
    setDetalleEnvio(detalleExito);
    setEnvioModal("enCurso");
    void accion.ejecutar(() => persistir(formData), {
      onOk: () => {
        setEnvioModal("exito");
      },
      onError: (mensajeError) => {
        setEnvioModal("error");
        setError(mensajeError);
        setBloqueado(false);
      },
    });
  }

  function guardarRevisionActual(
    persistir: (data: FormData) => Promise<{ error?: string } | { ok: boolean } | void>,
  ) {
    return () => {
      if (accion.guardando || guardadoModal || envioModal) return;
      const formData = datosDelFormulario();
      if (!formData) return;
      setError(null);
      setGuardadoModal("enCurso");
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
      onClick={limpiarAvisoSiQuedoCompleto}
      onChange={limpiarAvisoSiQuedoCompleto}
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
                    disabled={Boolean(guardadoModal) || Boolean(envioModal) || accion.guardando}
                    onClick={guardarRevisionActual(guardarSupervision)}
                  >
                    Guardar revisión
                  </button>
                  {ocultarDevolverEvaluador ? null : (
                    <button
                      className="btn btn-sm btn-gold"
                      data-tour="enviar-observaciones"
                      type="button"
                      disabled={Boolean(guardadoModal) || Boolean(envioModal) || accion.guardando}
                      onClick={() => abrirConfirmacion("enviar-observaciones-evaluador")}
                    >
                      Enviar observaciones
                    </button>
                  )}
                  {ocultarProceder ? null : (
                    <button
                      className="btn btn-sm btn-primary"
                      data-tour="proceder"
                      type="button"
                      disabled={Boolean(guardadoModal) || Boolean(envioModal) || accion.guardando}
                      onClick={() => abrirConfirmacion("proceder")}
                    >
                      Proceder
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    className="btn btn-sm btn-secondary"
                    data-tour="guardar-revision"
                    type="button"
                    disabled={Boolean(guardadoModal) || Boolean(envioModal) || accion.guardando}
                    onClick={guardarRevisionActual(guardarRevision)}
                  >
                    Guardar revisión
                  </button>
                  {ocultarEnviarSupervisor ? null : (
                    <button
                      className="btn btn-sm btn-gold"
                      data-tour="enviar-supervisor"
                      type="button"
                      disabled={Boolean(guardadoModal) || Boolean(envioModal) || accion.guardando}
                      onClick={() => abrirConfirmacion("enviar-observaciones-supervisor")}
                    >
                      Enviar a supervisor
                    </button>
                  )}
                  {ocultarFinalizar ? null : (
                    <button
                      className="btn btn-sm btn-primary"
                      data-tour="finalizar-evaluacion"
                      type="button"
                      disabled={Boolean(guardadoModal) || Boolean(envioModal) || accion.guardando}
                      onClick={() => abrirConfirmacion("finalizar-evaluacion")}
                    >
                      Finalizar evaluación
                    </button>
                  )}
                </>
              )}
            </div>
          ) : null}
        </div>
        {meta}
        {error && guardadoModal !== "error" && envioModal !== "error" ? (
          <p className="text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <IndicadorGuardando visible={accion.guardando && !guardadoModal && !envioModal} />
      </div>

      <section className="eval-detalle-shell h-full min-h-0" aria-label="Caso, evaluación y supervisión">
        <input type="hidden" name="asignacionId" value={asignacionId} />
        <ProveedorVeredictoSupervision onChange={reportarVeredicto}>
          <EvalDetalleColumnas
            sinSupervision
            bloqueado={bloqueado && envioModal !== "exito"}
            casoTitle="Caso"
            casoSubtitle="Respuestas del participante"
            caso={conservarCampos ? camposVisibles.current.caso : caso}
            evalTitle="Evaluación y Supervisión"
            evalSubtitle={
              headerEvaluacion ??
              (esGeneral ? "Comentario del caso" : "Comentarios por pregunta")
            }
            evaluacion={conservarCampos ? camposVisibles.current.evaluacion : evaluacion}
          />
        </ProveedorVeredictoSupervision>
      </section>

      <AvisoEntradaCaso aviso={avisoEntrada} />
      <ConfirmacionEnvio
        open={modalConfirmacion !== null}
        title={modalConfirmacion?.title ?? ""}
        confirmLabel={modalConfirmacion?.confirmLabel}
        confirming={false}
        onCancel={() => setPendienteEnvio(null)}
        onConfirm={confirmarEnvio}
      >
        {modalConfirmacion?.body}
      </ConfirmacionEnvio>
      <ModalGuardado
        open={guardadoModal !== null}
        estado={guardadoModal ?? "enCurso"}
        error={error}
        onAceptar={() => {
          setGuardadoModal(null);
          if (guardadoModal === "error") setError(null);
        }}
      />
      <ModalProgreso
        open={envioModal !== null}
        estado={envioModal ?? "enCurso"}
        variante="enviar"
        error={error}
        detalleExito={detalleEnvio}
        onAceptar={() => {
          if (envioModal === "exito") {
            setEnvioModal(null);
            router.push("/evaluador");
            return;
          }
          setEnvioModal(null);
          setError(null);
        }}
      />
    </form>
  );
}
