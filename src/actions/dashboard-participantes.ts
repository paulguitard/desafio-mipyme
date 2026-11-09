"use server";

import {
  cargarCasosEvaluacionesPitch,
  leerTokenDashboardParticipantes,
} from "@/lib/dashboard-participantes";
import type { EvaluacionesPitchPayload } from "@/lib/dashboard-evaluaciones-pitch";
import { esTokenPublicoValido } from "@/lib/ficha-publica";

const CLAVE_EVALUACIONES_PITCH = "entel555";

export async function desbloquearEvaluacionesPitch(args: {
  token: string;
  clave: string;
}): Promise<{ ok: true; data: EvaluacionesPitchPayload } | { ok: false; error: string }> {
  const token = args.token.trim();
  if (!esTokenPublicoValido(token)) {
    return { ok: false, error: "El enlace no es válido." };
  }
  const esperado = await leerTokenDashboardParticipantes();
  if (!esperado || token !== esperado) {
    return { ok: false, error: "El enlace no es válido." };
  }
  if (args.clave !== CLAVE_EVALUACIONES_PITCH) {
    return { ok: false, error: "La contraseña no es correcta." };
  }
  const data = await cargarCasosEvaluacionesPitch();
  return { ok: true, data };
}
