"use client";

import { useRef, useState } from "react";
import { enviarPostulacion, guardarBorrador } from "@/actions/postulaciones";
import { ConfirmacionEnvio } from "@/components/confirmacion-envio";
import { IndicadorGuardando } from "@/components/indicador-guardando";
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
  children,
}: {
  postulacionId: string;
  canEdit: boolean;
  esCorreccion: boolean;
  layout?: "formulario" | "paneles";
  back: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  const conPaneles = layout === "paneles";
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendienteEnvio, setPendienteEnvio] = useState<FormData | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const accion = useAccionOptimista();
  const savingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  function conGuardado(
    formData: FormData,
    persistir: (formData: FormData) => Promise<{ error?: string } | { ok?: boolean } | void>,
    mensajeOk: string,
    opciones?: { bloquear?: boolean },
  ) {
    if (savingRef.current) return;
    const adjuntoError = validarAdjuntosCliente(formData);
    if (adjuntoError) {
      setError(adjuntoError);
      return;
    }
    savingRef.current = true;
    setError(null);
    setMensaje(mensajeOk);
    if (opciones?.bloquear) setBloqueado(true);
    void accion.ejecutar(() => persistir(formData), {
      onOk: () => {
        limpiarInputsArchivo(formRef.current);
        savingRef.current = false;
      },
      onError: (mensajeError) => {
        savingRef.current = false;
        setMensaje(null);
        setError(mensajeError);
        if (opciones?.bloquear) setBloqueado(false);
      },
    });
  }

  function confirmarEnvio() {
    if (!pendienteEnvio) return;
    const data = pendienteEnvio;
    setPendienteEnvio(null);
    conGuardado(
      data,
      enviarPostulacion,
      esCorreccion ? "Correcciones enviadas." : "Caso enviado.",
      { bloquear: true },
    );
  }

  return (
    <form
      ref={formRef}
      className={
        conPaneles
          ? "page-workspace mx-auto grid h-full min-h-0 w-full max-w-7xl overflow-hidden"
          : "page-workspace mx-auto grid h-full min-h-0 w-full max-w-4xl grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden"
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
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <button
                className="btn btn-sm btn-secondary"
                data-tour="guardar-borrador"
                type="submit"
                formAction={(formData) => {
                  conGuardado(formData, guardarBorrador, "Borrador guardado.");
                }}
              >
                Guardar borrador
              </button>
              <button
                className="btn btn-sm btn-primary"
                data-tour="enviar-caso"
                type="submit"
                formAction={(formData) => {
                  if (savingRef.current) return;
                  setPendienteEnvio(formData);
                }}
              >
                {esCorreccion ? "Enviar correcciones" : "Enviar caso"}
              </button>
            </div>
          ) : null}
        </div>
        {meta}
        {mensaje ? <p className="text-emerald-800">{mensaje}</p> : null}
        {error ? <p className="text-danger">{error}</p> : null}
        <IndicadorGuardando visible={accion.guardando} />
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
          className={
            bloqueado
              ? "pointer-events-none h-full min-h-0 opacity-70"
              : conPaneles
                ? "h-full min-h-0"
                : undefined
          }
        >
          <input type="hidden" name="postulacionId" value={postulacionId} />
          {children}
        </div>
      </div>

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
    </form>
  );
}
