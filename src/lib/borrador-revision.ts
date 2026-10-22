import { debePersistirCampoRevision } from "@/lib/autoguardado";
import { sanitizarComentarioObservacion } from "@/lib/comentario-observacion";
import type { ResultadoBorrador } from "@/lib/borrador-caso";
import { prisma } from "@/lib/db";
import { evaluadorPuedeEditar } from "@/lib/estado";
import { parseModoEvaluacion } from "@/lib/modo-evaluacion";
import {
  modoRevisionDeConvocatoria,
  puedeGuardarBorradorEvaluacion,
} from "@/lib/modo-revision";
import type { Role } from "@/lib/roles";
import { sincronizarEstadoPostulacion } from "@/lib/sync-estado";

function leerComentario(formData: FormData, name: string) {
  return sanitizarComentarioObservacion(String(formData.get(name) ?? ""));
}

function leerVeredictoGeneral(formData: FormData) {
  return {
    veredicto: String(formData.get("veredicto-general") ?? ""),
    comentario: leerComentario(formData, "comentario-general"),
  };
}

function esVeredictoValido(veredicto: string) {
  return veredicto === "OK" || veredicto === "OBSERVACION";
}

type OpcionesPersistir = {
  permitirSinVeredicto?: boolean;
  forzarOkSinComentario?: boolean;
};

async function persistirRevisionPorPregunta(
  formData: FormData,
  asignacionId: string,
  ronda: number,
  ciclo: number,
  preguntas: { id: string; conNotas: boolean }[],
  opciones?: OpcionesPersistir,
) {
  for (const pregunta of preguntas) {
    const veredictoRaw = String(formData.get(`veredicto-${pregunta.id}`) ?? "");
    const veredicto = opciones?.forzarOkSinComentario
      ? esVeredictoValido(veredictoRaw)
        ? "OK"
        : veredictoRaw
      : veredictoRaw;
    const comentario = opciones?.forzarOkSinComentario
      ? ""
      : leerComentario(formData, `comentario-${pregunta.id}`);
    const notaRaw = String(formData.get(`nota-${pregunta.id}`) ?? "").trim();
    const notaParsed = Number(notaRaw);
    const nota = pregunta.conNotas && notaRaw !== "" && Number.isFinite(notaParsed) ? notaParsed : null;

    const tieneVeredicto = esVeredictoValido(veredicto);
    if (
      !debePersistirCampoRevision({
        veredicto,
        comentario,
        nota,
        permitirSinVeredicto: Boolean(opciones?.permitirSinVeredicto),
      })
    ) {
      continue;
    }

    const veredictoGuardado = tieneVeredicto ? veredicto : "";

    await prisma.revisionPregunta.upsert({
      where: {
        asignacionId_preguntaId_ronda_ciclo: {
          asignacionId,
          preguntaId: pregunta.id,
          ronda,
          ciclo,
        },
      },
      update: { veredicto: veredictoGuardado, comentario, nota },
      create: {
        asignacionId,
        preguntaId: pregunta.id,
        ronda,
        ciclo,
        veredicto: veredictoGuardado,
        comentario,
        nota,
      },
    });
  }
}

async function persistirRevisionGeneral(
  formData: FormData,
  asignacionId: string,
  ronda: number,
  ciclo: number,
  opciones?: OpcionesPersistir,
) {
  const { veredicto, comentario } = leerVeredictoGeneral(formData);
  const tieneVeredicto = esVeredictoValido(veredicto);
  if (
    !debePersistirCampoRevision({
      veredicto,
      comentario,
      nota: null,
      permitirSinVeredicto: Boolean(opciones?.permitirSinVeredicto),
    })
  ) {
    return;
  }

  const veredictoGuardado = tieneVeredicto ? veredicto : "";
  const comentarioGuardado =
    veredictoGuardado === "OBSERVACION" || (!tieneVeredicto && Boolean(comentario))
      ? comentario
      : "";

  await prisma.revisionGeneral.upsert({
    where: {
      asignacionId_ronda_ciclo: { asignacionId, ronda, ciclo },
    },
    update: { veredicto: veredictoGuardado, comentario: comentarioGuardado },
    create: {
      asignacionId,
      ronda,
      ciclo,
      veredicto: veredictoGuardado,
      comentario: comentarioGuardado,
    },
  });
}

async function persistirSupervisionPorPregunta(
  formData: FormData,
  asignacionId: string,
  ronda: number,
  ciclo: number,
  preguntas: { id: string }[],
  opciones?: OpcionesPersistir,
) {
  for (const pregunta of preguntas) {
    const veredictoRaw = String(formData.get(`veredicto-${pregunta.id}`) ?? "");
    const veredicto = opciones?.forzarOkSinComentario ? "OK" : veredictoRaw;
    const comentario = opciones?.forzarOkSinComentario
      ? ""
      : leerComentario(formData, `comentario-${pregunta.id}`);
    const tieneVeredicto = esVeredictoValido(veredicto);
    if (
      !debePersistirCampoRevision({
        veredicto,
        comentario,
        nota: null,
        permitirSinVeredicto: Boolean(opciones?.permitirSinVeredicto),
      })
    ) {
      continue;
    }

    const veredictoGuardado = tieneVeredicto ? veredicto : "";
    const comentarioGuardado =
      veredictoGuardado === "OBSERVACION" || (!tieneVeredicto && Boolean(comentario))
        ? comentario
        : "";

    await prisma.supervisionPregunta.upsert({
      where: {
        asignacionId_preguntaId_ronda_ciclo: {
          asignacionId,
          preguntaId: pregunta.id,
          ronda,
          ciclo,
        },
      },
      update: { veredicto: veredictoGuardado, comentario: comentarioGuardado },
      create: {
        asignacionId,
        preguntaId: pregunta.id,
        ronda,
        ciclo,
        veredicto: veredictoGuardado,
        comentario: comentarioGuardado,
      },
    });
  }
}

async function persistirSupervisionGeneral(
  formData: FormData,
  asignacionId: string,
  ronda: number,
  ciclo: number,
  opciones?: OpcionesPersistir,
) {
  const leido = leerVeredictoGeneral(formData);
  const veredicto = opciones?.forzarOkSinComentario ? "OK" : leido.veredicto;
  const comentario = opciones?.forzarOkSinComentario ? "" : leido.comentario;
  const tieneVeredicto = esVeredictoValido(veredicto);
  if (
    !debePersistirCampoRevision({
      veredicto,
      comentario,
      nota: null,
      permitirSinVeredicto: Boolean(opciones?.permitirSinVeredicto),
    })
  ) {
    return;
  }

  const veredictoGuardado = tieneVeredicto ? veredicto : "";
  const comentarioGuardado =
    veredictoGuardado === "OBSERVACION" || (!tieneVeredicto && Boolean(comentario))
      ? comentario
      : "";

  await prisma.supervisionGeneral.upsert({
    where: {
      asignacionId_ronda_ciclo: { asignacionId, ronda, ciclo },
    },
    update: { veredicto: veredictoGuardado, comentario: comentarioGuardado },
    create: {
      asignacionId,
      ronda,
      ciclo,
      veredicto: veredictoGuardado,
      comentario: comentarioGuardado,
    },
  });
}

async function cargaAsignacionEvaluador(id: string, evaluadorId: string) {
  return prisma.asignacionEvaluador.findFirst({
    where: { id, evaluadorId },
    include: {
      postulacion: {
        include: {
          convocatoria: { include: { formulario: { include: { preguntas: true } } } },
        },
      },
    },
  });
}

async function cargaAsignacionSupervisor(asignacionId: string, supervisorId: string) {
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

/** Guarda el borrador de evaluación. No cambia estado salvo `cambiarEstado`. */
export async function persistirBorradorEvaluacion(args: {
  userId: string;
  rol: Role;
  formData: FormData;
  expectedUpdatedAt?: string | null;
  cambiarEstado?: boolean;
  permitirSinVeredicto?: boolean;
}): Promise<ResultadoBorrador> {
  const asignacionId = String(args.formData.get("asignacionId") ?? "");
  const asignacion = await cargaAsignacionEvaluador(asignacionId, args.userId);
  if (!asignacion) return { error: "Evaluación no encontrada." };
  if (
    !puedeGuardarBorradorEvaluacion(
      args.rol,
      modoRevisionDeConvocatoria(asignacion.postulacion.convocatoria),
    )
  ) {
    return { error: "No tienes permiso para editar esta evaluación." };
  }
  if (asignacion.estado === "FINALIZADA") {
    return { error: "Esta evaluación ya está finalizada." };
  }
  if (asignacion.estado === "CON_OBSERVACIONES") {
    return { error: "Espera la corrección del participante." };
  }
  if (asignacion.estado === "EN_SUPERVISION") {
    return { error: "Espera la revisión del supervisor." };
  }
  if (!evaluadorPuedeEditar(asignacion.estado)) {
    return { error: "No puedes editar en este estado." };
  }

  if (
    args.expectedUpdatedAt &&
    asignacion.updatedAt.toISOString() !== args.expectedUpdatedAt
  ) {
    return { conflict: true, updatedAt: asignacion.updatedAt.toISOString() };
  }

  if (args.cambiarEstado) {
    if (
      asignacion.estado === "PENDIENTE" ||
      asignacion.estado === "REPARADA" ||
      asignacion.estado === "DEVUELTA_SUPERVISOR"
    ) {
      await prisma.asignacionEvaluador.update({
        where: { id: asignacionId },
        data: { estado: "EN_REVISION" },
      });
    }
  }

  const ronda = asignacion.rondaActual;
  const ciclo = asignacion.cicloSupervision;
  const preguntas = asignacion.postulacion.convocatoria.formulario.preguntas;
  const modo = parseModoEvaluacion(asignacion.postulacion.convocatoria.formulario.modoEvaluacion);
  const opciones: OpcionesPersistir = {
    permitirSinVeredicto: args.permitirSinVeredicto,
  };

  if (modo === "GENERAL") {
    await persistirRevisionGeneral(args.formData, asignacionId, ronda, ciclo, opciones);
    await persistirRevisionPorPregunta(args.formData, asignacionId, ronda, ciclo, preguntas, {
      ...opciones,
      forzarOkSinComentario: true,
    });
  } else {
    await persistirRevisionPorPregunta(
      args.formData,
      asignacionId,
      ronda,
      ciclo,
      preguntas,
      opciones,
    );
  }

  if (args.cambiarEstado) {
    await sincronizarEstadoPostulacion(asignacion.postulacionId);
  }

  const actualizada = await prisma.asignacionEvaluador.update({
    where: { id: asignacionId },
    data: { updatedAt: new Date() },
    select: { updatedAt: true },
  });
  return { ok: true, updatedAt: actualizada.updatedAt.toISOString() };
}

/** Guarda el borrador de supervisión. No cambia estado. */
export async function persistirBorradorSupervision(args: {
  userId: string;
  formData: FormData;
  expectedUpdatedAt?: string | null;
  permitirSinVeredicto?: boolean;
  forzarOkSinComentario?: boolean;
}): Promise<ResultadoBorrador> {
  const asignacionId = String(args.formData.get("asignacionId") ?? "");
  const asignacion = await cargaAsignacionSupervisor(asignacionId, args.userId);
  if (!asignacion) return { error: "Evaluación no encontrada." };
  if (asignacion.estado !== "EN_SUPERVISION") {
    return { error: "Solo puedes supervisar evaluaciones enviadas al supervisor." };
  }

  if (
    args.expectedUpdatedAt &&
    asignacion.updatedAt.toISOString() !== args.expectedUpdatedAt
  ) {
    return { conflict: true, updatedAt: asignacion.updatedAt.toISOString() };
  }

  const ronda = asignacion.rondaActual;
  const ciclo = asignacion.cicloSupervision;
  const preguntas = asignacion.postulacion.convocatoria.formulario.preguntas;
  const modo = parseModoEvaluacion(asignacion.postulacion.convocatoria.formulario.modoEvaluacion);
  const opciones: OpcionesPersistir = {
    permitirSinVeredicto: args.permitirSinVeredicto,
    forzarOkSinComentario: args.forzarOkSinComentario,
  };

  if (modo === "GENERAL") {
    await persistirSupervisionGeneral(args.formData, asignacionId, ronda, ciclo, opciones);
  } else {
    await persistirSupervisionPorPregunta(
      args.formData,
      asignacionId,
      ronda,
      ciclo,
      preguntas,
      opciones,
    );
  }

  const actualizada = await prisma.asignacionEvaluador.update({
    where: { id: asignacionId },
    data: { updatedAt: new Date() },
    select: { updatedAt: true },
  });
  return { ok: true, updatedAt: actualizada.updatedAt.toISOString() };
}

export { leerComentario, leerVeredictoGeneral, esVeredictoValido };
