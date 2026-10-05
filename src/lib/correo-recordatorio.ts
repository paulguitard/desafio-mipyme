import {
  estadoRespuestaFicha,
  ESTADOS_TURNO_EVALUADOR,
  type PreguntaFiltro,
  type PostulacionFiltroItem,
} from "@/lib/convocatoria-evaluacion-filtros";
import type { TipoCorreoNotificacion } from "@/lib/correo-notificacion-ui";

export type TipoRecordatorioParticipante = Extract<
  TipoCorreoNotificacion,
  | "PARTICIPANTE_RECORDATORIO_PENDIENTE"
  | "PARTICIPANTE_RECORDATORIO_COMPLETA"
  | "PARTICIPANTE_RECORDATORIO_OBSERVACIONES"
>;

export type RecordatorioParticipante =
  | { habilitado: true; tipo: TipoRecordatorioParticipante }
  | { habilitado: false; motivo: string };

export type AsignacionRecordatorio = {
  id?: string;
  evaluadorId: string;
  estado: string;
};

export function recordatorioParticipante(
  postulacion: PostulacionFiltroItem,
  preguntas: PreguntaFiltro[],
): RecordatorioParticipante {
  const estado = estadoRespuestaFicha(postulacion, preguntas);
  if (estado === "pendiente") {
    return { habilitado: true, tipo: "PARTICIPANTE_RECORDATORIO_PENDIENTE" };
  }
  if (estado === "observaciones") {
    return { habilitado: true, tipo: "PARTICIPANTE_RECORDATORIO_OBSERVACIONES" };
  }
  if (estado === "completa" && !postulacion.enviadaAt) {
    return { habilitado: true, tipo: "PARTICIPANTE_RECORDATORIO_COMPLETA" };
  }
  if (estado === "esperando-evaluacion") {
    return { habilitado: false, motivo: "El caso ya está en evaluación." };
  }
  return { habilitado: false, motivo: "Las evaluaciones de este caso ya están finalizadas." };
}

export function asignacionesPendientesEvaluador(asignaciones: AsignacionRecordatorio[]) {
  return asignaciones.filter((item) => ESTADOS_TURNO_EVALUADOR.has(item.estado));
}

export function recordatorioEvaluadorCaso(asignaciones: AsignacionRecordatorio[]):
  | { habilitado: true; asignaciones: AsignacionRecordatorio[] }
  | { habilitado: false; motivo: string } {
  if (asignaciones.length === 0) {
    return { habilitado: false, motivo: "No hay evaluador asignado." };
  }
  const pendientes = asignacionesPendientesEvaluador(asignaciones);
  if (pendientes.length === 0) {
    return { habilitado: false, motivo: "Ningún evaluador tiene este caso pendiente." };
  }
  return { habilitado: true, asignaciones: pendientes };
}

export function recordatorioSupervisorCaso(
  asignaciones: { estado: string }[],
  supervision: { supervisorId: string } | null | undefined,
): { habilitado: true } | { habilitado: false; motivo: string } {
  if (!supervision) {
    return { habilitado: false, motivo: "Sin supervisor asignado." };
  }
  if (!asignaciones.some((item) => item.estado === "EN_SUPERVISION")) {
    return { habilitado: false, motivo: "Este caso no está pendiente de supervisión." };
  }
  return { habilitado: true };
}

export function cantidadesPendientesEvaluadores(
  postulaciones: { asignaciones: { evaluadorId: string; estado: string }[] }[],
) {
  const porPersona = new Map<string, number>();
  for (const postulacion of postulaciones) {
    for (const asignacion of postulacion.asignaciones) {
      if (!ESTADOS_TURNO_EVALUADOR.has(asignacion.estado)) continue;
      porPersona.set(asignacion.evaluadorId, (porPersona.get(asignacion.evaluadorId) ?? 0) + 1);
    }
  }
  return porPersona;
}

export function cantidadesPendientesSupervisores(
  postulaciones: {
    asignaciones: { estado: string }[];
    supervision?: { supervisorId: string } | null;
  }[],
) {
  const porPersona = new Map<string, number>();
  for (const postulacion of postulaciones) {
    const supervisorId = postulacion.supervision?.supervisorId;
    if (!supervisorId) continue;
    if (!postulacion.asignaciones.some((item) => item.estado === "EN_SUPERVISION")) continue;
    porPersona.set(supervisorId, (porPersona.get(supervisorId) ?? 0) + 1);
  }
  return porPersona;
}
