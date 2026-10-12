"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  AUTOGUARDADO_INTERVALO_MS,
  decisionAlDesactivar,
  decisionMarcarLimpioTrasOk,
  decisionTickReloj,
  decisionTrasGuardado,
  debeIniciarReloj,
  type KindAutoguardado,
} from "@/lib/autoguardado";
import {
  borrarCopiaLocal,
  escribirCopiaLocal,
  formDataSoloTexto,
} from "@/lib/integridad-borrador";

export type RespuestaBorrador =
  | { ok: true; updatedAt: string; archivoError?: string }
  | { conflict: true; updatedAt: string }
  | { error: string };

async function enviarBorrador(
  formData: FormData,
  kind: KindAutoguardado,
  expectedUpdatedAt: string,
  opciones: { keepalive: boolean; omitirArchivosNuevos: boolean },
): Promise<RespuestaBorrador> {
  formData.set("kind", kind);
  formData.set("expectedUpdatedAt", expectedUpdatedAt);
  if (opciones.omitirArchivosNuevos) {
    formData.set("omitirArchivosNuevos", "1");
  } else {
    formData.delete("omitirArchivosNuevos");
  }
  const response = await fetch("/api/borrador", {
    method: "POST",
    body: formData,
    credentials: "same-origin",
    keepalive: opciones.keepalive,
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
    const archivoError =
      "archivoError" in body && typeof (body as { archivoError?: unknown }).archivoError === "string"
        ? (body as { archivoError: string }).archivoError
        : undefined;
    return {
      ok: true,
      updatedAt: (body as { updatedAt: string }).updatedAt,
      ...(archivoError ? { archivoError } : {}),
    };
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

function idDesdeFormData(formData: FormData, kind: KindAutoguardado) {
  if (kind === "caso") return String(formData.get("postulacionId") ?? "");
  return String(formData.get("asignacionId") ?? "");
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
    async (opciones?: {
      keepalive?: boolean;
      forzar?: boolean;
      soloTexto?: boolean;
      reintentoConflicto?: boolean;
    }): Promise<RespuestaBorrador | { skipped: true }> => {
      if (!opciones?.forzar && !enabledRef.current) return { skipped: true };
      if (enVueloRef.current) return { skipped: true };
      if (!sucioRef.current && !opciones?.forzar) {
        detenerTimer();
        return { skipped: true };
      }
      const form = args.formRef.current;
      if (!form) return { error: "No se pudo guardar." };

      enVueloRef.current = true;
      cambiosDuranteVueloRef.current = false;
      sucioRef.current = false;

      const soloTexto = Boolean(opciones?.soloTexto || opciones?.keepalive);
      const formDataCrudo = new FormData(form);
      const formData = soloTexto ? formDataSoloTexto(formDataCrudo) : formDataCrudo;
      const id = idDesdeFormData(formDataCrudo, kindRef.current);
      const storage = typeof sessionStorage !== "undefined" ? sessionStorage : null;
      escribirCopiaLocal(storage, kindRef.current, id, {
        versionBase: versionRef.current,
        formData: formDataCrudo,
      });

      const keepalive = Boolean(opciones?.keepalive);

      try {
        let resultado = await enviarBorrador(formData, kindRef.current, versionRef.current, {
          keepalive,
          omitirArchivosNuevos: soloTexto,
        });

        if ("conflict" in resultado && !opciones?.reintentoConflicto) {
          // Adopta la versión del servidor y reintenta con el formulario ACTUAL (no la foto vieja).
          versionRef.current = resultado.updatedAt;
          sucioRef.current = true;
          enVueloRef.current = false;
          return flush({
            keepalive,
            forzar: opciones?.forzar,
            soloTexto,
            reintentoConflicto: true,
          });
        }

        if ("ok" in resultado) {
          versionRef.current = resultado.updatedAt;
          const tras = decisionTrasGuardado({
            huboCambiosDuranteVuelo: cambiosDuranteVueloRef.current,
            timerActivo: timerRef.current != null,
          });
          sucioRef.current = tras.sucio;
          if (!tras.mantenerTimer) detenerTimer();
          if (!tras.sucio) {
            borrarCopiaLocal(storage, kindRef.current, id);
          }

          return resultado;
        }

        sucioRef.current = true;
        return resultado;
      } catch {
        sucioRef.current = true;
        return { error: "No se pudo guardar." };
      } finally {
        enVueloRef.current = false;
      }
    },
    [args.formRef, detenerTimer],
  );

  const marcarSucio = useCallback(() => {
    if (!enabledRef.current) {
      // Aunque el hook esté “apagado” por bloqueo temporal, recordar que hay cambios.
      if (enVueloRef.current) {
        cambiosDuranteVueloRef.current = true;
      }
      sucioRef.current = true;
      return;
    }
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
      const decision = decisionAlDesactivar({ sucio: sucioRef.current });
      if (decision.limpiarSucio) sucioRef.current = false;
      if (decision.detenerTimer) detenerTimer();
      return;
    }
    const form = args.formRef.current;
    if (!form) return;

    const onCambio = () => marcarSucio();
    form.addEventListener("input", onCambio);
    form.addEventListener("change", onCambio);

    const onSalir = () => {
      if (!sucioRef.current && !enVueloRef.current) return;
      void flush({ keepalive: true, forzar: true, soloTexto: true });
    };
    window.addEventListener("pagehide", onSalir);
    window.addEventListener("beforeunload", onSalir);

    return () => {
      form.removeEventListener("input", onCambio);
      form.removeEventListener("change", onCambio);
      window.removeEventListener("pagehide", onSalir);
      window.removeEventListener("beforeunload", onSalir);
      if (sucioRef.current) {
        void flush({ keepalive: true, forzar: true, soloTexto: true });
      }
      detenerTimer();
    };
  }, [args.enabled, args.formRef, detenerTimer, flush, marcarSucio]);

  const esperarAutoguardado = useCallback(
    async (opciones?: { forzar?: boolean; soloTexto?: boolean }) => {
      let ultimo: RespuestaBorrador | { skipped: true } = { skipped: true };
      colaManualRef.current = colaManualRef.current.then(async () => {
        while (enVueloRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        if (sucioRef.current || opciones?.forzar) {
          ultimo = await flush({
            forzar: opciones?.forzar,
            soloTexto: opciones?.soloTexto,
          });
        }
        while (enVueloRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      });
      await colaManualRef.current;
      return ultimo;
    },
    [flush],
  );

  const marcarLimpio = useCallback(
    (updatedAt?: string) => {
      if (updatedAt) versionRef.current = updatedAt;
      const decision = decisionMarcarLimpioTrasOk({
        huboCambiosDuranteVuelo: cambiosDuranteVueloRef.current,
      });
      if (!decision.limpiar) {
        sucioRef.current = true;
        return;
      }
      sucioRef.current = false;
      cambiosDuranteVueloRef.current = false;
      detenerTimer();
      const form = args.formRef.current;
      if (form) {
        const id = idDesdeFormData(new FormData(form), kindRef.current);
        borrarCopiaLocal(
          typeof sessionStorage !== "undefined" ? sessionStorage : null,
          kindRef.current,
          id,
        );
      }
    },
    [args.formRef, detenerTimer],
  );

  const versionActual = useCallback(() => versionRef.current, []);

  return {
    esperarAutoguardado,
    marcarLimpio,
    marcarSucio,
    versionActual,
    flush,
  };
}
