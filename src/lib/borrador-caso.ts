import { randomUUID } from "node:crypto";
import { normalizarCorreo } from "@/lib/correo";
import {
  convocatoriaAbiertaParaPostular,
} from "@/lib/convocatoria";
import { prisma } from "@/lib/db";
import { postulacionEditable, type EstadoPostulacion } from "@/lib/estado";
import { sanitizeRichText } from "@/lib/html";
import { parseModoEvaluacion } from "@/lib/modo-evaluacion";
import { extraerNombreCaso } from "@/lib/nombre-caso";
import {
  agruparAdjuntos,
  parseArchivos,
  parseConfigCorreo,
  parseConfigFecha,
  parseValor,
  resolveVideoEmbed,
  serializeValor,
  textoPlanoDesdeHtml,
  validarValorRespuesta,
  validarVideoLink,
  type StoredAttachment,
  type StoredVideoLink,
} from "@/lib/preguntas";
import { coincideRevisionCiclo } from "@/lib/revision-ciclo";
import { saveUpload } from "@/lib/storage";
import { planVersionEdicionAdmin } from "@/lib/edicion-caso-admin";
import { esMentoriaContenido } from "@/lib/tipo-formulario";
import {
  campoAusenteMantieneValor,
  filtrarAdjuntosMismoNombre,
  hayConflictoVersion,
} from "@/lib/integridad-borrador";
import { respuestasEquivalentes } from "@/lib/versiones-respuesta";

const MANTENER_VALOR = Symbol("mantener-valor");

export type ResultadoBorrador =
  | { ok: true; updatedAt: string; archivoError?: string }
  | { conflict: true; updatedAt: string }
  | { error: string; textoGuardado?: boolean; updatedAt?: string };

export class ConflictoBorradorError extends Error {
  updatedAt: string;
  constructor(updatedAt: string) {
    super("conflict");
    this.name = "ConflictoBorradorError";
    this.updatedAt = updatedAt;
  }
}

async function cargaPostulacionDelUsuario(id: string, emprendedorId: string) {
  const postulacion = await prisma.postulacion.findUnique({
    where: { id },
    include: {
      convocatoria: {
        include: { formulario: { include: { preguntas: { orderBy: { orden: "asc" } } } } },
      },
      respuestas: true,
      asignaciones: {
        include: { revisiones: true, revisionesGenerales: true, evaluador: true },
      },
    },
  });
  if (!postulacion || postulacion.postulanteId !== emprendedorId) return null;
  return postulacion;
}

export function preguntasObservadas(postulacion: {
  convocatoria: { formulario: { modoEvaluacion: string; preguntas: { id: string }[] } };
  asignaciones: {
    estado: string;
    rondaActual: number;
    cicloSupervision: number;
    revisiones: { preguntaId: string; ronda: number; ciclo?: number; veredicto: string }[];
    revisionesGenerales: { ronda: number; ciclo?: number; veredicto: string }[];
  }[];
}) {
  const ids = new Set<string>();
  const modo = parseModoEvaluacion(postulacion.convocatoria.formulario.modoEvaluacion);

  if (modo === "GENERAL") {
    const hayObservacionGeneral = postulacion.asignaciones.some((asignacion) => {
      if (asignacion.estado !== "CON_OBSERVACIONES") return false;
      return asignacion.revisionesGenerales.some(
        (revision) =>
          coincideRevisionCiclo(revision, asignacion.rondaActual, asignacion.cicloSupervision) &&
          revision.veredicto === "OBSERVACION",
      );
    });
    return hayObservacionGeneral ? new Set<string>() : ids;
  }

  for (const asignacion of postulacion.asignaciones) {
    if (asignacion.estado !== "CON_OBSERVACIONES") continue;
    for (const revision of asignacion.revisiones) {
      if (
        coincideRevisionCiclo(revision, asignacion.rondaActual, asignacion.cicloSupervision) &&
        revision.veredicto === "OBSERVACION"
      ) {
        ids.add(revision.preguntaId);
      }
    }
  }
  return ids;
}

function leerValorDesdeFormulario(
  pregunta: { id: string; tipo: string; opciones: string },
  formData: FormData,
  valorExistente: string | null,
): unknown | typeof MANTENER_VALOR {
  const key = `valor-${pregunta.id}`;
  if (pregunta.tipo === "opcion_multiple") {
    return formData.getAll(key).map(String);
  }
  if (pregunta.tipo === "correo") {
    const cantidad = parseConfigCorreo(pregunta.opciones);
    const valor = formData
      .getAll(key)
      .map((item) => normalizarCorreo(String(item)))
      .slice(0, cantidad);
    while (valor.length < cantidad) valor.push("");
    return valor.every((item) => !item) ? [] : valor;
  }
  if (pregunta.tipo === "fecha" && parseConfigFecha(pregunta.opciones) === "rango") {
    const valor = {
      desde: String(formData.get(`${key}-desde`) ?? "").trim(),
      hasta: String(formData.get(`${key}-hasta`) ?? "").trim(),
    };
    if (!valor.desde && !valor.hasta) return "";
    return valor;
  }
  if (
    pregunta.tipo === "gantt" ||
    pregunta.tipo === "presupuesto" ||
    pregunta.tipo === "objetivos_indicadores"
  ) {
    const raw = String(formData.get(key) ?? "").trim();
    if (!raw) return "";
    try {
      return JSON.parse(raw);
    } catch {
      return valorExistente != null ? MANTENER_VALOR : "";
    }
  }
  const bruto = formData.get(key);
  if (campoAusenteMantieneValor(bruto, valorExistente)) {
    return MANTENER_VALOR;
  }
  if (pregunta.tipo === "numero") {
    return bruto == null ? "" : String(bruto).trim();
  }
  if (pregunta.tipo === "si_no") {
    return String(bruto ?? "");
  }
  return bruto == null ? "" : String(bruto);
}

type PendienteRespuesta = {
  preguntaId: string;
  tipo: string;
  valorStr: string;
  archivosStr: string;
  existing: { id: string; valor: string; archivos: string } | null;
  omitirValor: boolean;
};

type ArchivoPendiente = {
  preguntaId: string;
  campo: string;
  kind: "file" | "image";
  file: File;
};

function listarArchivosNuevos(
  formData: FormData,
  pregunta: { id: string; permiteArchivo: boolean; permiteImagen: boolean },
): ArchivoPendiente[] {
  const out: ArchivoPendiente[] = [];
  if (pregunta.permiteArchivo) {
    for (const item of formData.getAll(`archivo-${pregunta.id}`)) {
      if (item instanceof File && item.size > 0) {
        out.push({ preguntaId: pregunta.id, campo: `archivo-${pregunta.id}`, kind: "file", file: item });
      }
    }
  }
  if (pregunta.permiteImagen) {
    for (const item of formData.getAll(`imagen-${pregunta.id}`)) {
      if (item instanceof File && item.size > 0) {
        out.push({ preguntaId: pregunta.id, campo: `imagen-${pregunta.id}`, kind: "image", file: item });
      }
    }
  }
  return out;
}

function videosDesdeFormulario(
  formData: FormData,
  pregunta: { id: string; permiteVideoLink: boolean },
  previos: ReturnType<typeof agruparAdjuntos> | null,
): StoredAttachment[] {
  if (!pregunta.permiteVideoLink) {
    return previos?.videos.length ? [...previos.videos] : [];
  }
  const archivos: StoredAttachment[] = [];
  const urlsVistas = new Set<string>();
  for (const item of formData.getAll(`video-${pregunta.id}`)) {
    const videoRaw = String(item ?? "").trim();
    if (!videoRaw || urlsVistas.has(videoRaw.toLowerCase())) continue;
    urlsVistas.add(videoRaw.toLowerCase());
    if (validarVideoLink(videoRaw)) continue;
    const resolved = resolveVideoEmbed(videoRaw);
    if (!resolved) continue;
    const previa = previos?.videos.find((video) => video.url === resolved.url);
    const video: StoredVideoLink = previa ?? {
      id: randomUUID(),
      kind: "video_link",
      url: resolved.url,
      provider: resolved.provider,
    };
    archivos.push(video);
  }
  return archivos;
}

export async function persistirRespuestas(args: {
  postulacionId: string;
  formData: FormData;
  preguntas: {
    id: string;
    tipo: string;
    opciones: string;
    obligatoria: boolean;
    permiteArchivo: boolean;
    permiteImagen: boolean;
    permiteVideoLink: boolean;
  }[];
  editableIds: Set<string> | null;
  crearVersion: boolean;
  /** Edición admin: reescribe la versión más reciente sin crear otra ni tocar su fecha. */
  reescribirVersionVigente?: boolean;
  expectedUpdatedAt?: string | null;
  /** Solo texto y videos; los archivos nuevos se suben después. */
  omitirArchivosNuevos?: boolean;
}): Promise<
  | { ok: true; updatedAt: string; archivoError?: string }
  | { conflict: true; updatedAt: string }
> {
  const pendientes: PendienteRespuesta[] = [];
  const archivosNuevos: ArchivoPendiente[] = [];

  for (const pregunta of args.preguntas) {
    if (args.editableIds && !args.editableIds.has(pregunta.id)) continue;

    const existing = await prisma.respuesta.findUnique({
      where: {
        postulacionId_preguntaId: {
          postulacionId: args.postulacionId,
          preguntaId: pregunta.id,
        },
      },
    });

    const leido = leerValorDesdeFormulario(pregunta, args.formData, existing?.valor ?? null);
    const omitirValor = leido === MANTENER_VALOR && Boolean(existing);
    const valor = leido === MANTENER_VALOR ? "" : leido;
    const valorSanitizado =
      pregunta.tipo === "texto_largo" ? sanitizeRichText(String(valor ?? "")) : valor;

    const previos = existing ? agruparAdjuntos(parseArchivos(existing.archivos)) : null;
    const archivos: StoredAttachment[] = previos
      ? [...previos.imagenes, ...previos.documentos]
      : [];
    archivos.push(...videosDesdeFormulario(args.formData, pregunta, previos));

    if (!args.omitirArchivosNuevos) {
      archivosNuevos.push(...listarArchivosNuevos(args.formData, pregunta));
    }

    if (omitirValor && archivosNuevos.every((a) => a.preguntaId !== pregunta.id)) {
      // Sin cambio de texto y sin archivos nuevos en esta pasada de texto: igual hay que
      // considerar videos. Si solo hay MANTENER y los archivos se suben después, omitir.
      const archivosStr = JSON.stringify(archivos);
      if (
        existing &&
        respuestasEquivalentes({
          tipo: pregunta.tipo,
          valorA: existing.valor,
          archivosA: existing.archivos,
          valorB: existing.valor,
          archivosB: archivosStr,
        })
      ) {
        continue;
      }
    }

    pendientes.push({
      preguntaId: pregunta.id,
      tipo: pregunta.tipo,
      valorStr: omitirValor && existing ? existing.valor : serializeValor(valorSanitizado),
      archivosStr: JSON.stringify(archivos),
      existing,
      omitirValor,
    });
  }

  const hayArchivosPendientes = !args.omitirArchivosNuevos && archivosNuevos.length > 0;
  const crearVersionEnTexto = Boolean(args.crearVersion) && !hayArchivosPendientes;

  let updatedAtIso: string;
  try {
    updatedAtIso = await prisma.$transaction(async (tx) => {
      const actual = await tx.postulacion.findUnique({
        where: { id: args.postulacionId },
        select: { updatedAt: true },
      });
      if (!actual) throw new Error("Caso no encontrado.");
      const actualIso = actual.updatedAt.toISOString();
      if (hayConflictoVersion(args.expectedUpdatedAt, actualIso)) {
        throw new ConflictoBorradorError(actualIso);
      }

      for (const item of pendientes) {
        const igual =
          item.existing != null &&
          respuestasEquivalentes({
            tipo: item.tipo,
            valorA: item.existing.valor,
            archivosA: item.existing.archivos,
            valorB: item.valorStr,
            archivosB: item.archivosStr,
          });

        if (args.reescribirVersionVigente) {
          const cantidadVersiones = item.existing
            ? await tx.respuestaVersion.count({ where: { respuestaId: item.existing.id } })
            : 0;
          const plan = planVersionEdicionAdmin({
            contenidoIgual: igual,
            cantidadVersiones,
          });
          if (plan.accion === "omitir") continue;

          const respuesta = await tx.respuesta.upsert({
            where: {
              postulacionId_preguntaId: {
                postulacionId: args.postulacionId,
                preguntaId: item.preguntaId,
              },
            },
            update: { valor: item.valorStr, archivos: item.archivosStr },
            create: {
              postulacionId: args.postulacionId,
              preguntaId: item.preguntaId,
              valor: item.valorStr,
              archivos: item.archivosStr,
            },
          });

          if (plan.accion === "reescribir_vigente") {
            const vigente = await tx.respuestaVersion.findFirst({
              where: { respuestaId: respuesta.id },
              orderBy: { createdAt: "desc" },
              select: { id: true },
            });
            if (vigente) {
              await tx.respuestaVersion.update({
                where: { id: vigente.id },
                data: { valor: item.valorStr, archivos: item.archivosStr },
              });
            }
          }
          continue;
        }

        if (igual && item.existing) {
          if (!crearVersionEnTexto) continue;
          const versions = await tx.respuestaVersion.count({
            where: { respuestaId: item.existing.id },
          });
          if (versions > 0) continue;
        }

        const respuesta = await tx.respuesta.upsert({
          where: {
            postulacionId_preguntaId: {
              postulacionId: args.postulacionId,
              preguntaId: item.preguntaId,
            },
          },
          update: { valor: item.valorStr, archivos: item.archivosStr },
          create: {
            postulacionId: args.postulacionId,
            preguntaId: item.preguntaId,
            valor: item.valorStr,
            archivos: item.archivosStr,
          },
        });

        if (crearVersionEnTexto) {
          await tx.respuestaVersion.create({
            data: {
              respuestaId: respuesta.id,
              valor: item.valorStr,
              archivos: item.archivosStr,
            },
          });
        }
      }

      const conNombre = await tx.postulacion.findUnique({
        where: { id: args.postulacionId },
        include: {
          convocatoria: {
            include: {
              formulario: { include: { preguntas: { select: { id: true, opciones: true } } } },
            },
          },
          respuestas: { select: { preguntaId: true, valor: true } },
        },
      });
      const nombreCaso = conNombre
        ? extraerNombreCaso(
            conNombre.convocatoria.formulario.preguntas,
            conNombre.respuestas,
          )
        : undefined;
      const tocada = await tx.postulacion.update({
        where: { id: args.postulacionId },
        data: {
          ...(nombreCaso !== undefined ? { nombreCaso } : {}),
          updatedAt: new Date(),
        },
        select: { updatedAt: true },
      });
      return tocada.updatedAt.toISOString();
    });
  } catch (error) {
    if (error instanceof ConflictoBorradorError) {
      return { conflict: true, updatedAt: error.updatedAt };
    }
    throw error;
  }

  if (args.omitirArchivosNuevos || archivosNuevos.length === 0) {
    return { ok: true, updatedAt: updatedAtIso };
  }

  let versionActual = updatedAtIso;
  let archivoError: string | undefined;
  for (const pendiente of archivosNuevos) {
    try {
      const adjunto = await saveUpload(pendiente.file, pendiente.kind);
      const nombre = pendiente.file.name.trim().toLowerCase();
      versionActual = await prisma.$transaction(async (tx) => {
        const actual = await tx.postulacion.findUnique({
          where: { id: args.postulacionId },
          select: { updatedAt: true },
        });
        if (!actual) throw new Error("Caso no encontrado.");
        const actualIso = actual.updatedAt.toISOString();
        if (actualIso !== versionActual) {
          throw new ConflictoBorradorError(actualIso);
        }

        const existing = await tx.respuesta.findUnique({
          where: {
            postulacionId_preguntaId: {
              postulacionId: args.postulacionId,
              preguntaId: pendiente.preguntaId,
            },
          },
        });
        const previos = existing ? parseArchivos(existing.archivos) : [];
        const sinMismoNombre = filtrarAdjuntosMismoNombre(previos, nombre);
        const archivos = [...sinMismoNombre, adjunto];
        const archivosStr = JSON.stringify(archivos);
        const respuesta = await tx.respuesta.upsert({
          where: {
            postulacionId_preguntaId: {
              postulacionId: args.postulacionId,
              preguntaId: pendiente.preguntaId,
            },
          },
          update: { archivos: archivosStr },
          create: {
            postulacionId: args.postulacionId,
            preguntaId: pendiente.preguntaId,
            valor: existing?.valor ?? serializeValor(""),
            archivos: archivosStr,
          },
        });
        if (args.reescribirVersionVigente) {
          const vigente = await tx.respuestaVersion.findFirst({
            where: { respuestaId: respuesta.id },
            orderBy: { createdAt: "desc" },
            select: { id: true },
          });
          if (vigente) {
            await tx.respuestaVersion.update({
              where: { id: vigente.id },
              data: { archivos: archivosStr },
            });
          }
        }
        const tocada = await tx.postulacion.update({
          where: { id: args.postulacionId },
          data: { updatedAt: new Date() },
          select: { updatedAt: true },
        });
        return tocada.updatedAt.toISOString();
      });
    } catch (error) {
      if (error instanceof ConflictoBorradorError) {
        return { conflict: true, updatedAt: error.updatedAt };
      }
      archivoError =
        error instanceof Error
          ? error.message
          : "El texto quedó guardado; un archivo no se pudo subir.";
      break;
    }
  }

  if (args.crearVersion && hayArchivosPendientes && !archivoError) {
    const preguntaIds = new Set([
      ...pendientes.map((p) => p.preguntaId),
      ...archivosNuevos.map((a) => a.preguntaId),
    ]);
    await prisma.$transaction(async (tx) => {
      for (const preguntaId of preguntaIds) {
        const respuesta = await tx.respuesta.findUnique({
          where: {
            postulacionId_preguntaId: {
              postulacionId: args.postulacionId,
              preguntaId,
            },
          },
        });
        if (!respuesta) continue;
        await tx.respuestaVersion.create({
          data: {
            respuestaId: respuesta.id,
            valor: respuesta.valor,
            archivos: respuesta.archivos,
          },
        });
      }
    });
  }

  return { ok: true, updatedAt: versionActual, ...(archivoError ? { archivoError } : {}) };
}

/** Valida formato (correo, número, límites). No exige obligatorios. */
export function errorFormatoRespuestasFormulario(args: {
  formData: FormData;
  preguntas: {
    id: string;
    enunciado: string;
    tipo: string;
    opciones: string;
    permiteArchivo: boolean;
    permiteImagen: boolean;
  }[];
  respuestasExistentes: { preguntaId: string; archivos: string }[];
}): string | null {
  for (const pregunta of args.preguntas) {
    const existing = args.respuestasExistentes.find((item) => item.preguntaId === pregunta.id);
    const leido = leerValorDesdeFormulario(pregunta, args.formData, null);
    if (leido === MANTENER_VALOR) continue;
    const valor = leido === MANTENER_VALOR ? "" : leido;
    const valorSanitizado =
      pregunta.tipo === "texto_largo" ? sanitizeRichText(String(valor ?? "")) : valor;
    const valorStr = serializeValor(valorSanitizado);
    const hayArchivoNuevo =
      (pregunta.permiteArchivo &&
        args.formData.getAll(`archivo-${pregunta.id}`).some(
          (item) => item instanceof File && item.size > 0,
        )) ||
      (pregunta.permiteImagen &&
        args.formData.getAll(`imagen-${pregunta.id}`).some(
          (item) => item instanceof File && item.size > 0,
        ));
    if (
      respuestaVacia(valorStr, existing?.archivos ?? "[]", pregunta.tipo, pregunta.opciones) &&
      !hayArchivoNuevo
    ) {
      continue;
    }
    const errorValor = validarValorRespuesta({
      tipo: pregunta.tipo,
      opciones: pregunta.opciones,
      valor: parseValor(valorStr),
      obligatoria: false,
    });
    if (errorValor) return `${pregunta.enunciado}: ${errorValor}`;
  }
  return null;
}

export function respuestaVacia(
  valorRaw: string,
  archivosRaw: string,
  tipo: string,
  opciones = "[]",
) {
  const archivos = parseArchivos(archivosRaw);
  const valor = parseValor(valorRaw);
  if (archivos.length > 0) return false;
  if (tipo === "opcion_multiple") {
    return !Array.isArray(valor) || valor.length === 0;
  }
  if (tipo === "correo") {
    if (Array.isArray(valor)) return valor.every((item) => !String(item).trim());
    return !String(valor ?? "").trim();
  }
  if (tipo === "fecha" && parseConfigFecha(opciones) === "rango") {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) return true;
    const desde = String((valor as { desde?: unknown }).desde ?? "").trim();
    const hasta = String((valor as { hasta?: unknown }).hasta ?? "").trim();
    return !desde && !hasta;
  }
  if (tipo === "texto_largo") {
    return !textoPlanoDesdeHtml(String(valor ?? ""));
  }
  if (tipo === "gantt" || tipo === "presupuesto" || tipo === "objetivos_indicadores") {
    return Boolean(
      validarValorRespuesta({
        tipo,
        opciones,
        valor,
        obligatoria: true,
      }),
    );
  }
  return valor === "" || valor == null;
}

export async function persistirBorradorCaso(args: {
  userId: string;
  formData: FormData;
  expectedUpdatedAt?: string | null;
  omitirArchivosNuevos?: boolean;
}): Promise<ResultadoBorrador> {
  const id = String(args.formData.get("postulacionId") ?? "");
  const postulacion = await cargaPostulacionDelUsuario(id, args.userId);
  if (!postulacion) return { error: "Caso no encontrado." };
  if (esMentoriaContenido(postulacion.convocatoria.tipo)) {
    return { error: "Esta asesoría de contenido no se responde." };
  }

  const estado = postulacion.estado as EstadoPostulacion;
  if (!postulacionEditable(estado, convocatoriaAbiertaParaPostular(postulacion.convocatoria))) {
    return { error: "Este caso no se puede editar ahora." };
  }

  if (hayConflictoVersion(args.expectedUpdatedAt, postulacion.updatedAt.toISOString())) {
    return { conflict: true, updatedAt: postulacion.updatedAt.toISOString() };
  }

  const observadas = estado === "CON_OBSERVACIONES" ? preguntasObservadas(postulacion) : null;

  try {
    const resultado = await persistirRespuestas({
      postulacionId: id,
      formData: args.formData,
      preguntas: postulacion.convocatoria.formulario.preguntas,
      editableIds: observadas && observadas.size > 0 ? observadas : null,
      crearVersion: false,
      expectedUpdatedAt: args.expectedUpdatedAt,
      omitirArchivosNuevos: Boolean(args.omitirArchivosNuevos),
    });
    if ("conflict" in resultado) return resultado;
    return {
      ok: true,
      updatedAt: resultado.updatedAt,
      ...(resultado.archivoError ? { archivoError: resultado.archivoError } : {}),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo guardar.",
    };
  }
}
