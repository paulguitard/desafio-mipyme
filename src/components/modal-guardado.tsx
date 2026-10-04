"use client";

import { Modal } from "@/components/modal";

export type EstadoModalGuardado = "guardando" | "exito" | "error";

export function ModalGuardado({
  open,
  estado,
  error,
  onAceptar,
}: {
  open: boolean;
  estado: EstadoModalGuardado;
  error?: string | null;
  onAceptar: () => void;
}) {
  const guardando = estado === "guardando";
  const title =
    estado === "guardando"
      ? "Guardando..."
      : estado === "exito"
        ? "Guardado exitosamente"
        : "No se pudo guardar";

  return (
    <Modal
      open={open}
      compact
      sinCerrar
      title={title}
      onClose={() => {
        if (!guardando) onAceptar();
      }}
    >
      <div className="space-y-4">
        {guardando ? (
          <div className="flex flex-col items-center gap-3 py-2" role="status" aria-live="polite">
            <span className="modal-guardado-spinner" aria-hidden="true" />
            <p className="text-sm text-muted">Espera un momento, estamos guardando tu avance.</p>
          </div>
        ) : (
          <>
            {estado === "error" ? (
              <p className="text-sm leading-relaxed text-danger">{error ?? "No se pudo guardar."}</p>
            ) : (
              <p className="text-sm leading-relaxed">Tu avance quedó guardado.</p>
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
