"use client";

import { createContext, useContext, type ReactNode } from "react";

const FichaPublicaTokenContext = createContext<string | null>(null);

export function FichaPublicaTokenProvider({
  token,
  children,
}: {
  token: string;
  children: ReactNode;
}) {
  return <FichaPublicaTokenContext.Provider value={token}>{children}</FichaPublicaTokenContext.Provider>;
}

export function useFichaPublicaToken() {
  return useContext(FichaPublicaTokenContext);
}
