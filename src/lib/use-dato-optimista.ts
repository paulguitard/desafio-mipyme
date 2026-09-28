"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function errorDeResultado(result: unknown): string | null {
  if (result && typeof result === "object" && "error" in result) {
    const error = (result as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }
  return null;
}

function esNavegacionNext(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const digest = "digest" in error ? String((error as { digest?: unknown }).digest ?? "") : "";
  return digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND");
}

export type ParchePendiente<T> = {
  id: number;
  apply: (prev: T) => T;
  confirmed: boolean;
};

export function vistaOptimista<T>(baseline: T, pending: ParchePendiente<T>[]): T {
  return pending.reduce((estado, op) => op.apply(estado), baseline);
}

export function plegarConfirmados<T>(
  baseline: T,
  pending: ParchePendiente<T>[],
): { baseline: T; pending: ParchePendiente<T>[] } {
  const next = pending.slice();
  let base = baseline;
  while (next[0]?.confirmed) {
    const op = next.shift()!;
    base = op.apply(base);
  }
  return { baseline: base, pending: next };
}

type OpcionesAplicar<T, R> = {
  mensajeOk?: string;
  reconciliar?: (result: R, actual: T) => T;
};

export function useDatoOptimista<T>(servidor: T) {
  const baselineRef = useRef(servidor);
  const pendingRef = useRef<ParchePendiente<T>[]>([]);
  const seqRef = useRef(0);
  const [dato, setDato] = useState(servidor);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const publicar = useCallback(() => {
    setDato(vistaOptimista(baselineRef.current, pendingRef.current));
    setGuardando(pendingRef.current.some((op) => !op.confirmed));
  }, []);

  useEffect(() => {
    if (pendingRef.current.length > 0) return;
    baselineRef.current = servidor;
    setDato(servidor);
  }, [servidor]);

  const aplicar = useCallback(
    async <R,>(apply: (prev: T) => T, accion: () => Promise<R>, opciones?: OpcionesAplicar<T, R>): Promise<R> => {
      const id = ++seqRef.current;
      pendingRef.current = [...pendingRef.current, { id, apply, confirmed: false }];
      setError(null);
      publicar();
      let result: R;
      try {
        result = await accion();
      } catch (caught) {
        if (esNavegacionNext(caught)) throw caught;
        pendingRef.current = pendingRef.current.filter((op) => op.id !== id);
        setError("No se pudo guardar.");
        setMensaje(null);
        publicar();
        return { error: "No se pudo guardar." } as R;
      }
      const err = errorDeResultado(result);
      const idx = pendingRef.current.findIndex((op) => op.id === id);
      if (idx < 0) return result;
      if (err) {
        pendingRef.current = pendingRef.current.filter((op) => op.id !== id);
        setError(err);
        setMensaje(null);
        publicar();
        return result;
      }
      const actual = pendingRef.current[idx];
      pendingRef.current[idx] = opciones?.reconciliar
        ? {
            ...actual,
            confirmed: true,
            apply: (prev) => opciones.reconciliar!(result, actual.apply(prev)),
          }
        : { ...actual, confirmed: true };
      const plegado = plegarConfirmados(baselineRef.current, pendingRef.current);
      baselineRef.current = plegado.baseline;
      pendingRef.current = plegado.pending;
      if (opciones?.mensajeOk) setMensaje(opciones.mensajeOk);
      publicar();
      return result;
    },
    [publicar],
  );

  return { dato, guardando, error, mensaje, setError, setMensaje, aplicar };
}

type OpcionesEjecutar<R> = {
  mensajeOk?: string;
  onOk?: (result: R) => void;
  onError?: (error: string) => void;
};

export function useAccionOptimista() {
  const [enCurso, setEnCurso] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const ejecutar = useCallback(async <R,>(accion: () => Promise<R>, opciones?: OpcionesEjecutar<R>): Promise<R> => {
    setEnCurso((n) => n + 1);
    setError(null);
    try {
      const result = await accion();
      const err = errorDeResultado(result);
      if (err) {
        setError(err);
        setMensaje(null);
        opciones?.onError?.(err);
        return result;
      }
      if (opciones?.mensajeOk) setMensaje(opciones.mensajeOk);
      opciones?.onOk?.(result);
      return result;
    } catch (caught) {
      if (esNavegacionNext(caught)) throw caught;
      const err = "No se pudo guardar.";
      setError(err);
      setMensaje(null);
      opciones?.onError?.(err);
      return { error: err } as R;
    } finally {
      setEnCurso((n) => Math.max(0, n - 1));
    }
  }, []);

  return { guardando: enCurso > 0, error, mensaje, setError, setMensaje, ejecutar };
}
