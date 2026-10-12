"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { enviarPostulacion, guardarBorrador } from "@/actions/postulaciones";
import { AvisoEntradaCaso } from "@/components/aviso-entrada-caso";
import { ConfirmacionEnvio } from "@/components/confirmacion-envio";
import { IndicadorGuardando } from "@/components/indicador-guardando";
import {
  ModalGuardado,
  ModalProgreso,
  type EstadoModalProgreso,
} from "@/components/modal-guardado";
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
  MAX_FILE_BYTES,
  MAX_IMAGE_INPUT_BYTES,
} from "@/lib/storage/limits";
import { useAnchoDetalleParticipante } from "@/components/participante-app-shell";
import { ANCHO_DETALLE } from "@/lib/ancho-layout";
import { useAccionOptimista } from "@/lib/use-dato-optimista";
import { useAutoguardado } from "@/lib/use-autoguardado";

function validarAdjuntosCliente(formData: FormData): string | null {
  for (const [key, value] of formData.entries()) {
    if (!(value instanceof File) || value.size <= 0) continue;
    if (key.startsWith("archivo-") && value.size > MAX_FILE_BYTES) {
      return `El archivo "${value.name}" supera el máximo de 2 MB.`;
    }
    if (key.startsWith("imagen-") && value.size > MAX_IMAGE_INPUT_BYTES) {
      return `La imagen "${value.name}" supera el máximo de 10 MB.`;
    }
  }
  return null;
}

function limpiarInputsArchivo(form: HTMLFormElement | null) {
  if (!form) return;
  for (const input of form.querySelectorAll<HTMLInputElement>('input[type="file"]')) {
    input.value = "";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

export function FormularioPostulante({
  postulacionId,
  canEdit,
  esCorreccion,
  versionInicial,
  layout = "formulario",
  back,
  title,
  meta,
  avisoEntrada = null,
  children,
}: {
  postulacionId: string;
  canEdit: boolean;
  esCorreccion: boolean;
  versionInicial: string;
  layout?: "formulario" | "paneles";
  back: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  avisoEntrada?: AvisoEntradaCasoDatos | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const conPaneles = layout === "paneles";
  useAnchoDetalleParticipante(conPaneles);
  const [error, setError] = useState<string | null>(null);
  const [guardadoModal, setGuardadoModal] = useState<EstadoModalProgreso | null>(null);
  const [envioModal, setEnvioModal] = useState<EstadoModalProgreso | null>(null);
  const [pendienteEnvio, setPendienteEnvio] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const accion = useAccionOptimista();
  const savingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const restauradoRef = useRef(false);
  const camposVisibles = useRef(children);
  // Conservar campos también en error de envío: si no, al desbloquear se remontan
  // los children del servidor (aún sin refresh) y se pierde lo escrito en pantalla.
  const conservarCampos = bloqueado || envioModal !== null;
  if (!conservarCampos) camposVisibles.current = children;
  const autoguardado = useAutoguardado({
    enabled: canEdit && !bloqueado,
    kind: "caso",
    formRef,
    versionInicial,
  });

  useEffect(() => {
    if (!canEdit || restauradoRef.current) return;
    const form = formRef.current;
    if (!form) return;
    const storage = typeof sessionStorage !== "undefined" ? sessionStorage : null;
    const copia = leerCopiaLocal(storage, "caso", postulacionId);
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
    // Esperar a que TipTap monte listeners de restauración.
    requestAnimationFrame(() => {
      aplicarCopiaAlFormulario(form, copia.fields);
      autoguardado.marcarSucio();
    });
  }, [autoguardado, canEdit, postulacionId, versionInicial]);

  function datosDelFormulario() {
    return formRef.current ? new FormData(formRef.current) : null;
  }

  function conGuardado(
    persistir: (
      formData: FormData,
    ) => Promise<{ error?: string; ok?: boolean; updatedAt?: string; archivoError?: string } | void>,
  ) {
    if (savingRef.current) return;
    savingRef.current = true;
    setError(null);
    setGuardadoModal("enCurso");
    void (async () => {
      await autoguardado.esperarAutoguardado({ forzar: true });
      const formData = datosDelFormulario();
      if (!formData) {
        savingRef.current = false;
        setGuardadoModal("error");
        setError(mensajeErrorGuardado());
        return;
      }
      const storage = typeof sessionStorage !== "undefined" ? sessionStorage : null;
      escribirCopiaLocal(storage, "caso", postulacionId, {
        versionBase: autoguardado.versionActual(),
        formData,
      });
      formData.set("expectedUpdatedAt", autoguardado.versionActual());
      const adjuntoError = validarAdjuntosCliente(formData);
      if (adjuntoError) {
        savingRef.current = false;
        setGuardadoModal("error");
        setError(adjuntoError);
        return;
      }
      void accion.ejecutar(() => persistir(formData), {
        mensajeCatch: mensajeErrorGuardado(),
        onOk: (result) => {
          const updatedAt =
            result && typeof result === "object" && "updatedAt" in result
              ? String((result as { updatedAt?: unknown }).updatedAt ?? "")
              : "";
          const archivoError =
            result && typeof result === "object" && "archivoError" in result
              ? String((result as { archivoError?: unknown }).archivoError ?? "")
              : "";
          autoguardado.marcarLimpio(updatedAt || undefined);
          if (!archivoError) limpiarInputsArchivo(formRef.current);
          savingRef.current = false;
          if (archivoError) {
            setGuardadoModal("error");
            setError(archivoError);
            return;
          }
          setGuardadoModal("exito");
        },
        onError: (mensajeError) => {
          savingRef.current = false;
          setGuardadoModal("error");
          setError(mensajeError);
        },
      });
    })();
  }

  function confirmarEnvio() {
    if (!pendienteEnvio) return;
    setPendienteEnvio(false);
    if (savingRef.current) return;
    savingRef.current = true;
    setError(null);
    setEnvioModal("enCurso");
    void (async () => {
      const data = datosDelFormulario();
      if (!data) {
        savingRef.current = false;
        setEnvioModal("error");
        setError(mensajeErrorEnvio({ borradorGuardado: false }));
        return;
      }
      const storage = typeof sessionStorage !== "undefined" ? sessionStorage : null;
      escribirCopiaLocal(storage, "caso", postulacionId, {
        versionBase: autoguardado.versionActual(),
        formData: data,
      });

      const adjuntoError = validarAdjuntosCliente(data);
      if (adjuntoError) {
        savingRef.current = false;
        setEnvioModal("error");
        setError(adjuntoError);
        return;
      }

      // Confirmar borrador ANTES de bloquear (el hook sigue activo).
      const borrador = await autoguardado.esperarAutoguardado({ forzar: true });
      if (!esResultadoBorradorOk(borrador)) {
        savingRef.current = false;
        setEnvioModal("error");
        setError(mensajeErrorEnvio({ borradorGuardado: false, sinRed: true }));
        return;
      }

      const updatedAtBorrador = borrador.updatedAt;
      setBloqueado(true);
      const paraEnviar = datosDelFormulario() ?? data;
      paraEnviar.set("expectedUpdatedAt", updatedAtBorrador);

      void accion.ejecutar(() => enviarPostulacion(paraEnviar), {
        mensajeCatch: mensajeErrorEnvio({ borradorGuardado: true }),
        onOk: () => {
          autoguardado.marcarLimpio();
          borrarCopiaLocal(storage, "caso", postulacionId);
          savingRef.current = false;
          setEnvioModal("exito");
        },
        onError: (mensajeError) => {
          savingRef.current = false;
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

  return (
    <form
      ref={formRef}
      onSubmit={(event) => event.preventDefault()}
      className={
        [
          conPaneles
            ? `page-workspace is-formulario-caso mx-auto grid h-full min-h-0 w-full ${ANCHO_DETALLE} grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden`
            : "page-workspace is-formulario-caso mx-auto grid h-full min-h-0 w-full max-w-4xl grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden",
          canEdit && !bloqueado ? "has-acciones-caso" : "",
        ]
          .filter(Boolean)
          .join(" ")
      }
      aria-busy={accion.guardando}
    >
      <div className="shrink-0 space-y-3 bg-background">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span data-tour="volver">{back}</span>
            <div className="min-w-0 flex-1">{title}</div>
          </div>
          {canEdit && !bloqueado ? (
            <div className="formulario-caso-acciones flex shrink-0 flex-wrap justify-end gap-2">
              <button
                className="btn btn-sm btn-secondary"
                data-tour="guardar-borrador"
                type="button"
                disabled={Boolean(guardadoModal) || accion.guardando}
                onClick={() => conGuardado(guardarBorrador)}
              >
                Guardar borrador
              </button>
              <button
                className="btn btn-sm btn-primary"
                data-tour="enviar-caso"
                type="button"
                disabled={Boolean(guardadoModal) || accion.guardando}
                onClick={() => {
                  if (savingRef.current) return;
                  setPendienteEnvio(true);
                }}
              >
                {esCorreccion ? "Enviar correcciones" : "Enviar caso"}
              </button>
            </div>
          ) : null}
        </div>
        {meta}
        {error && guardadoModal !== "error" && envioModal !== "error" ? (
          <p className="text-danger">{error}</p>
        ) : null}
        <IndicadorGuardando visible={accion.guardando && !guardadoModal && !envioModal} />
      </div>
      <div
        className={
          conPaneles
            ? "h-full min-h-0 overflow-hidden"
            : "page-scroll min-h-0 overflow-y-auto overscroll-contain space-y-6 pr-1"
        }
        data-tour={conPaneles ? undefined : "formulario-caso"}
      >
        <div
          className={[
            bloqueado && envioModal !== "exito" ? "pointer-events-none opacity-70" : "",
            conPaneles ? "h-full min-h-0" : "flex flex-col gap-6",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <input type="hidden" name="postulacionId" value={postulacionId} />
          {conservarCampos ? camposVisibles.current : children}
        </div>
      </div>

      <AvisoEntradaCaso aviso={avisoEntrada} />
      <ConfirmacionEnvio
        open={pendienteEnvio}
        title={esCorreccion ? "¿Enviar correcciones?" : "¿Enviar caso?"}
        confirmLabel={esCorreccion ? "Enviar correcciones" : "Enviar caso"}
        confirming={false}
        onCancel={() => setPendienteEnvio(false)}
        onConfirm={confirmarEnvio}
      >
        {esCorreccion ? (
          <>
            <p>Las correcciones se enviarán al evaluador.</p>
            <p>Después no podrás editar hasta que haya nuevas observaciones.</p>
          </>
        ) : (
          <>
            <p>El caso se enviará al evaluador.</p>
            <p>Después no podrás editarlo hasta que haya observaciones.</p>
          </>
        )}
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
        detalleExito={
          esCorreccion
            ? "Las correcciones se enviaron al evaluador."
            : "El caso se envió al evaluador."
        }
        onAceptar={() => {
          if (envioModal === "exito") {
            setEnvioModal(null);
            router.push("/participante");
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
