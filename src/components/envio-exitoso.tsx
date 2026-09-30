"use client";

import { Modal } from "@/components/modal";

export function EnvioExitoso({
  open,
  title,
  detalle,
  onAceptar,
}: {
  open: boolean;
  title: string;
  detalle?: string;
  onAceptar: () => void;
}) {
  return (
    <Modal open={open} compact sinCerrar title={title} onClose={onAceptar}>
      <div className="space-y-4">
        {detalle ? <p className="text-sm leading-relaxed">{detalle}</p> : null}
        <div className="flex justify-end">
          <button className="btn btn-sm btn-primary" type="button" onClick={onAceptar}>
            Aceptar
          </button>
        </div>
      </div>
    </Modal>
  );
}
