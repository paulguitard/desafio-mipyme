"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizarCorreo } from "@/lib/correo";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { saveUpload } from "@/lib/storage";
import {
  agruparAdjuntos,
  isStoredFile,
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
import { postulacionEditable, type EstadoPostulacion } from "@/lib/estado";
import {
  convocatoriaAbiertaParaPostular,
  convocatoriaDisponibleParaNuevosCasos,
} from "@/lib/convocatoria";
import { parseModoEvaluacion } from "@/lib/modo-evaluacion";
import { coincideRevisionCiclo } from "@/lib/revision-ciclo";
import { sanitizeRichText } from "@/lib/html";
import { extraerNombreCaso } from "@/lib/nombre-caso";
import { esMentoriaContenido } from "@/lib/tipo-formulario";
import { sincronizarEstadoPostulacion } from "@/lib/sync-estado";
import { avisarEvaluadoresRespuestaReenviada } from "@/lib/correo-notificacion";
import { randomUUID } from "node:crypto";
import { respuestasEquivalentes } from "@/lib/versiones-respuesta";

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

function preguntasObservadas(postulacion: {
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
    // En evaluación general todas las preguntas quedan editables al corregir.
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

export async function iniciarPostulacionForm(formData: FormData): Promise<void> {
  await iniciarPostulacion(formData);
}

export async function iniciarPostulacion(formData: FormData) {
  const user = await requireUser("EMPRENDEDOR");
  const convocatoriaId = String(formData.get("convocatoriaId") ?? "");
  const convocatoria = await prisma.convocatoria.findUnique({
    where: { id: convocatoriaId },
  });
  if (!convocatoria || !convocatoriaDisponibleParaNuevosCasos(convocatoria)) {
    return { error: "La asesoría no está disponible." };
  }

  const existente = await prisma.postulacion.findUnique({
    where: {
      convocatoriaId_postulanteId: { convocatoriaId, postulanteId: user.id },
    },
  });
  if (existente) {
    redirect(`/participante/postulaciones/${existente.id}`);
  }

  const postulacion = await prisma.postulacion.create({
    data: {
      convocatoriaId,
      postulanteId: user.id,
      estado: "BORRADOR",
      nombreCaso: esMentoriaContenido(convocatoria.tipo) ? user.name ?? "" : "",
    },
  });
  redirect(`/participante/postulaciones/${postulacion.id}`);
}

const MANTENER_VALOR = Symbol("mantener-valor");

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
  if (pregunta.tipo === "numero") {
    return bruto == null ? "" : String(bruto).trim();
  }
  if (pregunta.tipo === "si_no") {
    return String(bruto ?? "");
  }
  return bruto == null ? "" : String(bruto);
}

async function persistirRespuestas(args: {
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
}) {
  const pendientes: {
    preguntaId: string;
    tipo: string;
    valorStr: string;
    archivosStr: string;
    existing: { id: string; valor: string; archivos: string } | null;
  }[] = [];

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
    if (leido === MANTENER_VALOR && existing) {
      continue;
    }
    const valor = leido === MANTENER_VALOR ? "" : leido;
    const valorSanitizado =
      pregunta.tipo === "texto_largo" ? sanitizeRichText(String(valor ?? "")) : valor;

    const previos = existing ? agruparAdjuntos(parseArchivos(existing.archivos)) : null;
    const archivos: StoredAttachment[] = previos ? [...previos.imagenes, ...previos.documentos] : [];
    const nombresYaGuardados = new Set(
      archivos.filter(isStoredFile).map((a) => a.originalName.trim().toLowerCase()),
    );

    async function agregarArchivos(campo: string, kind: "file" | "image") {
      for (const item of args.formData.getAll(campo)) {
        if (!(item instanceof File) || item.size <= 0) continue;
        const nombre = item.name.trim().toLowerCase();
        if (nombresYaGuardados.has(nombre)) continue;
        archivos.push(await saveUpload(item, kind));
        nombresYaGuardados.add(nombre);
      }
    }

    if (pregunta.permiteArchivo) {
      await agregarArchivos(`archivo-${pregunta.id}`, "file");
    }
    if (pregunta.permiteImagen) {
      await agregarArchivos(`imagen-${pregunta.id}`, "image");
    }

    if (pregunta.permiteVideoLink) {
      const urlsVistas = new Set<string>();
      for (const item of args.formData.getAll(`video-${pregunta.id}`)) {
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
    } else if (previos?.videos.length) {
      archivos.push(...previos.videos);
    }

    pendientes.push({
      preguntaId: pregunta.id,
      tipo: pregunta.tipo,
      valorStr: serializeValor(valorSanitizado),
      archivosStr: JSON.stringify(archivos),
      existing,
    });
  }

  await prisma.$transaction(async (tx) => {
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

      if (igual && item.existing) {
        if (!args.crearVersion) continue;
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

      if (args.crearVersion) {
        await tx.respuestaVersion.create({
          data: {
            respuestaId: respuesta.id,
            valor: item.valorStr,
            archivos: item.archivosStr,
          },
        });
      }
    }
  });

  const actualizada = await prisma.postulacion.findUnique({
    where: { id: args.postulacionId },
    include: {
      convocatoria: { include: { formulario: { include: { preguntas: { select: { id: true, opciones: true } } } } } },
      respuestas: { select: { preguntaId: true, valor: true } },
    },
  });
  if (actualizada) {
    await prisma.postulacion.update({
      where: { id: args.postulacionId },
      data: {
        nombreCaso: extraerNombreCaso(
          actualizada.convocatoria.formulario.preguntas,
          actualizada.respuestas,
        ),
      },
    });
  }
}

function respuestaVacia(valorRaw: string, archivosRaw: string, tipo: string, opciones = "[]") {
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

export async function guardarBorrador(formData: FormData) {
  const user = await requireUser("EMPRENDEDOR");
  const id = String(formData.get("postulacionId") ?? "");
  const postulacion = await cargaPostulacionDelUsuario(id, user.id);
  if (!postulacion) return { error: "Caso no encontrado." };
  if (esMentoriaContenido(postulacion.convocatoria.tipo)) {
    return { error: "Esta asesoría de contenido no se responde." };
  }

  const estado = postulacion.estado as EstadoPostulacion;
  if (!postulacionEditable(estado, convocatoriaAbiertaParaPostular(postulacion.convocatoria))) {
    return { error: "Este caso no se puede editar ahora." };
  }

  const observadas = estado === "CON_OBSERVACIONES" ? preguntasObservadas(postulacion) : null;

  try {
    await persistirRespuestas({
      postulacionId: id,
      formData,
      preguntas: postulacion.convocatoria.formulario.preguntas,
      editableIds: observadas && observadas.size > 0 ? observadas : null,
      // Solo versionar al enviar el formulario, no al guardar borrador.
      crearVersion: false,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo guardar." };
  }

  revalidatePath(`/participante/postulaciones/${id}`);
  return { ok: true };
}

export async function enviarPostulacion(formData: FormData) {
  const user = await requireUser("EMPRENDEDOR");
  const id = String(formData.get("postulacionId") ?? "");
  const postulacion = await cargaPostulacionDelUsuario(id, user.id);
  if (!postulacion) return { error: "Caso no encontrado." };
  if (esMentoriaContenido(postulacion.convocatoria.tipo)) {
    return { error: "Esta asesoría de contenido no se responde." };
  }

  const estado = postulacion.estado as EstadoPostulacion;
  if (!postulacionEditable(estado, convocatoriaAbiertaParaPostular(postulacion.convocatoria))) {
    return { error: "Este caso no se puede enviar ahora." };
  }

  const observadas =
    estado === "CON_OBSERVACIONES" ? preguntasObservadas(postulacion) : null;

  try {
    await persistirRespuestas({
      postulacionId: id,
      formData,
      preguntas: postulacion.convocatoria.formulario.preguntas,
      editableIds: observadas && observadas.size > 0 ? observadas : null,
      crearVersion: true,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo enviar." };
  }

  const actualizada = await prisma.postulacion.findUnique({
    where: { id },
    include: {
      convocatoria: {
        include: { formulario: { include: { preguntas: { orderBy: { orden: "asc" } } } } },
      },
      respuestas: true,
      asignaciones: true,
    },
  });
  if (!actualizada) return { error: "Caso no encontrado." };

  for (const pregunta of actualizada.convocatoria.formulario.preguntas) {
    if (observadas && observadas.size > 0 && !observadas.has(pregunta.id)) continue;
    const resp = actualizada.respuestas.find((r) => r.preguntaId === pregunta.id);
    const vacia =
      !resp || respuestaVacia(resp.valor, resp.archivos, pregunta.tipo, pregunta.opciones);
    if (vacia) {
      if (!pregunta.obligatoria) continue;
      revalidatePath(`/participante/postulaciones/${id}`);
      return { error: `Se guardó el borrador, pero falta responder: ${pregunta.enunciado}` };
    }
    if (!resp) continue;
    const errorValor = validarValorRespuesta({
      tipo: pregunta.tipo,
      opciones: pregunta.opciones,
      valor: parseValor(resp.valor),
      obligatoria: pregunta.obligatoria,
    });
    if (errorValor) {
      revalidatePath(`/participante/postulaciones/${id}`);
      return { error: `Se guardó el borrador, pero no se pudo enviar. ${pregunta.enunciado}: ${errorValor}` };
    }
  }

  if (!actualizada.enviadaAt) {
    await prisma.postulacion.update({
      where: { id },
      data: { enviadaAt: new Date() },
    });
  }

  if (estado === "CON_OBSERVACIONES") {
    const observadasAsignaciones = actualizada.asignaciones.filter(
      (asignacion) => asignacion.estado === "CON_OBSERVACIONES",
    );
    await prisma.asignacionEvaluador.updateMany({
      where: { postulacionId: id, estado: "CON_OBSERVACIONES" },
      data: { estado: "REPARADA", rondaActual: { increment: 1 } },
    });
    await sincronizarEstadoPostulacion(id);
    await avisarEvaluadoresRespuestaReenviada({
      asignacionIds: observadasAsignaciones.map((asignacion) => asignacion.id),
      actorNombre: user.name ?? "El participante",
    });
  } else {
    await sincronizarEstadoPostulacion(id);
  }
  revalidatePath(`/participante/postulaciones/${id}`);
  revalidatePath("/participante");
  revalidatePath("/evaluador");
  return { ok: true };
}

export async function marcarVistaPieza(postulacionId: string, piezaId: string) {
  const user = await requireUser("EMPRENDEDOR");
  if (!postulacionId || !piezaId) return { error: "Casilla no encontrada." };
  const postulacion = await prisma.postulacion.findUnique({
    where: { id: postulacionId },
    include: { convocatoria: { select: { tipo: true, formularioId: true, id: true } } },
  });
  if (!postulacion || postulacion.postulanteId !== user.id) {
    return { error: "Participación no encontrada." };
  }
  if (!esMentoriaContenido(postulacion.convocatoria.tipo)) {
    return { error: "Esta asesoría no registra visualizaciones de contenido." };
  }
  const pieza = await prisma.piezaContenido.findFirst({
    where: { id: piezaId, formularioId: postulacion.convocatoria.formularioId },
    select: { id: true },
  });
  if (!pieza) return { error: "Casilla no encontrada." };
  await prisma.vistaContenido.upsert({
    where: { postulacionId_piezaId: { postulacionId, piezaId } },
    update: {},
    create: { postulacionId, piezaId },
  });
  revalidatePath(`/participante/postulaciones/${postulacionId}`);
  revalidatePath(`/admin/mentorias/${postulacion.convocatoria.id}`);
  revalidatePath("/admin/mentorias");
  return { ok: true };
}
