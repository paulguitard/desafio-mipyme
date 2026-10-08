"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cerrarDialogDesde, Modal } from "@/components/modal";
import {
  reabrirAvisoEntrada,
  type AvisoEntradaCaso as AvisoEntradaCasoDatos,
} from "@/lib/aviso-entrada-caso";

export function AvisoEntradaCaso({ aviso }: { aviso: AvisoEntradaCasoDatos | null }) {
  const pathname = usePathname();
  const [rutaVisitada, setRutaVisitada] = useState(pathname);
  const [cerrado, setCerrado] = useState(false);

  if (reabrirAvisoEntrada(pathname, rutaVisitada)) {
    setRutaVisitada(pathname);
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

  const className = ["modal-aviso-entrada", aviso.claseModal].filter(Boolean).join(" ");

  return (
    <Modal
      open={!cerrado}
      compact
      sinCerrar
      cierreExplicito
      title={aviso.title}
      className={className}
      onClose={() => setCerrado(true)}
    >
      <div className="space-y-4">
        <div className="space-y-3">
          {aviso.parrafos.map((parrafo, index) => (
            <p key={`${index}-${parrafo}`} className="aviso-entrada-texto text-sm leading-relaxed whitespace-pre-wrap">
              {parrafo}
            </p>
          ))}
          {aviso.pasos && aviso.pasos.length > 0 ? (
            <ul className="aviso-entrada-pasos aviso-entrada-texto text-sm leading-relaxed">
              {aviso.pasos.map((paso) => (
                <li key={paso}>{paso}</li>
              ))}
            </ul>
          ) : null}
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
