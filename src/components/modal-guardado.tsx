"use client";

import { Modal } from "@/components/modal";

export type EstadoModalProgreso = "enCurso" | "exito" | "error";
export type EstadoModalGuardado = EstadoModalProgreso;
export type VarianteModalProgreso = "guardar" | "enviar";

const COPY: Record<
  VarianteModalProgreso,
  {
    tituloEnCurso: string;
    tituloExito: string;
    tituloError: string;
    detalleEnCurso: string;
    detalleExito: string;
    errorFallback: string;
  }
> = {
  guardar: {
    tituloEnCurso: "Guardando...",
    tituloExito: "Guardado exitosamente",
    tituloError: "No se pudo guardar",
    detalleEnCurso: "Espera un momento, estamos guardando tu avance.",
    detalleExito: "Tu avance quedó guardado.",
    errorFallback: "No se pudo guardar.",
  },
  enviar: {
    tituloEnCurso: "Enviando...",
    tituloExito: "Enviado con éxito",
    tituloError: "No se pudo enviar",
    detalleEnCurso: "Espera un momento, estamos enviando.",
    detalleExito: "El envío se completó.",
    errorFallback: "No se pudo enviar.",
  },
};

export function ModalProgreso({
  open,
  estado,
  variante,
  error,
  detalleExito,
  onAceptar,
}: {
  open: boolean;
  estado: EstadoModalProgreso;
  variante: VarianteModalProgreso;
  error?: string | null;
  detalleExito?: string | null;
  onAceptar: () => void;
}) {
  const copy = COPY[variante];
  const enCurso = estado === "enCurso";
  const title =
    estado === "enCurso" ? copy.tituloEnCurso : estado === "exito" ? copy.tituloExito : copy.tituloError;

  return (
    <Modal
      open={open}
      compact
      sinCerrar
      title={title}
      onClose={() => {
        if (!enCurso) onAceptar();
      }}
    >
      <div className="space-y-4">
        {enCurso ? (
          <div className="flex flex-col items-center gap-3 py-2" role="status" aria-live="polite">
            <span className="modal-guardado-spinner" aria-hidden="true" />
            <p className="text-sm text-muted">{copy.detalleEnCurso}</p>
          </div>
        ) : (
          <>
            {estado === "error" ? (
              <p className="text-sm leading-relaxed text-danger">{error ?? copy.errorFallback}</p>
            ) : (
              <p className="text-sm leading-relaxed">{detalleExito ?? copy.detalleExito}</p>
            )}
            <div className="flex justify-end">
              <button className="btn btn-sm btn-primary" type="button" onClick={onAceptar}>
                Aceptar
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export function ModalGuardado({
  open,
  estado,
  error,
  onAceptar,
}: {
  open: boolean;
  estado: EstadoModalProgreso;
  error?: string | null;
  onAceptar: () => void;
}) {
  return (
    <ModalProgreso
      open={open}
      estado={estado}
      variante="guardar"
      error={error}
      onAceptar={onAceptar}
    />
  );
}
