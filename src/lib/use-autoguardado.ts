"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  AUTOGUARDADO_INTERVALO_MS,
  decisionTickReloj,
  decisionTrasGuardado,
  debeIniciarReloj,
  type KindAutoguardado,
} from "@/lib/autoguardado";

type RespuestaBorrador =
  | { ok: true; updatedAt: string }
  | { conflict: true; updatedAt: string }
  | { error: string };

async function enviarBorrador(
  formData: FormData,
  kind: KindAutoguardado,
  expectedUpdatedAt: string,
  keepalive: boolean,
): Promise<RespuestaBorrador> {
  formData.set("kind", kind);
  formData.set("expectedUpdatedAt", expectedUpdatedAt);
  const response = await fetch("/api/borrador", {
    method: "POST",
    body: formData,
    credentials: "same-origin",
    keepalive,
  });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (
    body &&
    typeof body === "object" &&
    "conflict" in body &&
    (body as { conflict?: unknown }).conflict === true &&
    "updatedAt" in body &&
    typeof (body as { updatedAt?: unknown }).updatedAt === "string"
  ) {
    return { conflict: true, updatedAt: (body as { updatedAt: string }).updatedAt };
  }
  if (
    body &&
    typeof body === "object" &&
    "ok" in body &&
    (body as { ok?: unknown }).ok === true &&
    "updatedAt" in body &&
    typeof (body as { updatedAt?: unknown }).updatedAt === "string"
  ) {
    return { ok: true, updatedAt: (body as { updatedAt: string }).updatedAt };
  }
  const error =
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof (body as { error?: unknown }).error === "string"
      ? (body as { error: string }).error
      : "No se pudo guardar.";
  return { error };
}

export function useAutoguardado(args: {
  enabled: boolean;
  kind: KindAutoguardado;
  formRef: React.RefObject<HTMLFormElement | null>;
  versionInicial: string;
}) {
  const versionRef = useRef(args.versionInicial);
  const sucioRef = useRef(false);
  const enVueloRef = useRef(false);
  const cambiosDuranteVueloRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const colaManualRef = useRef<Promise<void>>(Promise.resolve());
  const enabledRef = useRef(args.enabled);
  const kindRef = useRef(args.kind);
  enabledRef.current = args.enabled;
  kindRef.current = args.kind;

  useEffect(() => {
    versionRef.current = args.versionInicial;
  }, [args.versionInicial]);

  const detenerTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flush = useCallback(
    async (opciones?: { keepalive?: boolean; reintentoConflicto?: boolean }) => {
      if (!enabledRef.current) return;
      if (enVueloRef.current) return;
      if (!sucioRef.current) {
        detenerTimer();
        return;
      }
      const form = args.formRef.current;
      if (!form) return;

      enVueloRef.current = true;
      cambiosDuranteVueloRef.current = false;
      sucioRef.current = false;
      const formData = new FormData(form);
      const keepalive = Boolean(opciones?.keepalive);

      try {
        let resultado = await enviarBorrador(
          formData,
          kindRef.current,
          versionRef.current,
          keepalive,
        );

        if ("conflict" in resultado && !opciones?.reintentoConflicto) {
          versionRef.current = resultado.updatedAt;
          sucioRef.current = true;
          enVueloRef.current = false;
          await flush({ keepalive, reintentoConflicto: true });
          return;
        }

        if ("ok" in resultado) {
          versionRef.current = resultado.updatedAt;
          const tras = decisionTrasGuardado({
            huboCambiosDuranteVuelo: cambiosDuranteVueloRef.current,
            timerActivo: timerRef.current != null,
          });
          sucioRef.current = tras.sucio;
          if (!tras.mantenerTimer) detenerTimer();
        } else {
          sucioRef.current = true;
        }
      } catch {
        sucioRef.current = true;
      } finally {
        enVueloRef.current = false;
      }
    },
    [args.formRef, detenerTimer],
  );

  const marcarSucio = useCallback(() => {
    if (!enabledRef.current) return;
    if (enVueloRef.current) {
      cambiosDuranteVueloRef.current = true;
      sucioRef.current = true;
      return;
    }
    sucioRef.current = true;
    if (debeIniciarReloj(timerRef.current != null)) {
      timerRef.current = setInterval(() => {
        const decision = decisionTickReloj({
          sucio: sucioRef.current,
          enVuelo: enVueloRef.current,
        });
        if (decision.detener) {
          detenerTimer();
          return;
        }
        if (decision.guardar) {
          void flush();
        }
      }, AUTOGUARDADO_INTERVALO_MS);
    }
  }, [detenerTimer, flush]);

  useEffect(() => {
    if (!args.enabled) {
      detenerTimer();
      sucioRef.current = false;
      return;
    }
    const form = args.formRef.current;
    if (!form) return;

    const onCambio = () => marcarSucio();
    form.addEventListener("input", onCambio);
    form.addEventListener("change", onCambio);

    const onSalir = () => {
      if (!sucioRef.current && !enVueloRef.current) return;
      void flush({ keepalive: true });
    };
    window.addEventListener("pagehide", onSalir);
    window.addEventListener("beforeunload", onSalir);

    return () => {
      form.removeEventListener("input", onCambio);
      form.removeEventListener("change", onCambio);
      window.removeEventListener("pagehide", onSalir);
      window.removeEventListener("beforeunload", onSalir);
      if (sucioRef.current) {
        void flush({ keepalive: true });
      }
      detenerTimer();
    };
  }, [args.enabled, args.formRef, detenerTimer, flush, marcarSucio]);

  const esperarAutoguardado = useCallback(async () => {
    colaManualRef.current = colaManualRef.current.then(async () => {
      while (enVueloRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (sucioRef.current) {
        await flush();
      }
      while (enVueloRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    });
    await colaManualRef.current;
  }, [flush]);

  const marcarLimpio = useCallback(
    (updatedAt?: string) => {
      if (updatedAt) versionRef.current = updatedAt;
      sucioRef.current = false;
      cambiosDuranteVueloRef.current = false;
      detenerTimer();
    },
    [detenerTimer],
  );

  return { esperarAutoguardado, marcarLimpio, marcarSucio };
}
