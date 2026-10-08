"use client";

import type { ReactNode } from "react";
import { Modal } from "@/components/modal";

export function ConfirmacionEnvio({
  open,
  title,
  children,
  confirmLabel = "Confirmar envío",
  confirming = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  confirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <Modal
      open={open}
      compact
      sinCerrar
      className="modal-accion-caso"
      title={title}
      onClose={() => {
        if (!confirming) onCancel();
      }}
    >
      <div className="space-y-4">
        <div className="modal-accion-caso-texto space-y-2 text-sm leading-relaxed">{children}</div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            className="btn btn-sm btn-secondary"
            type="button"
            disabled={confirming}
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            className="btn btn-sm btn-primary"
            type="button"
            disabled={confirming}
            onClick={() => void onConfirm()}
          >
            {confirming ? "Enviando…" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
