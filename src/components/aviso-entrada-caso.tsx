"use client";

import { useEffect, useState } from "react";
import { cerrarDialogDesde, Modal } from "@/components/modal";
import type { AvisoEntradaCaso as AvisoEntradaCasoDatos } from "@/lib/aviso-entrada-caso";

function firmaAviso(aviso: AvisoEntradaCasoDatos | null) {
  if (!aviso) return "";
  return `${aviso.title}\n${aviso.parrafos.join("\n")}`;
}

export function AvisoEntradaCaso({ aviso }: { aviso: AvisoEntradaCasoDatos | null }) {
  const firma = firmaAviso(aviso);
  const [firmaAbierta, setFirmaAbierta] = useState(firma);
  const [cerrado, setCerrado] = useState(false);

  if (firma !== firmaAbierta) {
    setFirmaAbierta(firma);
    setCerrado(false);
  }

  useEffect(() => {
    function alVolver(event: PageTransitionEvent) {
      if (event.persisted) setCerrado(false);
    }
    window.addEventListener("pageshow", alVolver);
    return () => window.removeEventListener("pageshow", alVolver);
  }, []);

  if (!aviso) return null;

  return (
    <Modal
      open={!cerrado}
      compact
      sinCerrar
      cierreExplicito
      title={aviso.title}
      className={aviso.claseModal}
      onClose={() => setCerrado(true)}
    >
      <div className="space-y-4">
        <div className="space-y-3">
          {aviso.parrafos.map((parrafo, index) => (
            <p key={`${index}-${parrafo}`} className="aviso-entrada-texto text-sm leading-relaxed whitespace-pre-wrap">
              {parrafo}
            </p>
          ))}
        </div>
        <div className="flex justify-end">
          <button
            className="btn btn-sm btn-primary"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              cerrarDialogDesde(event.currentTarget);
              setCerrado(true);
            }}
          >
            Aceptar
          </button>
        </div>
      </div>
    </Modal>
  );
}
