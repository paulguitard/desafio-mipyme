"use server";

import { revalidatePath } from "next/cache";
import {
  leerComentario,
  leerVeredictoGeneral,
  persistirBorradorSupervision,
} from "@/lib/borrador-revision";
import { prisma } from "@/lib/db";
import { parseModoEvaluacion } from "@/lib/modo-evaluacion";
import { requireUser } from "@/lib/session";
import { sincronizarEstadoPostulacion } from "@/lib/sync-estado";
import {
  avisarEvaluadorDevolucionSupervisor,
  avisarTrasAprobacionSupervisor,
  avisarCasoAprobado,
} from "@/lib/correo-notificacion";

async function cargaAsignacionParaSupervisor(asignacionId: string, supervisorId: string) {
  return prisma.asignacionEvaluador.findFirst({
    where: {
      id: asignacionId,
      postulacion: { supervision: { supervisorId } },
    },
    include: {
      postulacion: {
        include: {
          convocatoria: { include: { formulario: { include: { preguntas: true } } } },
          supervision: true,
        },
      },
    },
  });
}

function revalidateSupervision(asignacionId: string, postulacionId: string) {
  revalidatePath(`/evaluador/supervision/${postulacionId}`);
  revalidatePath(`/evaluador/evaluaciones/${asignacionId}`);
  revalidatePath("/evaluador");
  revalidatePath("/participante");
}

export async function guardarSupervision(formData: FormData) {
  const user = await requireUser("SUPERVISOR");
  const expectedUpdatedAt = String(formData.get("expectedUpdatedAt") ?? "").trim() || null;
  const resultado = await persistirBorradorSupervision({
    userId: user.id,
    formData,
    expectedUpdatedAt,
    permitirSinVeredicto: false,
  });
  if ("error" in resultado) return { error: resultado.error };
  if ("conflict" in resultado) {
    return { error: "No se pudo guardar.", conflict: true as const, updatedAt: resultado.updatedAt };
  }

  const asignacionId = String(formData.get("asignacionId") ?? "");
  const asignacion = await prisma.asignacionEvaluador.findUnique({
    where: { id: asignacionId },
    select: { postulacionId: true },
  });
  if (asignacion) {
    revalidateSupervision(asignacionId, asignacion.postulacionId);
  }
  return { ok: true as const, updatedAt: resultado.updatedAt };
}

export async function enviarObservacionesSupervision(formData: FormData) {
  const user = await requireUser("SUPERVISOR");
  const asignacionId = String(formData.get("asignacionId") ?? "");
  const asignacion = await cargaAsignacionParaSupervisor(asignacionId, user.id);
  if (!asignacion) return { error: "Evaluación no encontrada." };
  if (asignacion.estado !== "EN_SUPERVISION") {
    return { error: "Solo puedes devolver evaluaciones que están en supervisión." };
  }

  const guardado = await guardarSupervision(formData);
  if (guardado?.error) return guardado;

  const modo = parseModoEvaluacion(asignacion.postulacion.convocatoria.formulario.modoEvaluacion);
  const ciclo = asignacion.cicloSupervision;

  if (modo === "GENERAL") {
    const general = leerVeredictoGeneral(formData);
    if (general.veredicto !== "OBSERVACION") {
      return { error: "Para pedir cambios al evaluador, elige esa opción." };
    }
    if (!general.comentario) {
      return { error: "Debes incluir un comentario para el evaluador." };
    }
  } else {
    const preguntas = asignacion.postulacion.convocatoria.formulario.preguntas;
    const items = preguntas.map((pregunta) => ({
      veredicto: String(formData.get(`veredicto-${pregunta.id}`) ?? ""),
      comentario: leerComentario(formData, `comentario-${pregunta.id}`),
    }));
    if (items.some((item) => item.veredicto !== "OBSERVACION")) {
      return { error: "Elige Pedir cambios al evaluador para enviar el comentario." };
    }
    if (items.some((item) => !item.comentario)) {
      return { error: "Cada pregunta debe incluir un comentario para el evaluador." };
    }
  }

  await prisma.asignacionEvaluador.update({
    where: { id: asignacionId },
    data: {
      estado: "DEVUELTA_SUPERVISOR",
      cicloSupervision: ciclo + 1,
    },
  });
  await sincronizarEstadoPostulacion(asignacion.postulacionId);
  await avisarEvaluadorDevolucionSupervisor({
    asignacionId,
    actorNombre: user.name ?? "El supervisor",
  });
  revalidateSupervision(asignacionId, asignacion.postulacionId);
  return { ok: true };
}

export async function procederSupervision(formData: FormData) {
  const user = await requireUser("SUPERVISOR");
  const asignacionId = String(formData.get("asignacionId") ?? "");
  const asignacion = await cargaAsignacionParaSupervisor(asignacionId, user.id);
  if (!asignacion) return { error: "Evaluación no encontrada." };
  if (asignacion.estado !== "EN_SUPERVISION") {
    return { error: "Solo puedes proceder evaluaciones que están en supervisión." };
  }
  if (
    asignacion.intencionPendiente !== "OBSERVACIONES" &&
    asignacion.intencionPendiente !== "FINALIZAR"
  ) {
    return { error: "Esta evaluación no tiene una intención pendiente del evaluador." };
  }

  const expectedUpdatedAt = String(formData.get("expectedUpdatedAt") ?? "").trim() || null;
  const resultado = await persistirBorradorSupervision({
    userId: user.id,
    formData,
    expectedUpdatedAt,
    permitirSinVeredicto: false,
    forzarOkSinComentario: true,
  });
  if ("error" in resultado) return { error: resultado.error };
  if ("conflict" in resultado) {
    return { error: "No se pudo guardar.", conflict: true as const, updatedAt: resultado.updatedAt };
  }

  const siguienteEstado =
    asignacion.intencionPendiente === "FINALIZAR" ? "FINALIZADA" : "CON_OBSERVACIONES";

  await prisma.asignacionEvaluador.update({
    where: { id: asignacionId },
    data: {
      estado: siguienteEstado,
      intencionPendiente: null,
    },
  });
  await sincronizarEstadoPostulacion(asignacion.postulacionId);
  const postulacion = await prisma.postulacion.findUnique({
    where: { id: asignacion.postulacionId },
    select: { estado: true },
  });
  const casoAprobado = siguienteEstado === "FINALIZADA" && postulacion?.estado === "FINALIZADA";
  if (casoAprobado) {
    await avisarCasoAprobado(asignacion.postulacionId);
  } else {
    await avisarTrasAprobacionSupervisor({
      asignacionId,
      actorNombre: user.name ?? "El supervisor",
      resultado: asignacion.intencionPendiente === "FINALIZAR" ? "finalizacion" : "observaciones",
    });
  }
  revalidateSupervision(asignacionId, asignacion.postulacionId);
  return { ok: true };
}
