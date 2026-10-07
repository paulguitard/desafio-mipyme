import { parseValor } from "@/lib/preguntas";

export type PreguntaFiltro = { id: string; enunciado: string; obligatoria: boolean; opciones?: string };
export type RespuestaFiltro = { preguntaId: string; valor: string; archivos?: string };
export type AsignacionFiltro = { evaluadorId: string; estado: string };
export type PostulacionFiltroItem = {
  estado: string;
  enviadaAt: string | null;
  emprendedorNombre: string;
  emprendedorEmail: string;
  nombreCaso: string;
  respuestas: RespuestaFiltro[];
  asignaciones: AsignacionFiltro[];
  supervision?: { supervisorId: string } | null;
};

export const ESTADOS_RESPUESTA_FICHA: EstadoRespuestaFicha[] = [
  "pendiente",
  "borrador",
  "observaciones",
  "esperando-evaluacion",
  "completa",
];

export type EstadoRespuestaFicha =
  | "pendiente"
  | "borrador"
  | "observaciones"
  | "esperando-evaluacion"
  | "completa";

export type EstadoEvaluacionFicha =
  | "pendiente"
  | "esperando-respuesta"
  | "esperando-supervision"
  | "finalizada";

export type EstadoSupervisionFicha =
  | "pendiente"
  | "esperando-respuesta"
  | "esperando-evaluacion"
  | "finalizada";

export const ESTADOS_TURNO_EVALUADOR = new Set([
  "PENDIENTE",
  "EN_REVISION",
  "REPARADA",
  "DEVUELTA_SUPERVISOR",
]);

export function estadoAsignacionFicha(estado: string): EstadoEvaluacionFicha {
  if (estado === "FINALIZADA") return "finalizada";
  if (estado === "EN_SUPERVISION") return "esperando-supervision";
  if (estado === "CON_OBSERVACIONES") return "esperando-respuesta";
  return "pendiente";
}

export function etiquetaEstadoAsignacionFicha(estado: EstadoEvaluacionFicha) {
  if (estado === "finalizada") return "Finalizada";
  if (estado === "esperando-supervision") return "Esperando supervisión";
  if (estado === "esperando-respuesta") return "Esperando respuesta";
  return "Pendiente";
}

export function etiquetaEstadoSupervisionFicha(estado: EstadoSupervisionFicha) {
  if (estado === "finalizada") return "Finalizada";
  if (estado === "esperando-respuesta") return "Esperando respuesta";
  if (estado === "esperando-evaluacion") return "Esperando evaluación";
  return "Pendiente";
}

export function estadoSupervisionFicha(asignaciones: { estado: string }[]): EstadoSupervisionFicha {
  if (asignaciones.some((item) => item.estado === "EN_SUPERVISION")) {
    return "pendiente";
  }
  if (asignaciones.length > 0 && asignaciones.every((item) => item.estado === "FINALIZADA")) {
    return "finalizada";
  }
  if (asignaciones.some((item) => item.estado === "CON_OBSERVACIONES")) {
    const evaluadorTienePelota = asignaciones.some((item) => ESTADOS_TURNO_EVALUADOR.has(item.estado));
    return evaluadorTienePelota ? "esperando-evaluacion" : "esperando-respuesta";
  }
  return "esperando-evaluacion";
}

export function contiene(haystack: string, needle: string) {
  const q = needle.trim().toLocaleLowerCase("es-CL");
  if (!q) return true;
  return haystack.toLocaleLowerCase("es-CL").includes(q);
}

export function respuestaConValor(valor: string) {
  const parsed = parseValor(valor);
  if (parsed == null) return false;
  if (Array.isArray(parsed)) return parsed.some((item) => String(item).trim().length > 0);
  if (typeof parsed === "object") return Object.keys(parsed as object).length > 0;
  return String(parsed).trim().length > 0;
}

function respuestaTieneContenido(respuesta: RespuestaFiltro | undefined) {
  if (!respuesta) return false;
  if (respuestaConValor(respuesta.valor)) return true;
  if (!respuesta.archivos) return false;
  try {
    const parsed = JSON.parse(respuesta.archivos) as unknown;
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

const ESTADOS_EVALUACION_REALIZADA = new Set([
  "EN_SUPERVISION",
  "DEVUELTA_SUPERVISOR",
  "CON_OBSERVACIONES",
  "REPARADA",
  "FINALIZADA",
]);

function evaluacionYaRealizada(asignaciones: { estado: string }[]) {
  return asignaciones.some((item) => ESTADOS_EVALUACION_REALIZADA.has(item.estado));
}

export function estadoRespuestaFicha(
  postulacion: PostulacionFiltroItem,
  preguntas: PreguntaFiltro[],
): EstadoRespuestaFicha {
  if (
    postulacion.estado === "CON_OBSERVACIONES" ||
    postulacion.asignaciones.some((item) => item.estado === "CON_OBSERVACIONES")
  ) {
    return "observaciones";
  }

  if (
    postulacion.asignaciones.length > 0 &&
    postulacion.asignaciones.every((item) => item.estado === "FINALIZADA")
  ) {
    return "completa";
  }

  if (postulacion.enviadaAt) return "esperando-evaluacion";

  const porPregunta = new Map(postulacion.respuestas.map((item) => [item.preguntaId, item] as const));
  const respondidas = preguntas.filter((pregunta) =>
    respuestaTieneContenido(porPregunta.get(pregunta.id)),
  ).length;

  if (respondidas === 0) return "pendiente";
  if (!evaluacionYaRealizada(postulacion.asignaciones)) return "borrador";
  return "pendiente";
}

export function formularioListoParaEnviar(
  postulacion: PostulacionFiltroItem,
  preguntas: PreguntaFiltro[],
) {
  const porPregunta = new Map(postulacion.respuestas.map((item) => [item.preguntaId, item] as const));
  const obligatorias = preguntas.filter((pregunta) => pregunta.obligatoria);
  const base = obligatorias.length > 0 ? obligatorias : preguntas;
  if (base.length === 0) return false;
  return base.every((pregunta) => respuestaTieneContenido(porPregunta.get(pregunta.id)));
}

export function etiquetaEstadoRespuestaFicha(estado: EstadoRespuestaFicha) {
  if (estado === "borrador") return "Borrador";
  if (estado === "observaciones") return "Respondiendo observaciones";
  if (estado === "esperando-evaluacion") return "Esperando evaluación";
  if (estado === "completa") return "Completa";
  return "Pendiente";
}

export function porcentajeEntero(parte: number, total: number) {
  if (total <= 0) return null;
  return Math.round((parte / total) * 100);
}

export function resumenNumerosAsesoria(
  postulaciones: PostulacionFiltroItem[],
  preguntas: PreguntaFiltro[],
) {
  const total = postulaciones.length;
  const porEstado: Record<EstadoRespuestaFicha, number> = {
    pendiente: 0,
    borrador: 0,
    observaciones: 0,
    "esperando-evaluacion": 0,
    completa: 0,
  };
  let conEvaluador = 0;
  let conSupervisor = 0;
  for (const postulacion of postulaciones) {
    porEstado[estadoRespuestaFicha(postulacion, preguntas)] += 1;
    if (postulacion.asignaciones.length > 0) conEvaluador += 1;
    if (postulacion.supervision) conSupervisor += 1;
  }
  return {
    total,
    porEstado,
    conEvaluador,
    sinEvaluador: total - conEvaluador,
    conSupervisor,
    sinSupervisor: total - conSupervisor,
  };
}
