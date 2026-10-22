"use server";

import { revalidatePath } from "next/cache";
import {
  leerComentario,
  leerVeredictoGeneral,
  persistirBorradorEvaluacion,
} from "@/lib/borrador-revision";
import type { ModoEvaluacion } from "@/lib/modo-evaluacion";
import { prisma } from "@/lib/db";
import { parseModoEvaluacion } from "@/lib/modo-evaluacion";
import {
  estadoTrasPublicarEvaluacion,
  modoRevisionDeConvocatoria,
  publicaDirectoAlParticipante,
  supervisorActuaComoEvaluador,
  usaEvaluadores,
} from "@/lib/modo-revision";
import { parseEscalaNotas } from "@/lib/preguntas";
import { requireUser } from "@/lib/session";
import { evaluadorPuedeEditar } from "@/lib/estado";
import { sincronizarEstadoPostulacion } from "@/lib/sync-estado";
import {
  avisarCasoAprobado,
  avisarParticipanteObservaciones,
  avisarSupervisorNuevaRevision,
} from "@/lib/correo-notificacion";
import type { Role } from "@/lib/roles";

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

function puedeActuarEnEvaluacion(
  user: { id: string; role: Role },
  asignacion: {
    evaluadorId: string;
    postulacion: {
      convocatoria: {
        tipo?: string | null;
        evaluadoresHabilitados?: boolean | null;
        supervisoresHabilitados?: boolean | null;
      };
    };
  },
): boolean {
  if (asignacion.evaluadorId !== user.id) return false;
  const modo = modoRevisionDeConvocatoria(asignacion.postulacion.convocatoria);
  if (user.role === "EVALUADOR") return usaEvaluadores(modo);
  if (user.role === "SUPERVISOR") return supervisorActuaComoEvaluador(modo);
  return false;
}

export async function guardarRevision(formData: FormData) {
  const user = await requireUser("EVALUADOR");
  const asignacionId = String(formData.get("asignacionId") ?? "");
  const asignacion = await cargaAsignacion(asignacionId, user.id);
  if (!asignacion) return { error: "Evaluación no encontrada." };
  if (!puedeActuarEnEvaluacion(user, asignacion)) {
    return { error: "No tienes permiso para editar esta evaluación." };
  }

  const expectedUpdatedAt = String(formData.get("expectedUpdatedAt") ?? "").trim() || null;
  const resultado = await persistirBorradorEvaluacion({
    userId: user.id,
    rol: user.role,
    formData,
    expectedUpdatedAt,
    cambiarEstado: true,
    permitirSinVeredicto: false,
  });
  if ("error" in resultado) return { error: resultado.error };
  if ("conflict" in resultado) {
    return { error: "No se pudo guardar.", conflict: true as const, updatedAt: resultado.updatedAt };
  }

  revalidatePath(`/evaluador/evaluaciones/${asignacionId}`);
  revalidatePath("/evaluador");
  return { ok: true as const, updatedAt: resultado.updatedAt };
}

async function validarComentarioEvaluacion(
  formData: FormData,
  modo: ModoEvaluacion,
  asignacion: { postulacion: { convocatoria: { formulario: { preguntas: { id: string }[] } } } },
) {
  if (modo === "GENERAL") {
    const general = leerVeredictoGeneral(formData);
    if (!general.comentario) {
      return { error: "La evaluación debe incluir un comentario." };
    }
    return null;
  }
  const items = await leerVeredictos(
    formData,
    asignacion.postulacion.convocatoria.formulario.preguntas.map((pregunta) => pregunta.id),
  );
  if (items.some((item) => !item.comentario)) {
    return { error: "Cada pregunta debe incluir un comentario." };
  }
  return null;
}

async function leerVeredictos(formData: FormData, preguntaIds: string[]) {
  return preguntaIds.map((preguntaId) => ({
    preguntaId,
    veredicto: String(formData.get(`veredicto-${preguntaId}`) ?? ""),
    comentario: leerComentario(formData, `comentario-${preguntaId}`),
    notaRaw: String(formData.get(`nota-${preguntaId}`) ?? "").trim(),
  }));
}

async function publicarOEnviarASupervision(args: {
  user: { id: string; role: Role; name?: string | null };
  formData: FormData;
  intencion: "OBSERVACIONES" | "FINALIZAR";
}) {
  const asignacionId = String(args.formData.get("asignacionId") ?? "");
  const asignacion = await cargaAsignacion(asignacionId, args.user.id);
  if (!asignacion) return { error: "Evaluación no encontrada." };
  if (!puedeActuarEnEvaluacion(args.user, asignacion)) {
    return { error: "No tienes permiso para editar esta evaluación." };
  }
  if (!evaluadorPuedeEditar(asignacion.estado)) {
    return {
      error:
        args.intencion === "FINALIZAR"
          ? "No puedes finalizar en este estado."
          : "No puedes enviar observaciones en este estado.",
    };
  }

  const guardado = await guardarRevision(args.formData);
  if (guardado && "error" in guardado && guardado.error) return guardado;

  const modoEval = parseModoEvaluacion(asignacion.postulacion.convocatoria.formulario.modoEvaluacion);
  const errorComentario = await validarComentarioEvaluacion(args.formData, modoEval, asignacion);
  if (errorComentario) return errorComentario;

  if (args.intencion === "FINALIZAR") {
    const preguntas = asignacion.postulacion.convocatoria.formulario.preguntas;
    const items = await leerVeredictos(
      args.formData,
      preguntas.map((p) => p.id),
    );
    const sinNota = preguntas.filter((pregunta) => {
      if (!pregunta.conNotas) return false;
      const item = items.find((entrada) => entrada.preguntaId === pregunta.id);
      const nota = Number(item?.notaRaw ?? "");
      const escala = parseEscalaNotas(pregunta.escalaNotas);
      const valores = escala.map((peldano) => peldano.valor);
      return !Number.isFinite(nota) || (valores.length > 0 && !valores.includes(nota));
    });
    if (sinNota.length > 0) {
      return {
        error: "Para finalizar, debes asignar una nota a todas las preguntas que se evalúan con notas.",
      };
    }
  }

  const modo = modoRevisionDeConvocatoria(asignacion.postulacion.convocatoria);
  const directo = publicaDirectoAlParticipante(modo);
  const siguienteEstado = estadoTrasPublicarEvaluacion(modo, args.intencion);

  await prisma.asignacionEvaluador.update({
    where: { id: asignacionId },
    data: {
      estado: siguienteEstado,
      intencionPendiente: directo ? null : args.intencion,
    },
  });
  await sincronizarEstadoPostulacion(asignacion.postulacionId);

  if (directo) {
    if (args.intencion === "OBSERVACIONES") {
      await avisarParticipanteObservaciones(asignacion.postulacionId);
    } else {
      const postulacion = await prisma.postulacion.findUnique({
        where: { id: asignacion.postulacionId },
        select: { estado: true },
      });
      if (postulacion?.estado === "FINALIZADA") {
        await avisarCasoAprobado(asignacion.postulacionId);
      }
    }
  } else {
    await avisarSupervisorNuevaRevision({
      postulacionId: asignacion.postulacionId,
      actorNombre: args.user.name ?? "Un evaluador",
      intencion: args.intencion,
    });
  }

  revalidatePath(`/evaluador/evaluaciones/${asignacionId}`);
  revalidatePath("/evaluador");
  revalidatePath("/participante");
  return { ok: true };
}

export async function enviarObservaciones(formData: FormData) {
  const user = await requireUser("EVALUADOR");
  return publicarOEnviarASupervision({
    user,
    formData,
    intencion: "OBSERVACIONES",
  });
}

export async function finalizarEvaluacion(formData: FormData) {
  const user = await requireUser("EVALUADOR");
  return publicarOEnviarASupervision({
    user,
    formData,
    intencion: "FINALIZAR",
  });
}
