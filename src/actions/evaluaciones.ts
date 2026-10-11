"use server";

import { revalidatePath } from "next/cache";
import {
  esVeredictoValido,
  leerComentario,
  leerVeredictoGeneral,
  persistirBorradorEvaluacion,
} from "@/lib/borrador-revision";
import { prisma } from "@/lib/db";
import { parseModoEvaluacion } from "@/lib/modo-evaluacion";
import { parseEscalaNotas } from "@/lib/preguntas";
import { requireUser } from "@/lib/session";
import { evaluadorPuedeEditar } from "@/lib/estado";
import { sincronizarEstadoPostulacion } from "@/lib/sync-estado";
import { avisarSupervisorNuevaRevision } from "@/lib/correo-notificacion";

async function cargaAsignacion(id: string, evaluadorId: string) {
  return prisma.asignacionEvaluador.findFirst({
    where: { id, evaluadorId },
    include: {
      postulacion: {
        include: {
          convocatoria: { include: { formulario: { include: { preguntas: true } } } },
        },
      },
      revisiones: true,
      revisionesGenerales: true,
    },
  });
}

export async function guardarRevision(formData: FormData) {
  const user = await requireUser("EVALUADOR");
  const resultado = await persistirBorradorEvaluacion({
    userId: user.id,
    formData,
    cambiarEstado: true,
    permitirSinVeredicto: false,
  });
  if ("error" in resultado) return { error: resultado.error };
  if ("conflict" in resultado) return { error: "No se pudo guardar." };

  const asignacionId = String(formData.get("asignacionId") ?? "");
  revalidatePath(`/evaluador/evaluaciones/${asignacionId}`);
  revalidatePath("/evaluador");
  return { ok: true as const, updatedAt: resultado.updatedAt };
}

async function leerVeredictos(formData: FormData, preguntaIds: string[]) {
  return preguntaIds.map((preguntaId) => ({
    preguntaId,
    veredicto: String(formData.get(`veredicto-${preguntaId}`) ?? ""),
    comentario: leerComentario(formData, `comentario-${preguntaId}`),
    notaRaw: String(formData.get(`nota-${preguntaId}`) ?? "").trim(),
  }));
}

export async function enviarObservaciones(formData: FormData) {
  const user = await requireUser("EVALUADOR");
  const asignacionId = String(formData.get("asignacionId") ?? "");
  const asignacion = await cargaAsignacion(asignacionId, user.id);
  if (!asignacion) return { error: "Evaluación no encontrada." };
  if (!evaluadorPuedeEditar(asignacion.estado)) {
    return { error: "No puedes enviar observaciones en este estado." };
  }

  const guardado = await guardarRevision(formData);
  if (guardado && "error" in guardado && guardado.error) return guardado;

  const modo = parseModoEvaluacion(asignacion.postulacion.convocatoria.formulario.modoEvaluacion);

  if (modo === "GENERAL") {
    const general = leerVeredictoGeneral(formData);
    if (general.veredicto !== "OBSERVACION") {
      return { error: "Para enviar observaciones, marca la observación general." };
    }
    if (!general.comentario) {
      return { error: "La observación general debe incluir un comentario." };
    }
  } else {
    const preguntas = asignacion.postulacion.convocatoria.formulario.preguntas;
    const items = await leerVeredictos(
      formData,
      preguntas.map((p) => p.id),
    );

    if (items.some((item) => !esVeredictoValido(item.veredicto))) {
      return { error: "Marca todas las preguntas como Sin observaciones o Comentar observaciones." };
    }
    const observadas = items.filter((item) => item.veredicto === "OBSERVACION");
    if (observadas.length === 0) {
      return { error: "Para enviar observaciones, al menos una pregunta debe tener observación." };
    }
    if (observadas.some((item) => !item.comentario)) {
      return { error: "Cada observación debe incluir un comentario." };
    }
  }

  await prisma.asignacionEvaluador.update({
    where: { id: asignacionId },
    data: { estado: "EN_SUPERVISION", intencionPendiente: "OBSERVACIONES" },
  });
  await sincronizarEstadoPostulacion(asignacion.postulacionId);
  await avisarSupervisorNuevaRevision({
    postulacionId: asignacion.postulacionId,
    actorNombre: user.name ?? "Un evaluador",
  });
  revalidatePath(`/evaluador/evaluaciones/${asignacionId}`);
  revalidatePath("/evaluador");
  revalidatePath("/participante");
  return { ok: true };
}

export async function finalizarEvaluacion(formData: FormData) {
  const user = await requireUser("EVALUADOR");
  const asignacionId = String(formData.get("asignacionId") ?? "");
  const asignacion = await cargaAsignacion(asignacionId, user.id);
  if (!asignacion) return { error: "Evaluación no encontrada." };
  if (!evaluadorPuedeEditar(asignacion.estado)) {
    return { error: "No puedes finalizar en este estado." };
  }

  const guardado = await guardarRevision(formData);
  if (guardado && "error" in guardado && guardado.error) return guardado;

  const preguntas = asignacion.postulacion.convocatoria.formulario.preguntas;
  const modo = parseModoEvaluacion(asignacion.postulacion.convocatoria.formulario.modoEvaluacion);
  const items = await leerVeredictos(
    formData,
    preguntas.map((p) => p.id),
  );

  if (modo === "GENERAL") {
    const general = leerVeredictoGeneral(formData);
    if (general.veredicto !== "OK") {
      return { error: "Para finalizar, la observación general debe quedar sin observaciones." };
    }
  } else if (items.some((item) => item.veredicto !== "OK")) {
    return { error: "Para finalizar, todas las preguntas deben quedar sin observaciones." };
  }

  const sinNota = preguntas.filter((pregunta) => {
    if (!pregunta.conNotas) return false;
    const item = items.find((entrada) => entrada.preguntaId === pregunta.id);
    const nota = Number(item?.notaRaw ?? "");
    const escala = parseEscalaNotas(pregunta.escalaNotas);
    const valores = escala.map((peldano) => peldano.valor);
    return !Number.isFinite(nota) || (valores.length > 0 && !valores.includes(nota));
  });
  if (sinNota.length > 0) {
    return { error: "Para finalizar, debes asignar una nota a todas las preguntas que se evalúan con notas." };
  }

  await prisma.asignacionEvaluador.update({
    where: { id: asignacionId },
    data: { estado: "EN_SUPERVISION", intencionPendiente: "FINALIZAR" },
  });
  await sincronizarEstadoPostulacion(asignacion.postulacionId);
  await avisarSupervisorNuevaRevision({
    postulacionId: asignacion.postulacionId,
    actorNombre: user.name ?? "Un evaluador",
  });
  revalidatePath(`/evaluador/evaluaciones/${asignacionId}`);
  revalidatePath("/evaluador");
  revalidatePath("/participante");
  return { ok: true };
}
