"use client";

import { useRef, useState } from "react";
import { enviarPostulacion, guardarBorrador } from "@/actions/postulaciones";
import { ConfirmacionEnvio } from "@/components/confirmacion-envio";
import {
  MAX_FILE_BYTES,
  MAX_IMAGE_INPUT_BYTES,
} from "@/lib/storage/limits";

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
  }
}

export function FormularioPostulante({
  postulacionId,
  canEdit,
  esCorreccion,
  back,
  title,
  meta,
  children,
}: {
  postulacionId: string;
  canEdit: boolean;
  esCorreccion: boolean;
  back: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendienteEnvio, setPendienteEnvio] = useState<FormData | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const savingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function conGuardado(
    formData: FormData,
    accion: (formData: FormData) => Promise<{ error?: string } | { ok?: boolean } | void>,
    mensajeOk: string,
  ) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    setMensaje(null);
    try {
      const adjuntoError = validarAdjuntosCliente(formData);
      if (adjuntoError) {
        setError(adjuntoError);
        return;
      }
      const result = await accion(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      limpiarInputsArchivo(formRef.current);
      setMensaje(mensajeOk);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function confirmarEnvio() {
    if (!pendienteEnvio || confirmando) return;
    setConfirmando(true);
    try {
      await conGuardado(
        pendienteEnvio,
        enviarPostulacion,
        esCorreccion ? "Correcciones enviadas." : "Caso enviado.",
      );
      setPendienteEnvio(null);
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <form
      ref={formRef}
      className="page-workspace mx-auto grid h-full min-h-0 w-full max-w-4xl grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden"
      aria-busy={saving}
    >
      <div className="shrink-0 space-y-3 bg-background">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span data-tour="volver">{back}</span>
            <div className="min-w-0 flex-1">{title}</div>
          </div>
          {canEdit ? (
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <button
                className="btn btn-sm btn-secondary"
                data-tour="guardar-borrador"
                type="submit"
                disabled={saving || confirmando}
                formAction={async (formData) => {
                  await conGuardado(formData, guardarBorrador, "Borrador guardado.");
                }}
              >
                {saving ? "Guardando…" : "Guardar borrador"}
              </button>
              <button
                className="btn btn-sm btn-primary"
                data-tour="enviar-caso"
                type="submit"
                disabled={saving || confirmando}
                formAction={(formData) => {
                  if (savingRef.current || confirmando) return;
                  setPendienteEnvio(formData);
                }}
              >
                {saving
                  ? "Guardando…"
                  : esCorreccion
                    ? "Enviar correcciones"
                    : "Enviar caso"}
              </button>
            </div>
          ) : null}
        </div>
        {meta}
        {mensaje ? <p className="text-emerald-800">{mensaje}</p> : null}
        {error ? <p className="text-danger">{error}</p> : null}
      </div>
      <div
        className="page-scroll min-h-0 overflow-y-auto overscroll-contain space-y-6 pr-1"
        data-tour="formulario-caso"
      >
        <input type="hidden" name="postulacionId" value={postulacionId} />
        {children}
      </div>

      <ConfirmacionEnvio
        open={pendienteEnvio !== null}
        title={esCorreccion ? "¿Enviar correcciones?" : "¿Enviar caso?"}
        confirmLabel={esCorreccion ? "Enviar correcciones" : "Enviar caso"}
        confirming={confirmando}
        onCancel={() => {
          if (!confirmando) setPendienteEnvio(null);
        }}
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
