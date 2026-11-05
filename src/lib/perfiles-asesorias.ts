import { normalizarCorreo } from "@/lib/correo";
import { ESTADO_POSTULACION_LABEL, type EstadoPostulacion } from "@/lib/estado";

/** Cuentas de prueba: se ocultan solo en Perfil de participantes, no se borran. */
export const CORREOS_OCULTOS_ANALISIS = [
  "guitard.paul@gmail.com",
  "piortegaf@gmail.com",
  "emprendedor2@test.com",
  "emprendedor@test.com",
] as const;

const CORREOS_OCULTOS = new Set<string>(CORREOS_OCULTOS_ANALISIS);

export function esParticipanteOcultoEnAnalisis(email: string) {
  return CORREOS_OCULTOS.has(normalizarCorreo(email));
}

export function filtrarPerfilesAnalisis<T extends { email: string }>(perfiles: T[]) {
  return perfiles.filter((perfil) => !esParticipanteOcultoEnAnalisis(perfil.email));
}

export const TITULO_ASESORIA_TD = "Asesoría de Transformación Digital";
export const TITULO_ASESORIA_PITCH = "Comparte tu Pitch";

export type ConvocatoriaAsesoriaRef = {
  id: string;
  titulo: string;
  estado: string;
  createdAt: Date | string;
};

export type PostulacionAsesoriaRef = {
  postulanteId: string;
  convocatoriaId: string;
  estado: string;
  enviadaAt: Date | string | null;
};

function normalizarTitulo(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function tituloAsesoriaCoincide(titulo: string, esperado: string) {
  const a = normalizarTitulo(titulo);
  const b = normalizarTitulo(esperado);
  return a === b || a.includes(b) || b.includes(a);
}

function fechaMs(value: Date | string) {
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

export function elegirConvocatoriaActiva(
  convocatorias: ConvocatoriaAsesoriaRef[],
  tituloEsperado: string,
) {
  const matches = convocatorias.filter((item) => tituloAsesoriaCoincide(item.titulo, tituloEsperado));
  const abiertas = matches.filter((item) => item.estado === "ABIERTA");
  const pool = abiertas.length > 0 ? abiertas : matches;
  return [...pool].sort((a, b) => fechaMs(b.createdAt) - fechaMs(a.createdAt))[0] ?? null;
}

export const ETIQUETA_TD_SIN_INFORMACION = "Sin información";

export function etiquetaAsesoriaTd(estado: string | null | undefined) {
  if (!estado) return ETIQUETA_TD_SIN_INFORMACION;
  if (estado === "BORRADOR") return "Incompleto";
  return ESTADO_POSTULACION_LABEL[estado as EstadoPostulacion] ?? estado;
}

export function etiquetaVideoPitch(
  postulacion: { enviadaAt: Date | string | null } | null | undefined,
) {
  return postulacion?.enviadaAt ? "Enviado" : "Pendiente";
}

export const ESTADOS_TD_ANALISIS = [
  ETIQUETA_TD_SIN_INFORMACION,
  "Incompleto",
  "Enviada",
  "En evaluación",
  "Con observaciones",
  "Reparada por el participante",
  "Finalizada",
] as const;

export const SECCIONES_TD_ANALISIS = [
  {
    titulo: "Fuera del proceso",
    estados: [ETIQUETA_TD_SIN_INFORMACION, "Incompleto"],
  },
  {
    titulo: "En proceso de evaluación",
    estados: ["Enviada", "En evaluación", "Con observaciones", "Reparada por el participante"],
  },
  {
    titulo: "Finalizadas",
    estados: ["Finalizada"],
  },
] as const;

export function barrasTdPorSeccion(asesoriaTd: { estado: string; cantidad: number }[]) {
  const porEstado = new Map(asesoriaTd.map((item) => [item.estado, item.cantidad]));
  return SECCIONES_TD_ANALISIS.map((seccion) => ({
    titulo: seccion.titulo,
    items: seccion.estados.map((estado) => ({
      etiqueta: estado,
      cantidad: porEstado.get(estado) ?? 0,
    })),
  }));
}

const ESTADOS_TD_CONOCIDOS = new Set<string>(ESTADOS_TD_ANALISIS);

export function estadosTdEnCeldas(valores: string[]) {
  const presentes = new Set(valores);
  const conocidos = ESTADOS_TD_ANALISIS.filter((estado) => presentes.has(estado));
  const extras = [...presentes].filter((estado) => !ESTADOS_TD_CONOCIDOS.has(estado)).sort();
  return [...conocidos, ...extras];
}

export function pasaFiltroEstados(valor: string, seleccionados: string[]) {
  if (seleccionados.length === 0) return true;
  return seleccionados.includes(valor);
}

export function pasaFiltroTexto(valor: string, filtro: string) {
  const consulta = filtro.trim().toLowerCase();
  if (!consulta) return true;
  return valor.toLowerCase().includes(consulta);
}

export type FilaDashboardParticipante = {
  name: string;
  email: string;
  formalizacionEmpresa: boolean;
  asesoriaTd: string;
  videoPitch: "Enviado" | "Pendiente";
};

export type ResumenDashboardParticipantes = {
  total: number;
  formalizacionSi: number;
  formalizacionNo: number;
  videoPitchEnviado: number;
  videoPitchPendiente: number;
  asesoriaTd: { estado: string; cantidad: number }[];
};

export function filasDashboardPublico(
  perfiles: Array<{
    name: string;
    email: string;
    formalizacionEmpresa: boolean;
    asesoriaTd: string;
    videoPitch: "Enviado" | "Pendiente";
  }>,
): FilaDashboardParticipante[] {
  return perfiles.map((perfil) => ({
    name: perfil.name,
    email: normalizarCorreo(perfil.email),
    formalizacionEmpresa: perfil.formalizacionEmpresa,
    asesoriaTd: perfil.asesoriaTd,
    videoPitch: perfil.videoPitch,
  }));
}

export function resumenDashboardPublico(
  filas: FilaDashboardParticipante[],
): ResumenDashboardParticipantes {
  const formalizacionSi = filas.filter((fila) => fila.formalizacionEmpresa).length;
  const videoPitchEnviado = filas.filter((fila) => fila.videoPitch === "Enviado").length;
  return {
    total: filas.length,
    formalizacionSi,
    formalizacionNo: filas.length - formalizacionSi,
    videoPitchEnviado,
    videoPitchPendiente: filas.length - videoPitchEnviado,
    asesoriaTd: estadosTdEnCeldas(filas.map((fila) => fila.asesoriaTd)).map((estado) => ({
      estado,
      cantidad: filas.filter((fila) => fila.asesoriaTd === estado).length,
    })),
  };
}

export function anexarAsesoriasAPerfiles<T extends { id: string }>(
  perfiles: T[],
  convocatorias: ConvocatoriaAsesoriaRef[],
  postulaciones: PostulacionAsesoriaRef[],
): Array<T & { asesoriaTd: string; videoPitch: "Enviado" | "Pendiente" }> {
  const td = elegirConvocatoriaActiva(convocatorias, TITULO_ASESORIA_TD);
  const pitch = elegirConvocatoriaActiva(convocatorias, TITULO_ASESORIA_PITCH);
  const porUsuario = new Map<string, PostulacionAsesoriaRef[]>();
  for (const postulacion of postulaciones) {
    const actual = porUsuario.get(postulacion.postulanteId) ?? [];
    actual.push(postulacion);
    porUsuario.set(postulacion.postulanteId, actual);
  }

  return perfiles.map((perfil) => {
    const casos = porUsuario.get(perfil.id) ?? [];
    const casoTd = td ? casos.find((caso) => caso.convocatoriaId === td.id) : undefined;
    const casoPitch = pitch ? casos.find((caso) => caso.convocatoriaId === pitch.id) : undefined;
    return {
      ...perfil,
      asesoriaTd: etiquetaAsesoriaTd(casoTd?.estado),
      videoPitch: etiquetaVideoPitch(casoPitch),
    };
  });
}
