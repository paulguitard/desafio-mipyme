"use client";

import { createContext, useContext, type ReactNode } from "react";

export type AccionEnvioRevision =
  | "enviar-observaciones-supervisor"
  | "finalizar-evaluacion"
  | "enviar-observaciones-evaluador"
  | "proceder";

export type AccionesRevisionValor = {
  disabled: boolean;
  esSupervisor: boolean;
  esGeneral: boolean;
  intencionPendiente: string | null;
  veredictoPanel: string;
  setVeredictoPanel: (valor: "OK" | "OBSERVACION") => void;
  abrirConfirmacion: (accion: AccionEnvioRevision) => void;
};

const AccionesRevisionContext = createContext<AccionesRevisionValor | null>(null);

export function ProveedorAccionesRevision({
  value,
  children,
}: {
  value: AccionesRevisionValor;
  children: ReactNode;
}) {
  return <AccionesRevisionContext.Provider value={value}>{children}</AccionesRevisionContext.Provider>;
}

export function useAccionesRevision() {
  return useContext(AccionesRevisionContext);
}
