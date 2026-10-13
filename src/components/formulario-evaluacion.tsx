"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { AccionesPanelRevision } from "@/components/acciones-revision-botones";
import {
  ProveedorAccionesRevision,
  type AccionEnvioRevision,
} from "@/components/acciones-revision-context";
import { EvalDetalleColumnas } from "@/components/eval-detalle-head";
import { ProveedorVeredictoSupervision } from "@/components/veredicto-supervision-context";
import type { AvisoEntradaCaso as AvisoEntradaCasoDatos } from "@/lib/aviso-entrada-caso";
import {
  aplicarCopiaAlFormulario,
  borrarCopiaLocal,
  debeRestaurarCopiaLocal,
  escribirCopiaLocal,
  esResultadoBorradorOk,
  leerCopiaLocal,
  mensajeErrorEnvio,
  mensajeErrorGuardado,
} from "@/lib/integridad-borrador";
import {
  campoVeredictoIncompleto,
  mensajeVeredictosIncompletos,
  type CampoVeredicto,
  type OpcionesVeredictoIncompleto,
} from "@/lib/veredicto-seleccion";
import { useAccionOptimista } from "@/lib/use-dato-optimista";
import { useAutoguardado } from "@/lib/use-autoguardado";
import type { IntencionSupervision } from "@/lib/estado";
import type { ModoEvaluacion } from "@/lib/modo-evaluacion";

type AccionEnvio = AccionEnvioRevision;

type PendienteEnvio = {
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

function marcarVeredictosPendientes(form: HTMLFormElement, opciones?: OpcionesVeredictoIncompleto) {
  form.querySelectorAll(".is-seleccion-pendiente, .is-comentario-pendiente").forEach((nodo) => {
    nodo.classList.remove("is-seleccion-pendiente", "is-comentario-pendiente");
  });

  const grupos = [...form.querySelectorAll<HTMLElement>("[data-veredicto-opciones]")].filter(
    (grupo) => grupo.dataset.veredictoOpciones,
  );
  const campos = grupos.map((grupo) => ({ grupo, ...leerCampoVeredicto(form, grupo) }));
  const mensaje = mensajeVeredictosIncompletos(campos, opciones);
  if (!mensaje) return null;

  let primero: HTMLElement | null = null;
  for (const campo of campos) {
    const falta = campoVeredictoIncompleto(campo, opciones);
    if (falta === "seleccion") {
      campo.grupo.classList.add("is-seleccion-pendiente");
      primero ??= campo.grupo;
    } else if (falta === "comentario") {
      const name = (campo.grupo.dataset.veredictoOpciones ?? "").replace(
        "veredicto-",
        "comentario-",
      );
      const campoComentario =
        form.querySelector<HTMLElement>(`[name="${CSS.escape(name)}"]`)?.closest<HTMLElement>(".rte") ??
        form.querySelector<HTMLTextAreaElement>(`textarea[name="${CSS.escape(name)}"]`);
      campoComentario?.classList.add("is-comentario-pendiente");
      primero ??= campoComentario ?? campo.grupo;
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
      } else if (nodo.classList.contains("rte")) {
        nodo.querySelector<HTMLElement>(".ProseMirror")?.focus({ preventScroll: true });
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
  versionInicial,
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
  versionInicial: string;
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
  const reportarVeredicto = useCallback((_clave: string, _veredicto: string) => {}, []);
  const mostrarAcciones = canEdit && rolAccion !== "lectura" && !bloqueado;
  const autoguardado = useAutoguardado({
    enabled: mostrarAcciones,
    kind: esSupervisor ? "supervision" : "evaluacion",
    formRef,
    versionInicial,
  });
  const veredictoInicialPanel = (() => {
    if (!esSupervisor || esGeneral) return "";
    const valores = Object.values(veredictosIniciales);
    if (valores.some((valor) => valor === "OBSERVACION")) return "OBSERVACION";
    if (valores.length > 0 && valores.every((valor) => valor === "OK")) return "OK";
    return "";
  })();
  const [veredictoPanel, setVeredictoPanel] = useState(veredictoInicialPanel);
  const finalizaAlProceder = intencionPendiente === "FINALIZAR";
  const conservarCampos = bloqueado || envioModal !== null;
  const camposVisibles = useRef({ caso, evaluacion });
  const restauradoRef = useRef(false);
  if (!conservarCampos) camposVisibles.current = { caso, evaluacion };
  const kindAutoguardado = esSupervisor ? "supervision" : "evaluacion";

  useEffect(() => {
    if (!mostrarAcciones || restauradoRef.current) return;
    const form = formRef.current;
    if (!form) return;
    const storage = typeof sessionStorage !== "undefined" ? sessionStorage : null;
    const copia = leerCopiaLocal(storage, kindAutoguardado, asignacionId);
    if (!copia) return;
    if (
      !debeRestaurarCopiaLocal({
        copiaSavedAt: copia.savedAt,
        serverUpdatedAt: versionInicial,
        versionBase: copia.versionBase,
      })
    ) {
      return;
    }
    restauradoRef.current = true;
    requestAnimationFrame(() => {
      aplicarCopiaAlFormulario(form, copia.fields);
      autoguardado.marcarSucio();
    });
  }, [asignacionId, autoguardado, kindAutoguardado, mostrarAcciones, versionInicial]);

  function datosDelFormulario() {
    return formRef.current ? new FormData(formRef.current) : null;
  }

  function abrirConfirmacion(tipo: AccionEnvio) {
    const form = formRef.current;
    if (!form) return;
    if (tipo !== "proceder") {
      const mensaje = marcarVeredictosPendientes(form, {
        exigirSeleccion: esSupervisor,
        exigirComentarioSiempre: !esSupervisor || tipo === "enviar-observaciones-evaluador",
      });
      if (mensaje) {
        setError(mensaje);
        return;
      }
    }
    setError(null);
    setPendienteEnvio({ accion: tipo });
  }

  function limpiarAvisoSiQuedoCompleto(event: React.SyntheticEvent) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const enOpciones = target.closest("[data-veredicto-opciones]");
    const enComentario =
      (target instanceof HTMLTextAreaElement && target.name.includes("comentario-")) ||
      (target instanceof HTMLInputElement && target.name.includes("comentario-")) ||
      Boolean(target.closest(".rte"));
    if (!enOpciones && !enComentario) return;
    const form = formRef.current;
    if (!form?.querySelector(".is-seleccion-pendiente, .is-comentario-pendiente")) {
      setError(null);
    }
  }

  function confirmarEnvio() {
    if (!pendienteEnvio) return;
    const { accion: tipo } = pendienteEnvio;
    setPendienteEnvio(null);
    setError(null);
    let persistir: (
      data: FormData,
    ) => Promise<{ error?: string; ok?: boolean; updatedAt?: string } | void>;
    let detalleExito: string;
    if (tipo === "enviar-observaciones-supervisor") {
      persistir = enviarObservaciones;
      detalleExito = "El pedido de cambios se envió al supervisor.";
    } else if (tipo === "finalizar-evaluacion") {
      persistir = finalizarEvaluacion;
      detalleExito = "La finalización se envió al supervisor.";
    } else if (tipo === "enviar-observaciones-evaluador") {
      persistir = enviarObservacionesSupervision;
      detalleExito = "El pedido de cambios se envió al evaluador.";
    } else if (finalizaAlProceder) {
      persistir = procederSupervision;
      detalleExito = "La evaluación quedó finalizada y aprobada.";
    } else {
      persistir = procederSupervision;
      detalleExito = "El participante ya puede editar su caso.";
    }
    setDetalleEnvio(detalleExito);
    setEnvioModal("enCurso");
    void (async () => {
      const formData = datosDelFormulario();
      if (!formData) {
        setEnvioModal("error");
        setError(mensajeErrorEnvio({ borradorGuardado: false }));
        return;
      }
      const storage = typeof sessionStorage !== "undefined" ? sessionStorage : null;
      escribirCopiaLocal(storage, kindAutoguardado, asignacionId, {
        versionBase: autoguardado.versionActual(),
        formData,
      });

      const borrador = await autoguardado.esperarAutoguardado({ forzar: true });
      if (!esResultadoBorradorOk(borrador)) {
        setEnvioModal("error");
        setError(mensajeErrorEnvio({ borradorGuardado: false, sinRed: true }));
        return;
      }

      const updatedAtBorrador = borrador.updatedAt;
      autoguardado.pausarFlush(true);
      setBloqueado(true);
      const paraEnviar = datosDelFormulario() ?? formData;
      paraEnviar.set("expectedUpdatedAt", updatedAtBorrador);

      void accion.ejecutar(() => persistir(paraEnviar), {
        mensajeCatch: mensajeErrorEnvio({ borradorGuardado: true }),
        onOk: () => {
          autoguardado.marcarLimpio();
          borrarCopiaLocal(storage, kindAutoguardado, asignacionId);
          setEnvioModal("exito");
        },
        onError: (mensajeError) => {
          autoguardado.pausarFlush(false);
          setEnvioModal("error");
          const yaDiceBorrador =
            mensajeError.includes("borrador") || mensajeError.includes("Se guardó");
          setError(
            yaDiceBorrador ? mensajeError : mensajeErrorEnvio({ borradorGuardado: true }),
          );
          setBloqueado(false);
        },
      });
    })();
  }

  function guardarRevisionActual(
    persistir: (
      data: FormData,
    ) => Promise<{ error?: string; ok?: boolean; updatedAt?: string } | void>,
  ) {
    return () => {
      if (accion.guardando || guardadoModal || envioModal) return;
      setError(null);
      setGuardadoModal("enCurso");
      void (async () => {
        await autoguardado.esperarAutoguardado({ forzar: true });
        const formData = datosDelFormulario();
        if (!formData) {
          setGuardadoModal("error");
          setError(mensajeErrorGuardado());
          return;
        }
        const storage = typeof sessionStorage !== "undefined" ? sessionStorage : null;
        escribirCopiaLocal(storage, kindAutoguardado, asignacionId, {
          versionBase: autoguardado.versionActual(),
          formData,
        });
        formData.set("expectedUpdatedAt", autoguardado.versionActual());
        void accion.ejecutar(() => persistir(formData), {
          mensajeCatch: mensajeErrorGuardado(),
          onOk: (result) => {
            const updatedAt =
              result && typeof result === "object" && "updatedAt" in result
                ? String((result as { updatedAt?: unknown }).updatedAt ?? "")
                : "";
            autoguardado.marcarLimpio(updatedAt || undefined);
            setGuardadoModal("exito");
          },
          onError: (mensajeError) => {
            setGuardadoModal("error");
            setError(mensajeError);
          },
        });
      })();
    };
  }

  const modalConfirmacion = (() => {
    if (!pendienteEnvio) return null;
    const { accion } = pendienteEnvio;

    if (accion === "enviar-observaciones-supervisor") {
      return {
        title: "¿Pedir cambios al participante?",
        confirmLabel: "Pedir cambios al participante",
        body: (
          <>
            <p>Tu comentario se enviará al supervisor.</p>
            <p>Si el supervisor aprueba, el participante podrá editar su caso.</p>
            <p>No podrás editar hasta que el supervisor responda.</p>
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
            <p>La finalización se enviará al supervisor junto con tu comentario.</p>
            <p>
              {esGeneral
                ? "Debes dejar un comentario y una nota si corresponde."
                : "Cada pregunta debe tener un comentario y una nota si corresponde."}
            </p>
            <p>
              Si el supervisor aprueba, el caso de esta evaluación quedará finalizado y aprobado. El
              participante verá tu comentario y no podrá editar.
            </p>
          </>
        ),
      };
    }

    if (accion === "enviar-observaciones-evaluador") {
      return {
        title: "¿Enviar al evaluador?",
        confirmLabel: "Enviar al evaluador",
        body: (
          <>
            <p>Le pides correcciones al evaluador con el comentario que dejaste.</p>
            <p>No podrás seguir editando hasta que el evaluador vuelva a enviar.</p>
          </>
        ),
      };
    }

    if (finalizaAlProceder) {
      return {
        title: "¿Aprobar la finalización?",
        confirmLabel: "Aprobar",
        body: (
          <>
            <p>Se dará por finalizada y aprobada esta evaluación.</p>
            <p>El participante verá el último comentario del evaluador y no podrá editar.</p>
          </>
        ),
      };
    }

    return {
      title: "¿Aprobar los cambios al participante?",
      confirmLabel: "Aprobar",
      body: (
        <>
          <p>El participante recibirá el comentario del evaluador y podrá editar su caso.</p>
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
              <button
                className="btn btn-sm btn-secondary"
                data-tour="guardar-revision"
                type="button"
                disabled={Boolean(guardadoModal) || Boolean(envioModal) || accion.guardando}
                onClick={guardarRevisionActual(esSupervisor ? guardarSupervision : guardarRevision)}
              >
                Guardar borrador
              </button>
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
        <ProveedorAccionesRevision
          value={{
            disabled: Boolean(guardadoModal) || Boolean(envioModal) || accion.guardando,
            esSupervisor,
            esGeneral,
            intencionPendiente: intencionPendiente ?? null,
            veredictoPanel,
            setVeredictoPanel,
            abrirConfirmacion,
          }}
        >
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
              evalAcciones={mostrarAcciones && !esGeneral ? <AccionesPanelRevision /> : null}
            />
          </ProveedorVeredictoSupervision>
        </ProveedorAccionesRevision>
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
          const eraError = envioModal === "error";
          setEnvioModal(null);
          setError(null);
          if (eraError) router.refresh();
        }}
      />
    </form>
  );
}
