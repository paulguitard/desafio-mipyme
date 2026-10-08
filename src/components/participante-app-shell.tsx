"use client";

import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { AppShell } from "@/components/app-shell";
import { ANCHO_DETALLE } from "@/lib/ancho-layout";

const ANCHO_HEADER = "max-w-6xl";
const AnchoDetalleContext = createContext<(activo: boolean) => void>(() => {});

export function useAnchoDetalleParticipante(activo: boolean) {
  const setActivo = useContext(AnchoDetalleContext);
  useLayoutEffect(() => {
    setActivo(activo);
    return () => setActivo(false);
  }, [activo, setActivo]);
}

export function ParticipanteAppShell({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  const [detallePaneles, setDetallePaneles] = useState(false);
  const maxWidthClass = detallePaneles ? ANCHO_DETALLE : "max-w-none";
  const headerWidthClass = detallePaneles ? ANCHO_DETALLE : ANCHO_HEADER;

  return (
    <AnchoDetalleContext.Provider value={setDetallePaneles}>
      <AppShell
        className="rol-movil rol-participante"
        tourRole="EMPRENDEDOR"
        maxWidthClass={maxWidthClass}
        header={
          <AppHeader
            title="Panel de participante"
            name={name}
            links={[
              { href: "/participante", label: "Asesorías" },
              { href: "/participante/perfil", label: "Mi Perfil" },
            ]}
            maxWidthClass={headerWidthClass}
          />
        }
      >
        {children}
      </AppShell>
    </AnchoDetalleContext.Provider>
  );
}
