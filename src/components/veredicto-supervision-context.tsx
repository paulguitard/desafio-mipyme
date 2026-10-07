"use client";

import { createContext, useContext } from "react";

const VeredictoSupervisionGeneralContext = createContext<(clave: string, veredicto: string) => void>(
  () => {},
);

export function ProveedorVeredictoSupervision({
  children,
  onChange,
}: {
  children: React.ReactNode;
  onChange: (clave: string, veredicto: string) => void;
}) {
  return (
    <VeredictoSupervisionGeneralContext.Provider value={onChange}>
      {children}
    </VeredictoSupervisionGeneralContext.Provider>
  );
}

export function useReportarVeredictoSupervision() {
  return useContext(VeredictoSupervisionGeneralContext);
}
