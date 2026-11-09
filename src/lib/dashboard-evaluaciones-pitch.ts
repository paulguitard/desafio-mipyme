import { extraerNombreCaso, etiquetaNombreCaso } from "@/lib/nombre-caso";
import { getVideoLink, parseArchivos, parseValor, resolveVideoEmbed } from "@/lib/preguntas";
import {
  formatearNotaRubrica,
  notaPonderadaRubrica,
  promedioParcialRubricaFinalizados,
} from "@/lib/rubrica";
import { revisionVigente } from "@/lib/revision-ciclo";

export type CriterioPitchColumna = {
  id: string;
  nombre: string;
  peso: number;
};

export type EvaluadorPitchDetalle = {
  id: string;
  nombre: string;
  estado: string;
  notasPorCriterio: Record<string, number | null>;
  ponderacion: number | null;
  comentario: string;
};

export type CasoEvaluacionPitch = {
  postulacionId: string;
  participanteNombre: string;
  nombreCaso: string;
  videoUrl: string | null;
  evaluadores: EvaluadorPitchDetalle[];
  promedioPorCriterio: Record<string, number | null>;
  ponderacionPromedio: number | null;
  finalizados: number;
  asignados: number;
  hayPendientes: boolean;
  pendientesNombres: string[];
};

export type EvaluacionesPitchPayload = {
  criterios: CriterioPitchColumna[];
  casos: CasoEvaluacionPitch[];
};

function urlVideoDesdeRespuesta(respuesta: { archivos?: string; valor?: string } | undefined) {
  if (!respuesta) return null;
  const desdeArchivos = getVideoLink(parseArchivos(respuesta.archivos ?? "[]"))?.url?.trim() ?? "";
  if (desdeArchivos && resolveVideoEmbed(desdeArchivos)) return desdeArchivos;
  const parsed = parseValor(respuesta.valor ?? "");
  const texto = typeof parsed === "string" ? parsed.trim() : "";
  if (texto && resolveVideoEmbed(texto)) return texto;
  return null;
}

export function urlVideoSegundaPregunta(
  preguntas: { id: string; orden: number; permiteVideoLink?: boolean }[],
  respuestas: { preguntaId: string; archivos: string; valor?: string }[],
): string | null {
  const porOrden = [...preguntas].sort((a, b) => a.orden - b.orden);
  const segunda = porOrden[1];
  const preferidas = [
    ...(segunda ? [segunda] : []),
    ...porOrden.filter((pregunta) => pregunta.permiteVideoLink),
    ...porOrden,
  ];
  const vistos = new Set<string>();
  for (const pregunta of preferidas) {
    if (vistos.has(pregunta.id)) continue;
    vistos.add(pregunta.id);
    const url = urlVideoDesdeRespuesta(respuestas.find((item) => item.preguntaId === pregunta.id));
    if (url) return url;
  }
  return null;
}

export function nombreCasoPitch(
  nombreCaso: string,
  preguntas: { id: string; opciones: string }[],
  respuestas: { preguntaId: string; valor: string }[],
) {
  return etiquetaNombreCaso(nombreCaso.trim() || extraerNombreCaso(preguntas, respuestas));
}

export function mapearCasoEvaluacionPitch(args: {
  postulacionId: string;
  participanteNombre: string;
  nombreCaso: string;
  videoUrl: string | null;
  criterios: CriterioPitchColumna[];
  evaluadores: EvaluadorPitchDetalle[];
}): CasoEvaluacionPitch {
  const parcial = promedioParcialRubricaFinalizados({
    criterios: args.criterios,
    evaluadores: args.evaluadores.map((item) => ({
      nombre: item.nombre,
      estado: item.estado,
      notas: args.criterios.map((criterio) => ({
        criterioId: criterio.id,
        nota: item.notasPorCriterio[criterio.id] ?? null,
      })),
    })),
  });
  return {
    postulacionId: args.postulacionId,
    participanteNombre: args.participanteNombre,
    nombreCaso: args.nombreCaso,
    videoUrl: args.videoUrl,
    evaluadores: args.evaluadores,
    promedioPorCriterio: parcial.promedioPorCriterio,
    ponderacionPromedio: parcial.ponderacionPromedio,
    finalizados: parcial.finalizados,
    asignados: parcial.asignados,
    hayPendientes: parcial.hayPendientes,
    pendientesNombres: parcial.pendientesNombres,
  };
}

export function evaluadorDesdeAsignacionPitch(args: {
  id: string;
  nombre: string;
  estado: string;
  rondaActual: number;
  cicloSupervision: number;
  criterios: { id: string; peso: number }[];
  revisionesCriterio: { criterioId: string; nota: number; ronda: number; ciclo?: number }[];
  revisionesGenerales: { comentario: string; ronda: number; ciclo?: number }[];
}): EvaluadorPitchDetalle {
  const notasPorCriterio: Record<string, number | null> = {};
  for (const criterio of args.criterios) {
    notasPorCriterio[criterio.id] =
      revisionVigente(
        args.revisionesCriterio.filter((item) => item.criterioId === criterio.id),
        args.rondaActual,
        args.cicloSupervision,
      )?.nota ?? null;
  }
  return {
    id: args.id,
    nombre: args.nombre,
    estado: args.estado,
    notasPorCriterio,
    ponderacion: notaPonderadaRubrica(
      args.criterios.map((criterio) => ({
        peso: criterio.peso,
        nota: notasPorCriterio[criterio.id],
      })),
    ),
    comentario:
      revisionVigente(args.revisionesGenerales, args.rondaActual, args.cicloSupervision)?.comentario ??
      "",
  };
}

export function textoNotaPitch(nota: number | null | undefined) {
  return formatearNotaRubrica(nota) || "Pendiente";
}

export function etiquetaEvaluadoresPitch(caso: { asignados: number; finalizados: number }) {
  const pendientes = Math.max(0, caso.asignados - caso.finalizados);
  if (caso.asignados > 0 && pendientes === 0) return "Todos Ok";
  if (pendientes === 1) return "1 Pendiente";
  return `${pendientes} Pendientes`;
}

export type FiltroEvaluadoresPitch = "" | "pendientes" | "ok";

export function pasaFiltroEvaluadoresPitch(
  caso: { asignados: number; finalizados: number },
  filtro: FiltroEvaluadoresPitch,
) {
  if (!filtro) return true;
  const pendientes = Math.max(0, caso.asignados - caso.finalizados);
  if (filtro === "ok") return caso.asignados > 0 && pendientes === 0;
  return pendientes > 0;
}

function parseNumeroPitch(texto: string) {
  const limpio = texto.trim().replace(",", ".");
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

export type RangoNotaPitch = { min: string; max: string };

export function pasaFiltroRangoNotaPitch(
  nota: number | null | undefined,
  minimo: string,
  maximo: string,
) {
  const min = parseNumeroPitch(minimo);
  const max = parseNumeroPitch(maximo);
  if (min == null && max == null) return true;
  if (nota == null || !Number.isFinite(nota)) return false;
  if (min != null && nota < min) return false;
  if (max != null && nota > max) return false;
  return true;
}

export function pasaFiltroEvaluadorPitch(caso: { evaluadores: { nombre: string }[] }, filtro: string) {
  const q = filtro.trim().toLowerCase();
  if (!q) return true;
  return caso.evaluadores.some((evaluador) => evaluador.nombre.trim().toLowerCase() === q);
}

export type ColumnaOrdenPitch = "nombre" | "caso" | "ponderacion" | "evaluadores" | `criterio:${string}`;

export type DireccionOrdenPitch = "asc" | "desc";

function compararTexto(a: string, b: string) {
  return a.localeCompare(b, "es", { sensitivity: "base" });
}

function compararNota(
  a: number | null | undefined,
  b: number | null | undefined,
  direccion: DireccionOrdenPitch,
) {
  const va = a == null || !Number.isFinite(a);
  const vb = b == null || !Number.isFinite(b);
  if (va && vb) return 0;
  if (va) return 1;
  if (vb) return -1;
  const dir = direccion === "asc" ? 1 : -1;
  return (Number(a) - Number(b)) * dir;
}

export function filasExcelLinksVideosPitch(
  casos: { participanteNombre: string; nombreCaso: string; videoUrl: string | null }[],
) {
  return [
    ["Nombre del participante", "Nombre del caso", "Link del video pitch"],
    ...casos.map((caso) => [caso.participanteNombre, caso.nombreCaso, caso.videoUrl?.trim() ?? ""]),
  ];
}

export function compararCasosPitch(
  a: CasoEvaluacionPitch,
  b: CasoEvaluacionPitch,
  columna: ColumnaOrdenPitch,
  direccion: DireccionOrdenPitch,
) {
  const dir = direccion === "asc" ? 1 : -1;
  let bruto = 0;
  if (columna === "nombre") bruto = compararTexto(a.participanteNombre, b.participanteNombre) * dir;
  else if (columna === "caso") bruto = compararTexto(a.nombreCaso, b.nombreCaso) * dir;
  else if (columna === "ponderacion") bruto = compararNota(a.ponderacionPromedio, b.ponderacionPromedio, direccion);
  else if (columna === "evaluadores") {
    const pa = Math.max(0, a.asignados - a.finalizados);
    const pb = Math.max(0, b.asignados - b.finalizados);
    bruto = (pa - pb || a.asignados - b.asignados) * dir;
  } else if (columna.startsWith("criterio:")) {
    const id = columna.slice("criterio:".length);
    bruto = compararNota(a.promedioPorCriterio[id], b.promedioPorCriterio[id], direccion);
  }
  if (bruto !== 0) return bruto;
  return compararTexto(a.participanteNombre, b.participanteNombre);
}
