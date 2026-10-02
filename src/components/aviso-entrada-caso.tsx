"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import type { AvisoEntradaCaso as AvisoEntradaCasoDatos } from "@/lib/aviso-entrada-caso";

export function AvisoEntradaCaso({ aviso }: { aviso: AvisoEntradaCasoDatos | null }) {
  const [open, setOpen] = useState(Boolean(aviso));
  if (!aviso) return null;

  function cerrar() {
    setOpen(false);
  }

  return (
    <Modal
      open={open}
      compact
      sinCerrar
      title={aviso.title}
      className={aviso.claseModal}
      onClose={cerrar}
    >
      <div className="space-y-4">
        <div className="space-y-3">
          {aviso.parrafos.map((parrafo) => (
            <p key={parrafo} className="aviso-entrada-texto text-sm leading-relaxed whitespace-pre-wrap">
              {parrafo}
            </p>
          ))}
        </div>
        <div className="flex justify-end">
          <button className="btn btn-sm btn-primary" type="button" onClick={cerrar}>
            Aceptar
          </button>
        </div>
      </div>
    </Modal>
  );
}
