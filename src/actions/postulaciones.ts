"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  errorFormatoRespuestasFormulario,
  persistirBorradorCaso,
  persistirRespuestas,
  preguntasObservadas,
  respuestaVacia,
} from "@/lib/borrador-caso";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { parseValor, validarValorRespuesta } from "@/lib/preguntas";
import { postulacionEditable, type EstadoPostulacion } from "@/lib/estado";
import {
  convocatoriaAbiertaParaPostular,
  convocatoriaDisponibleParaNuevosCasos,
} from "@/lib/convocatoria";
import { esMentoriaContenido } from "@/lib/tipo-formulario";
import { sincronizarEstadoPostulacion } from "@/lib/sync-estado";
import { avisarEvaluadoresRespuestaReenviada } from "@/lib/correo-notificacion";

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

export async function guardarBorrador(formData: FormData) {
  const user = await requireUser("EMPRENDEDOR");
  const id = String(formData.get("postulacionId") ?? "");
  const expectedUpdatedAt = String(formData.get("expectedUpdatedAt") ?? "").trim() || null;
  const resultado = await persistirBorradorCaso({
    userId: user.id,
    formData,
    expectedUpdatedAt,
  });
  if ("error" in resultado) return { error: resultado.error };
  if ("conflict" in resultado) {
    return { error: "No se pudo guardar.", conflict: true as const, updatedAt: resultado.updatedAt };
  }

  revalidatePath(`/participante/postulaciones/${id}`);
  return {
    ok: true as const,
    updatedAt: resultado.updatedAt,
    ...(resultado.archivoError ? { archivoError: resultado.archivoError } : {}),
  };
}

export async function enviarPostulacion(formData: FormData) {
  const user = await requireUser("EMPRENDEDOR");
  const id = String(formData.get("postulacionId") ?? "");
  const expectedUpdatedAt = String(formData.get("expectedUpdatedAt") ?? "").trim() || null;
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
    let token = expectedUpdatedAt;
    let persistido = await persistirRespuestas({
      postulacionId: id,
      formData,
      preguntas: postulacion.convocatoria.formulario.preguntas,
      editableIds: observadas && observadas.size > 0 ? observadas : null,
      crearVersion: true,
      expectedUpdatedAt: token,
    });
    if ("conflict" in persistido) {
      token = persistido.updatedAt;
      persistido = await persistirRespuestas({
        postulacionId: id,
        formData,
        preguntas: postulacion.convocatoria.formulario.preguntas,
        editableIds: observadas && observadas.size > 0 ? observadas : null,
        crearVersion: true,
        expectedUpdatedAt: token,
      });
    }
    if ("conflict" in persistido) {
      persistido = await persistirRespuestas({
        postulacionId: id,
        formData,
        preguntas: postulacion.convocatoria.formulario.preguntas,
        editableIds: observadas && observadas.size > 0 ? observadas : null,
        crearVersion: true,
        expectedUpdatedAt: null,
      });
    }
    if ("conflict" in persistido) {
      return {
        error: "No se pudo enviar. Tu borrador quedó guardado.",
        conflict: true as const,
        updatedAt: persistido.updatedAt,
      };
    }
  } catch (error) {
    console.error("enviarPostulacion", error);
    const mensaje = error instanceof Error ? error.message : "";
    if (/Transaction not found|expired transaction|Transaction already closed/i.test(mensaje)) {
      return {
        error:
          "No se pudo enviar. Tu borrador quedó guardado. El servidor tardó demasiado; intentá de nuevo.",
      };
    }
    return { error: mensaje || "No se pudo enviar." };
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

export async function guardarCasoAdmin(formData: FormData) {
  await requireUser("ADMIN");
  const id = String(formData.get("postulacionId") ?? "");
  if (!id) return { error: "Caso no encontrado." };

  const postulacion = await prisma.postulacion.findUnique({
    where: { id },
    include: {
      convocatoria: {
        include: { formulario: { include: { preguntas: { orderBy: { orden: "asc" } } } } },
      },
      respuestas: true,
    },
  });
  if (!postulacion) return { error: "Caso no encontrado." };
  if (esMentoriaContenido(postulacion.convocatoria.tipo)) {
    return { error: "Esta asesoría de contenido no se edita." };
  }

  const preguntas = postulacion.convocatoria.formulario.preguntas;
  const errorFormato = errorFormatoRespuestasFormulario({
    formData,
    preguntas,
    respuestasExistentes: postulacion.respuestas,
  });
  if (errorFormato) return { error: errorFormato };

  const expectedUpdatedAt = String(formData.get("expectedUpdatedAt") ?? "").trim() || null;
  try {
    const persistido = await persistirRespuestas({
      postulacionId: id,
      formData,
      preguntas,
      editableIds: null,
      crearVersion: false,
      reescribirVersionVigente: true,
      expectedUpdatedAt,
    });
    if ("conflict" in persistido) {
      return { error: "No se pudo guardar.", conflict: true as const, updatedAt: persistido.updatedAt };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo guardar." };
  }

  revalidatePath(`/admin/mentorias/${postulacion.convocatoriaId}`);
  revalidatePath(`/admin/mentorias/${postulacion.convocatoriaId}/casos/${id}`);
  revalidatePath(`/participante/postulaciones/${id}`);
  revalidatePath("/evaluador");
  revalidatePath("/supervisor");
  return { ok: true as const };
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
