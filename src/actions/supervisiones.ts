"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseModoEvaluacion } from "@/lib/modo-evaluacion";
import { requireUser } from "@/lib/session";
import { sincronizarEstadoPostulacion } from "@/lib/sync-estado";
import {
  avisarEvaluadorDevolucionSupervisor,
  avisarTrasAprobacionSupervisor,
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

function leerVeredictoGeneral(formData: FormData) {
  return {
    veredicto: String(formData.get("veredicto-general") ?? ""),
    comentario: String(formData.get("comentario-general") ?? "").trim(),
  };
}

async function guardarSupervisionPorPregunta(
  formData: FormData,
  asignacionId: string,
  ronda: number,
  ciclo: number,
  preguntas: { id: string }[],
) {
  for (const pregunta of preguntas) {
    const veredicto = String(formData.get(`veredicto-${pregunta.id}`) ?? "");
    const comentario = String(formData.get(`comentario-${pregunta.id}`) ?? "").trim();
    if (veredicto !== "OK" && veredicto !== "OBSERVACION") continue;

    await prisma.supervisionPregunta.upsert({
      where: {
        asignacionId_preguntaId_ronda_ciclo: {
          asignacionId,
          preguntaId: pregunta.id,
          ronda,
          ciclo,
        },
      },
      update: { veredicto, comentario: veredicto === "OBSERVACION" ? comentario : "" },
      create: {
        asignacionId,
        preguntaId: pregunta.id,
        ronda,
        ciclo,
        veredicto,
        comentario: veredicto === "OBSERVACION" ? comentario : "",
      },
    });
  }
}

async function guardarSupervisionGeneral(
  formData: FormData,
  asignacionId: string,
  ronda: number,
  ciclo: number,
) {
  const { veredicto, comentario } = leerVeredictoGeneral(formData);
  if (veredicto !== "OK" && veredicto !== "OBSERVACION") return;

  await prisma.supervisionGeneral.upsert({
    where: {
      asignacionId_ronda_ciclo: { asignacionId, ronda, ciclo },
    },
    update: { veredicto, comentario: veredicto === "OBSERVACION" ? comentario : "" },
    create: {
      asignacionId,
      ronda,
      ciclo,
      veredicto,
      comentario: veredicto === "OBSERVACION" ? comentario : "",
    },
  });
}

export async function guardarSupervision(formData: FormData) {
  const user = await requireUser("SUPERVISOR");
  const asignacionId = String(formData.get("asignacionId") ?? "");
  const asignacion = await cargaAsignacionParaSupervisor(asignacionId, user.id);
  if (!asignacion) return { error: "Evaluación no encontrada." };
  if (asignacion.postulacion.convocatoria.estado !== "ABIERTA") {
    return { error: "La mentoría está cerrada." };
  }
  if (asignacion.estado !== "EN_SUPERVISION") {
    return { error: "Solo puedes supervisar evaluaciones enviadas al supervisor." };
  }

  const ronda = asignacion.rondaActual;
  const ciclo = asignacion.cicloSupervision;
  const preguntas = asignacion.postulacion.convocatoria.formulario.preguntas;
  const modo = parseModoEvaluacion(asignacion.postulacion.convocatoria.formulario.modoEvaluacion);

  if (modo === "GENERAL") {
    await guardarSupervisionGeneral(formData, asignacionId, ronda, ciclo);
  } else {
    await guardarSupervisionPorPregunta(formData, asignacionId, ronda, ciclo, preguntas);
  }

  revalidateSupervision(asignacionId, asignacion.postulacionId);
  return { ok: true };
}

export async function enviarObservacionesSupervision(formData: FormData) {
  const user = await requireUser("SUPERVISOR");
  const asignacionId = String(formData.get("asignacionId") ?? "");
  const asignacion = await cargaAsignacionParaSupervisor(asignacionId, user.id);
  if (!asignacion) return { error: "Evaluación no encontrada." };
  if (asignacion.postulacion.convocatoria.estado !== "ABIERTA") {
    return { error: "La mentoría está cerrada." };
  }
  if (asignacion.estado !== "EN_SUPERVISION") {
    return { error: "Solo puedes devolver evaluaciones que están en supervisión." };
  }

  const guardado = await guardarSupervision(formData);
  if (guardado?.error) return guardado;

  const modo = parseModoEvaluacion(asignacion.postulacion.convocatoria.formulario.modoEvaluacion);
  const ronda = asignacion.rondaActual;
  const ciclo = asignacion.cicloSupervision;

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
    const items = preguntas.map((pregunta) => ({
      veredicto: String(formData.get(`veredicto-${pregunta.id}`) ?? ""),
      comentario: String(formData.get(`comentario-${pregunta.id}`) ?? "").trim(),
    }));
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
  if (asignacion.postulacion.convocatoria.estado !== "ABIERTA") {
    return { error: "La mentoría está cerrada." };
  }
  if (asignacion.estado !== "EN_SUPERVISION") {
    return { error: "Solo puedes proceder evaluaciones que están en supervisión." };
  }
  if (
    asignacion.intencionPendiente !== "OBSERVACIONES" &&
    asignacion.intencionPendiente !== "FINALIZAR"
  ) {
    return { error: "Esta evaluación no tiene una intención pendiente del evaluador." };
  }

  const guardado = await guardarSupervision(formData);
  if (guardado?.error) return guardado;

  const modo = parseModoEvaluacion(asignacion.postulacion.convocatoria.formulario.modoEvaluacion);
  const preguntas = asignacion.postulacion.convocatoria.formulario.preguntas;

  if (modo === "GENERAL") {
    const general = leerVeredictoGeneral(formData);
    if (general.veredicto !== "OK") {
      return { error: "Para proceder, la supervisión general debe quedar sin observaciones." };
    }
  } else {
    const items = preguntas.map((pregunta) => String(formData.get(`veredicto-${pregunta.id}`) ?? ""));
    if (items.some((veredicto) => veredicto !== "OK")) {
      return { error: "Para proceder, todas las preguntas deben quedar sin observaciones." };
    }
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
  await avisarTrasAprobacionSupervisor({
    asignacionId,
    actorNombre: user.name ?? "El supervisor",
    resultado: asignacion.intencionPendiente === "FINALIZAR" ? "finalizacion" : "observaciones",
  });
  revalidateSupervision(asignacionId, asignacion.postulacionId);
  return { ok: true };
}
