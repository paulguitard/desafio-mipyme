export const AUTOGUARDADO_INTERVALO_MS = 3 * 60 * 1000;

export type KindAutoguardado = "caso" | "evaluacion" | "supervision";

/** El primer cambio arranca el reloj; escribir de nuevo no lo reinicia. */
export function debeIniciarReloj(timerActivo: boolean) {
  return !timerActivo;
}

/** En cada tick: guardar si hay cambios y no hay petición en curso; apagar si quedó limpio. */
export function decisionTickReloj(args: { sucio: boolean; enVuelo: boolean }) {
  if (args.enVuelo) return { guardar: false, detener: false } as const;
  if (!args.sucio) return { guardar: false, detener: true } as const;
  return { guardar: true, detener: false } as const;
}

/** Tras un guardado exitoso: si hubo cambios durante la petición, el reloj sigue. */
export function decisionTrasGuardado(args: {
  huboCambiosDuranteVuelo: boolean;
  timerActivo: boolean;
}) {
  if (args.huboCambiosDuranteVuelo) {
    return { sucio: true, mantenerTimer: true } as const;
  }
  return { sucio: false, mantenerTimer: false } as const;
}

export function debePersistirCampoRevision(args: {
  veredicto: string;
  comentario: string;
  nota: number | null;
  permitirSinVeredicto: boolean;
}) {
  if (args.veredicto === "OK" || args.veredicto === "OBSERVACION") return true;
  if (!args.permitirSinVeredicto) return false;
  return args.nota != null || Boolean(args.comentario);
}

export function avisarCambioFormulario(nodo: EventTarget | null | undefined) {
  if (!(nodo instanceof Element)) return;
  const form = nodo instanceof HTMLFormElement ? nodo : nodo.closest("form");
  form?.dispatchEvent(new Event("input", { bubbles: true }));
}
