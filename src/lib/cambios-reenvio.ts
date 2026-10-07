import { versionesDistintas } from "@/lib/versiones-respuesta";

type VersionCambio = {
  valor: string;
  archivos: string;
  createdAt: string;
};

type RespuestaCambio = {
  preguntaId: string;
  tipo: string;
  versiones: VersionCambio[];
};

type AsignacionCambio = {
  rondaActual: number;
  revisiones: { ronda: number; createdAt: string }[];
};

/**
 * Momento de la última observación que el participante ya respondió.
 * Una ronda anterior a `rondaActual` ya fue entregada y contestada: al reenviar,
 * la ronda sube. Las revisiones de la ronda en curso no cuentan, así la marca
 * sigue visible mientras el evaluador vuelve a revisar.
 */
export function corteUltimaObservacionRespondida(asignaciones: AsignacionCambio[]): number | null {
  let corte: number | null = null;
  for (const asignacion of asignaciones) {
    for (const revision of asignacion.revisiones) {
      if (revision.ronda >= asignacion.rondaActual) continue;
      const tiempo = Date.parse(revision.createdAt);
      if (Number.isNaN(tiempo)) continue;
      if (corte == null || tiempo > corte) corte = tiempo;
    }
  }
  return corte;
}

/** Preguntas cuya última versión distinta se guardó al responder la última observación. */
export function preguntasModificadasEnUltimoEnvio(args: {
  respuestas: RespuestaCambio[];
  asignaciones: AsignacionCambio[];
}): string[] {
  const corte = corteUltimaObservacionRespondida(args.asignaciones);
  if (corte == null) return [];

  const ids: string[] = [];
  for (const respuesta of args.respuestas) {
    const versiones = [...respuesta.versiones].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
    const distintas = versionesDistintas(versiones, respuesta.tipo);
    if (distintas.length < 2) continue;
    const reciente = Date.parse(distintas[0]?.createdAt ?? "");
    if (Number.isNaN(reciente) || reciente <= corte) continue;
    ids.push(respuesta.preguntaId);
  }
  return ids;
}
