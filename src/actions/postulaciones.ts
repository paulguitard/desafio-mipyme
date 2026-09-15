"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { saveUpload } from "@/lib/storage";
import {
  getVideoLink,
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
import { convocatoriaAbiertaParaPostular } from "@/lib/convocatoria";
import { asegurarPreguntaNombreCaso } from "@/lib/nombre-caso";
import { sincronizarEstadoPostulacion } from "@/lib/sync-estado";
import { randomUUID } from "node:crypto";

async function cargaPostulacionDelUsuario(id: string, emprendedorId: string) {
  const postulacion = await prisma.postulacion.findUnique({
    where: { id },
    include: {
      convocatoria: {
        include: { formulario: { include: { preguntas: { orderBy: { orden: "asc" } } } } },
      },
      respuestas: true,
      asignaciones: { include: { revisiones: true, evaluador: true } },
    },
  });
  if (!postulacion || postulacion.postulanteId !== emprendedorId) return null;
  return postulacion;
}

function preguntasObservadas(postulacion: {
  asignaciones: {
    estado: string;
    rondaActual: number;
    revisiones: { preguntaId: string; ronda: number; veredicto: string }[];
  }[];
}) {
  const ids = new Set<string>();
  for (const asignacion of postulacion.asignaciones) {
    if (asignacion.estado !== "CON_OBSERVACIONES") continue;
    for (const revision of asignacion.revisiones) {
      if (revision.ronda === asignacion.rondaActual && revision.veredicto === "OBSERVACION") {
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
  if (!convocatoria || !convocatoriaAbiertaParaPostular(convocatoria)) {
    return { error: "La convocatoria no está abierta." };
  }
  await asegurarPreguntaNombreCaso(convocatoria.formularioId);

  const existente = await prisma.postulacion.findUnique({
    where: {
      convocatoriaId_postulanteId: { convocatoriaId, postulanteId: user.id },
    },
  });
  if (existente) {
    redirect(`/emprendedor/postulaciones/${existente.id}`);
  }

  const postulacion = await prisma.postulacion.create({
    data: {
      convocatoriaId,
      postulanteId: user.id,
      estado: "BORRADOR",
    },
  });
  redirect(`/emprendedor/postulaciones/${postulacion.id}`);
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
      .map((item) => String(item).trim())
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

    const archivos: StoredAttachment[] = existing
      ? parseArchivos(existing.archivos).filter(isStoredFile)
      : [];

    if (pregunta.permiteArchivo) {
      const file = args.formData.get(`archivo-${pregunta.id}`);
      if (file instanceof File && file.size > 0) {
        archivos.push(await saveUpload(file, "file"));
      }
    }
    if (pregunta.permiteImagen) {
      const file = args.formData.get(`imagen-${pregunta.id}`);
      if (file instanceof File && file.size > 0) {
        archivos.push(await saveUpload(file, "image"));
      }
    }

    const videoPrevio = existing ? getVideoLink(parseArchivos(existing.archivos)) : null;
    if (pregunta.permiteVideoLink) {
      const videoRaw = String(args.formData.get(`video-${pregunta.id}`) ?? "").trim();
      if (videoRaw) {
        const error = validarVideoLink(videoRaw);
        const resolved = error ? null : resolveVideoEmbed(videoRaw);
        if (resolved) {
          const video: StoredVideoLink = {
            id: randomUUID(),
            kind: "video_link",
            url: resolved.url,
            provider: resolved.provider,
          };
          archivos.push(video);
        } else if (videoPrevio) {
          archivos.push(videoPrevio);
        }
      }
    } else if (videoPrevio) {
      archivos.push(videoPrevio);
    }

    pendientes.push({
      preguntaId: pregunta.id,
      valorStr: serializeValor(valor),
      archivosStr: JSON.stringify(archivos),
      existing,
    });
  }

  await prisma.$transaction(async (tx) => {
    for (const item of pendientes) {
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

      const changed =
        !item.existing ||
        item.existing.valor !== item.valorStr ||
        item.existing.archivos !== item.archivosStr;
      if (args.crearVersion) {
        const versions = await tx.respuestaVersion.count({
          where: { respuestaId: respuesta.id },
        });
        if (changed || versions === 0) {
          await tx.respuestaVersion.create({
            data: {
              respuestaId: respuesta.id,
              valor: item.valorStr,
              archivos: item.archivosStr,
            },
          });
        }
      }
    }
  });
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

  revalidatePath(`/emprendedor/postulaciones/${id}`);
  return { ok: true };
}

export async function enviarPostulacion(formData: FormData) {
  const user = await requireUser("EMPRENDEDOR");
  const id = String(formData.get("postulacionId") ?? "");
  const postulacion = await cargaPostulacionDelUsuario(id, user.id);
  if (!postulacion) return { error: "Caso no encontrado." };

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
      revalidatePath(`/emprendedor/postulaciones/${id}`);
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
      revalidatePath(`/emprendedor/postulaciones/${id}`);
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
    await prisma.asignacionEvaluador.updateMany({
      where: { postulacionId: id, estado: "CON_OBSERVACIONES" },
      data: { estado: "REPARADA", rondaActual: { increment: 1 } },
    });
  }

  await sincronizarEstadoPostulacion(id);
  revalidatePath(`/emprendedor/postulaciones/${id}`);
  revalidatePath("/emprendedor");
  revalidatePath("/evaluador");
  return { ok: true };
}
