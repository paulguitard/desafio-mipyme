"use client";

import { useRef, useState } from "react";
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
  MAX_FILE_BYTES,
  MAX_IMAGE_INPUT_BYTES,
} from "@/lib/storage/limits";
import { useAccionOptimista } from "@/lib/use-dato-optimista";

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
  layout?: "formulario" | "paneles";
  back: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  avisoEntrada?: AvisoEntradaCasoDatos | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const conPaneles = layout === "paneles";
  const [error, setError] = useState<string | null>(null);
  const [guardadoModal, setGuardadoModal] = useState<EstadoModalProgreso | null>(null);
  const [envioModal, setEnvioModal] = useState<EstadoModalProgreso | null>(null);
  const [pendienteEnvio, setPendienteEnvio] = useState<FormData | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const accion = useAccionOptimista();
  const savingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const camposVisibles = useRef(children);
  const conservarCampos = bloqueado || envioModal === "exito";
  if (!conservarCampos) camposVisibles.current = children;

  function datosDelFormulario() {
    return formRef.current ? new FormData(formRef.current) : null;
  }

  function conGuardado(
    formData: FormData,
    persistir: (formData: FormData) => Promise<{ error?: string } | { ok?: boolean } | void>,
  ) {
    if (savingRef.current) return;
    const adjuntoError = validarAdjuntosCliente(formData);
    if (adjuntoError) {
      setError(adjuntoError);
      return;
    }
    savingRef.current = true;
    setError(null);
    setGuardadoModal("enCurso");
    void accion.ejecutar(() => persistir(formData), {
      onOk: () => {
        limpiarInputsArchivo(formRef.current);
        savingRef.current = false;
        setGuardadoModal("exito");
      },
      onError: (mensajeError) => {
        savingRef.current = false;
        setGuardadoModal("error");
        setError(mensajeError);
      },
    });
  }

  function confirmarEnvio() {
    if (!pendienteEnvio) return;
    const data = pendienteEnvio;
    setPendienteEnvio(null);
    if (savingRef.current) return;
    const adjuntoError = validarAdjuntosCliente(data);
    if (adjuntoError) {
      setError(adjuntoError);
      return;
    }
    savingRef.current = true;
    setError(null);
    setBloqueado(true);
    setEnvioModal("enCurso");
    void accion.ejecutar(() => enviarPostulacion(data), {
      onOk: () => {
        savingRef.current = false;
        setEnvioModal("exito");
      },
      onError: (mensajeError) => {
        savingRef.current = false;
        setEnvioModal("error");
        setError(mensajeError);
        setBloqueado(false);
      },
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={(event) => event.preventDefault()}
      className={
        [
          conPaneles
            ? "page-workspace is-formulario-caso mx-auto grid h-full min-h-0 w-full max-w-7xl grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden"
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
                onClick={() => {
                  const formData = datosDelFormulario();
                  if (!formData) return;
                  conGuardado(formData, guardarBorrador);
                }}
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
                  const formData = datosDelFormulario();
                  if (!formData) return;
                  setPendienteEnvio(formData);
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
        open={pendienteEnvio !== null}
        title={esCorreccion ? "¿Enviar correcciones?" : "¿Enviar caso?"}
        confirmLabel={esCorreccion ? "Enviar correcciones" : "Enviar caso"}
        confirming={false}
        onCancel={() => setPendienteEnvio(null)}
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
          setEnvioModal(null);
          setError(null);
        }}
      />
    </form>
  );
}
