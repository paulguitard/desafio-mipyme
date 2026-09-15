"use client";

import { useState } from "react";
import { enviarPostulacion, guardarBorrador } from "@/actions/postulaciones";
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
                  const adjuntoError = validarAdjuntosCliente(formData);
                  if (adjuntoError) {
                    setError(adjuntoError);
                    setMensaje(null);
                    return;
                  }
                  const result = await guardarBorrador(formData);
                  if (result?.error) {
                    setError(result.error);
                    setMensaje(null);
                  } else {
                    setError(null);
                    setMensaje("Borrador guardado.");
                  }
                }}
              >
                Guardar borrador
              </button>
              <button
                className="btn btn-sm btn-primary"
                type="submit"
                formAction={async (formData) => {
                  if (
                    !window.confirm(
                      esCorreccion
                        ? "¿Enviar las correcciones al evaluador?"
                        : "¿Enviar este caso? Después no podrás editarlo hasta que haya observaciones.",
                    )
                  ) {
                    return;
                  }
                  const adjuntoError = validarAdjuntosCliente(formData);
                  if (adjuntoError) {
                    setError(adjuntoError);
                    setMensaje(null);
                    return;
                  }
                  const result = await enviarPostulacion(formData);
                  if (result?.error) {
                    setError(result.error);
                    setMensaje(null);
                  } else {
                    setError(null);
                    setMensaje(esCorreccion ? "Correcciones enviadas." : "Caso enviado.");
                  }
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
      </div>
      <div className="page-scroll min-h-0 overflow-y-auto overscroll-contain space-y-6 pr-1">
        <input type="hidden" name="postulacionId" value={postulacionId} />
        {children}
      </div>
    </form>
  );
}
