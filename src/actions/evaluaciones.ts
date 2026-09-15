"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseEscalaNotas } from "@/lib/preguntas";
import { requireUser } from "@/lib/session";
import { sincronizarEstadoPostulacion } from "@/lib/sync-estado";

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
    },
  });
}

export async function guardarRevision(formData: FormData) {
  const user = await requireUser("EVALUADOR");
  const asignacionId = String(formData.get("asignacionId") ?? "");
  const asignacion = await cargaAsignacion(asignacionId, user.id);
  if (!asignacion) return { error: "Evaluación no encontrada." };
  if (asignacion.postulacion.convocatoria.estado !== "ABIERTA") {
    return { error: "La convocatoria está cerrada." };
  }
  if (asignacion.estado === "FINALIZADA") {
    return { error: "Esta evaluación ya está finalizada." };
  }
  if (asignacion.estado === "CON_OBSERVACIONES") {
    return { error: "Espera la corrección del emprendedor." };
  }

  if (asignacion.estado === "PENDIENTE" || asignacion.estado === "REPARADA") {
    await prisma.asignacionEvaluador.update({
      where: { id: asignacionId },
      data: { estado: "EN_REVISION" },
    });
  }

  const ronda = asignacion.rondaActual;
  const preguntas = asignacion.postulacion.convocatoria.formulario.preguntas;

  for (const pregunta of preguntas) {
    const veredicto = String(formData.get(`veredicto-${pregunta.id}`) ?? "");
    const comentario = String(formData.get(`comentario-${pregunta.id}`) ?? "").trim();
    if (veredicto !== "OK" && veredicto !== "OBSERVACION") continue;
    const notaRaw = String(formData.get(`nota-${pregunta.id}`) ?? "").trim();
    const notaParsed = Number(notaRaw);
    const nota = pregunta.conNotas && notaRaw !== "" && Number.isFinite(notaParsed) ? notaParsed : null;

    await prisma.revisionPregunta.upsert({
      where: {
        asignacionId_preguntaId_ronda: {
          asignacionId,
          preguntaId: pregunta.id,
          ronda,
        },
      },
      update: { veredicto, comentario, nota },
      create: {
        asignacionId,
        preguntaId: pregunta.id,
        ronda,
        veredicto,
        comentario,
        nota,
      },
    });
  }

  await sincronizarEstadoPostulacion(asignacion.postulacionId);
  revalidatePath(`/evaluador/evaluaciones/${asignacionId}`);
  revalidatePath("/evaluador");
  return { ok: true };
}

async function leerVeredictos(formData: FormData, preguntaIds: string[]) {
  return preguntaIds.map((preguntaId) => ({
    preguntaId,
    veredicto: String(formData.get(`veredicto-${preguntaId}`) ?? ""),
    comentario: String(formData.get(`comentario-${preguntaId}`) ?? "").trim(),
    notaRaw: String(formData.get(`nota-${preguntaId}`) ?? "").trim(),
  }));
}

export async function enviarObservaciones(formData: FormData) {
  const user = await requireUser("EVALUADOR");
  const asignacionId = String(formData.get("asignacionId") ?? "");
  const asignacion = await cargaAsignacion(asignacionId, user.id);
  if (!asignacion) return { error: "Evaluación no encontrada." };
  if (asignacion.postulacion.convocatoria.estado !== "ABIERTA") {
    return { error: "La convocatoria está cerrada." };
  }
  if (["FINALIZADA", "CON_OBSERVACIONES"].includes(asignacion.estado)) {
    return { error: "No puedes enviar observaciones en este estado." };
  }

  await guardarRevision(formData);

  const preguntas = asignacion.postulacion.convocatoria.formulario.preguntas;
  const items = await leerVeredictos(
    formData,
    preguntas.map((p) => p.id),
  );

  if (items.some((item) => item.veredicto !== "OK" && item.veredicto !== "OBSERVACION")) {
    return { error: "Marca todas las preguntas como Sin observaciones o Comentar observaciones." };
  }
  const observadas = items.filter((item) => item.veredicto === "OBSERVACION");
  if (observadas.length === 0) {
    return { error: "Para enviar observaciones, al menos una pregunta debe tener observación." };
  }
  if (observadas.some((item) => !item.comentario)) {
    return { error: "Cada observación debe incluir un comentario." };
  }

  await prisma.asignacionEvaluador.update({
    where: { id: asignacionId },
    data: { estado: "CON_OBSERVACIONES" },
  });
  await sincronizarEstadoPostulacion(asignacion.postulacionId);
  revalidatePath(`/evaluador/evaluaciones/${asignacionId}`);
  revalidatePath("/evaluador");
  revalidatePath("/emprendedor");
  return { ok: true };
}

export async function finalizarEvaluacion(formData: FormData) {
  const user = await requireUser("EVALUADOR");
  const asignacionId = String(formData.get("asignacionId") ?? "");
  const asignacion = await cargaAsignacion(asignacionId, user.id);
  if (!asignacion) return { error: "Evaluación no encontrada." };
  if (asignacion.postulacion.convocatoria.estado !== "ABIERTA") {
    return { error: "La convocatoria está cerrada." };
  }
  if (["FINALIZADA", "CON_OBSERVACIONES"].includes(asignacion.estado)) {
    return { error: "No puedes finalizar en este estado." };
  }

  await guardarRevision(formData);

  const preguntas = asignacion.postulacion.convocatoria.formulario.preguntas;
  const items = await leerVeredictos(
    formData,
    preguntas.map((p) => p.id),
  );

  if (items.some((item) => item.veredicto !== "OK")) {
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
    data: { estado: "FINALIZADA" },
  });
  await sincronizarEstadoPostulacion(asignacion.postulacionId);
  revalidatePath(`/evaluador/evaluaciones/${asignacionId}`);
  revalidatePath("/evaluador");
  revalidatePath("/emprendedor");
  return { ok: true };
}
