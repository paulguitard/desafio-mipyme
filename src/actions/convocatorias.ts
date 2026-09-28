"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { sincronizarEstadoPostulacion } from "@/lib/sync-estado";
import { deleteUpload, saveUpload } from "@/lib/storage";
import {
  aplicarPosicionImagen,
  clampPorcentaje,
  parseFechaForm,
  parseImagenConvocatoria,
} from "@/lib/convocatoria";
import { isStoredFile, parseArchivos } from "@/lib/preguntas";
import { asignarEvaluadoresAutomaticoEnConvocatoria } from "@/lib/asignacion-automatica";
import { asignarSupervisoresAutomaticoEnConvocatoria } from "@/lib/asignacion-supervisor";
import { cupoAlcanzado, mensajeCupoPersona } from "@/lib/cupo-asignacion";
import {
  getDetalleFichaAdmin,
  getPanelEvaluacion,
  getRespuestasConvocatoria,
} from "@/lib/convocatoria-admin-data";

async function validarFormulario(formularioId: string) {
  const form = await prisma.formulario.findUnique({
    where: { id: formularioId },
    include: { _count: { select: { preguntas: true } } },
  });
  if (!form) return { error: "Formulario no encontrado." };
  if (form._count.preguntas === 0) {
    return { error: "El formulario aún no tiene preguntas." };
  }
  return { form };
}

function leerFechas(formData: FormData) {
  const fechaInicio = parseFechaForm(String(formData.get("fechaInicio") ?? ""));
  const fechaCierre = parseFechaForm(String(formData.get("fechaCierre") ?? ""));
  if (!fechaInicio || !fechaCierre) {
    return { error: "Fecha de inicio y fecha de cierre son obligatorias." };
  }
  if (fechaCierre <= fechaInicio) {
    return { error: "La fecha de cierre debe ser posterior a la de inicio." };
  }
  return { fechaInicio, fechaCierre };
}

async function leerImagen(formData: FormData, actual: string) {
  const pos = {
    x: clampPorcentaje(formData.get("imagenPosX")),
    y: clampPorcentaje(formData.get("imagenPosY")),
  };
  const file = formData.get("imagen");
  let json = actual;
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return { error: "La imagen debe ser un archivo de imagen." };
    }
    const stored = await saveUpload(file, "image");
    json = JSON.stringify(stored);
  }
  return aplicarPosicionImagen(json, pos);
}

function revalidateConvocatorias(id?: string) {
  revalidatePath("/admin/mentorias");
  revalidatePath("/admin");
  revalidatePath("/participante");
  if (id) revalidatePath(`/admin/mentorias/${id}`);
}

export async function crearConvocatoria(formData: FormData) {
  await requireUser("ADMIN");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const formularioId = String(formData.get("formularioId") ?? "");
  if (!titulo || !formularioId) {
    return { error: "Título y formulario son obligatorios." };
  }

  const formOk = await validarFormulario(formularioId);
  if ("error" in formOk && formOk.error) return { error: formOk.error };

  const fechas = leerFechas(formData);
  if ("error" in fechas && fechas.error) return { error: fechas.error };

  // Evita duplicados por doble envío (mismo título, formulario y fechas recientes).
  const ventanaDuplicadoMs = 2 * 60 * 1000;
  const duplicadoReciente = await prisma.convocatoria.findFirst({
    where: {
      titulo,
      formularioId,
      fechaInicio: fechas.fechaInicio,
      fechaCierre: fechas.fechaCierre,
      createdAt: { gte: new Date(Date.now() - ventanaDuplicadoMs) },
    },
    select: { id: true },
  });
  if (duplicadoReciente) {
    return {
      error:
        "Ya se creó una mentoría igual hace un momento. Revisa la lista antes de volver a intentar.",
    };
  }

  const imagen = await leerImagen(formData, "");
  if (typeof imagen !== "string") return imagen;

  const convocatoria = await prisma.convocatoria.create({
    data: {
      titulo,
      descripcion,
      formularioId,
      estado: "ABIERTA",
      imagen,
      fechaInicio: fechas.fechaInicio,
      fechaCierre: fechas.fechaCierre,
    },
  });
  revalidateConvocatorias(convocatoria.id);
  return { ok: true };
}

export async function actualizarConvocatoria(formData: FormData) {
  await requireUser("ADMIN");
  const id = String(formData.get("id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const formularioId = String(formData.get("formularioId") ?? "");
  if (!id || !titulo || !formularioId) {
    return { error: "Título y formulario son obligatorios." };
  }

  const convocatoria = await prisma.convocatoria.findUnique({
    where: { id },
    include: { _count: { select: { postulaciones: true } } },
  });
  if (!convocatoria) return { error: "Mentoría no encontrada." };

  const formIdFinal =
    convocatoria._count.postulaciones > 0 ? convocatoria.formularioId : formularioId;
  if (formIdFinal !== convocatoria.formularioId) {
    const formOk = await validarFormulario(formIdFinal);
    if ("error" in formOk && formOk.error) return { error: formOk.error };
  }

  const fechas = leerFechas(formData);
  if ("error" in fechas && fechas.error) return { error: fechas.error };

  const imagen = await leerImagen(formData, convocatoria.imagen);
  if (typeof imagen !== "string") return imagen;

  await prisma.convocatoria.update({
    where: { id },
    data: {
      titulo,
      descripcion,
      formularioId: formIdFinal,
      imagen,
      fechaInicio: fechas.fechaInicio,
      fechaCierre: fechas.fechaCierre,
    },
  });
  revalidateConvocatorias(id);
  return { ok: true };
}

export async function toggleConvocatoria(formData: FormData) {
  await requireUser("ADMIN");
  const id = String(formData.get("id") ?? "");
  const convocatoria = await prisma.convocatoria.findUnique({ where: { id } });
  if (!convocatoria) return { error: "Mentoría no encontrada." };

  const nuevo = convocatoria.estado === "ABIERTA" ? "CERRADA" : "ABIERTA";
  await prisma.convocatoria.update({
    where: { id },
    data: { estado: nuevo },
  });
  revalidateConvocatorias(id);
  return { ok: true };
}

export async function guardarConfigEvaluacion(formData: FormData) {
  await requireUser("ADMIN");
  const convocatoriaId = String(formData.get("convocatoriaId") ?? "");
  const n = Number.parseInt(String(formData.get("evaluacionesPorPostulacion") ?? "1"), 10);
  if (!convocatoriaId) return { error: "Mentoría no encontrada." };
  if (!Number.isFinite(n) || n < 1) {
    return { error: "Las evaluaciones por caso deben ser al menos 1." };
  }

  const convocatoria = await prisma.convocatoria.findUnique({
    where: { id: convocatoriaId },
    include: { evaluadores: true, supervisores: true },
  });
  if (!convocatoria) return { error: "Mentoría no encontrada." };

  await prisma.convocatoria.update({
    where: { id: convocatoriaId },
    data: { evaluacionesPorPostulacion: n },
  });

  for (const item of convocatoria.evaluadores) {
    const raw = formData.get(`max-${item.evaluadorId}`);
    if (raw == null) continue;
    const max = Number.parseInt(String(raw), 10);
    await prisma.convocatoriaEvaluador.update({
      where: { id: item.id },
      data: { maxEvaluaciones: Number.isFinite(max) && max >= 0 ? max : 0 },
    });
  }

  for (const item of convocatoria.supervisores) {
    const raw = formData.get(`max-sup-${item.supervisorId}`);
    if (raw == null) continue;
    const max = Number.parseInt(String(raw), 10);
    await prisma.convocatoriaSupervisor.update({
      where: { id: item.id },
      data: { maxSupervisiones: Number.isFinite(max) && max >= 0 ? max : 0 },
    });
  }

  revalidateConvocatorias(convocatoriaId);
  return { ok: true };
}

export async function guardarCupoPool(formData: FormData) {
  await requireUser("ADMIN");
  const convocatoriaId = String(formData.get("convocatoriaId") ?? "");
  const personaId = String(formData.get("evaluadorId") ?? formData.get("supervisorId") ?? "");
  const rol = String(formData.get("rol") ?? "evaluador") === "supervisor" ? "supervisor" : "evaluador";
  const max = Number.parseInt(String(formData.get("maxEvaluaciones") ?? "0"), 10);
  if (!convocatoriaId || !personaId) return { error: "Datos incompletos." };
  if (!Number.isFinite(max) || max < 0) {
    return { error: "El cupo debe ser 0 (sin límite) o un número positivo." };
  }

  if (rol === "supervisor") {
    const updated = await prisma.convocatoriaSupervisor.updateMany({
      where: { convocatoriaId, supervisorId: personaId },
      data: { maxSupervisiones: max },
    });
    if (updated.count === 0) return { error: "El supervisor no está en el pool de esta mentoría." };
  } else {
    const updated = await prisma.convocatoriaEvaluador.updateMany({
      where: { convocatoriaId, evaluadorId: personaId },
      data: { maxEvaluaciones: max },
    });
    if (updated.count === 0) return { error: "El evaluador no está en el pool de esta mentoría." };
  }

  revalidateConvocatorias(convocatoriaId);
  return { ok: true, mensaje: "Cupo actualizado." };
}

export async function agregarEvaluadorAlPool(formData: FormData) {
  await requireUser("ADMIN");
  const convocatoriaId = String(formData.get("convocatoriaId") ?? "");
  const evaluadorId = String(formData.get("evaluadorId") ?? "");
  if (!convocatoriaId || !evaluadorId) return { error: "Datos incompletos." };

  const user = await prisma.user.findUnique({ where: { id: evaluadorId } });
  if (!user || user.role !== "EVALUADOR") return { error: "Evaluador no válido." };

  await prisma.convocatoriaEvaluador.upsert({
    where: { convocatoriaId_evaluadorId: { convocatoriaId, evaluadorId } },
    update: {},
    create: { convocatoriaId, evaluadorId, maxEvaluaciones: 0 },
  });
  revalidateConvocatorias(convocatoriaId);
  return { ok: true };
}

export async function agregarEvaluadoresAlPool(formData: FormData) {
  await requireUser("ADMIN");
  const convocatoriaId = String(formData.get("convocatoriaId") ?? "");
  const evaluadorIds = [...new Set(formData.getAll("evaluadorId").map(String).filter(Boolean))];
  if (!convocatoriaId) return { error: "Datos incompletos." };
  if (evaluadorIds.length === 0) return { error: "Selecciona al menos un evaluador." };

  const usuarios = await prisma.user.findMany({
    where: { id: { in: evaluadorIds }, role: "EVALUADOR" },
    select: { id: true },
  });
  if (usuarios.length === 0) return { error: "No hay evaluadores válidos para agregar." };

  await prisma.$transaction(
    usuarios.map((user) =>
      prisma.convocatoriaEvaluador.upsert({
        where: { convocatoriaId_evaluadorId: { convocatoriaId, evaluadorId: user.id } },
        update: {},
        create: { convocatoriaId, evaluadorId: user.id, maxEvaluaciones: 0 },
      }),
    ),
  );

  revalidateConvocatorias(convocatoriaId);
  const n = usuarios.length;
  return {
    ok: true,
    mensaje: n === 1 ? "Evaluador agregado." : `Se agregaron ${n} evaluadores.`,
  };
}

export async function quitarEvaluadorDelPool(formData: FormData) {
  await requireUser("ADMIN");
  const convocatoriaId = String(formData.get("convocatoriaId") ?? "");
  const evaluadorId = String(formData.get("evaluadorId") ?? "");
  if (!convocatoriaId || !evaluadorId) return { error: "Datos incompletos." };

  await prisma.convocatoriaEvaluador.deleteMany({
    where: { convocatoriaId, evaluadorId },
  });
  revalidateConvocatorias(convocatoriaId);
  return { ok: true };
}

export async function asignarEvaluadorAPostulacion(formData: FormData) {
  await requireUser("ADMIN");
  const postulacionId = String(formData.get("postulacionId") ?? "");
  const evaluadorId = String(formData.get("evaluadorId") ?? "");
  if (!postulacionId || !evaluadorId) return { error: "Datos incompletos." };

  const postulacion = await prisma.postulacion.findUnique({
    where: { id: postulacionId },
    include: {
      convocatoria: { include: { evaluadores: true } },
      asignaciones: true,
    },
  });
  if (!postulacion) return { error: "Caso no encontrado." };
  if (postulacion.estado === "FINALIZADA" || !postulacion.enviadaAt) {
    return { error: "Solo se asignan respuestas enviadas y no finalizadas." };
  }

  const enPool = postulacion.convocatoria.evaluadores.some((e) => e.evaluadorId === evaluadorId);
  if (!enPool) return { error: "El evaluador no está en el pool de esta mentoría." };

  if (postulacion.asignaciones.some((a) => a.evaluadorId === evaluadorId)) {
    return { error: "Ese evaluador ya está asignado a esta respuesta." };
  }

  const poolItem = postulacion.convocatoria.evaluadores.find((e) => e.evaluadorId === evaluadorId);
  const cupo = poolItem?.maxEvaluaciones ?? 0;
  if (cupo > 0) {
    const carga = await prisma.asignacionEvaluador.count({
      where: { evaluadorId, postulacion: { convocatoriaId: postulacion.convocatoriaId } },
    });
    if (cupoAlcanzado(cupo, carga)) {
      return { error: mensajeCupoPersona("evaluador", cupo) };
    }
  }

  const max = Math.max(1, postulacion.convocatoria.evaluacionesPorPostulacion);
  if (postulacion.asignaciones.length >= max) {
    return {
      error: `Esta respuesta ya tiene el máximo de ${max} evaluación${max === 1 ? "" : "es"}.`,
    };
  }

  const user = await prisma.user.findUnique({ where: { id: evaluadorId } });
  if (!user || user.role !== "EVALUADOR") return { error: "Evaluador no válido." };

  const orden = postulacion.asignaciones.reduce((maxOrden, a) => Math.max(maxOrden, a.orden), 0) + 1;
  await prisma.asignacionEvaluador.create({
    data: {
      postulacionId,
      evaluadorId,
      orden,
      estado: "PENDIENTE",
      rondaActual: 1,
    },
  });

  await sincronizarEstadoPostulacion(postulacionId);
  revalidatePath(`/admin/mentorias/${postulacion.convocatoriaId}`);
  revalidatePath("/evaluador");
  return { ok: true, mensaje: "Evaluador asignado." };
}

export async function asignarEvaluadores(formData: FormData) {
  await requireUser("ADMIN");
  const postulacionId = String(formData.get("postulacionId") ?? "");
  const evaluadorIds = formData.getAll("evaluadorId").map(String).filter(Boolean);

  const postulacion = await prisma.postulacion.findUnique({
    where: { id: postulacionId },
    include: {
      convocatoria: { include: { evaluadores: true } },
      asignaciones: true,
    },
  });
  if (!postulacion) return { error: "Caso no encontrado." };
  if (postulacion.estado === "FINALIZADA" || !postulacion.enviadaAt) {
    return { error: "Solo se asignan casos enviados y no finalizados." };
  }

  const pool = new Set(postulacion.convocatoria.evaluadores.map((e) => e.evaluadorId));
  const deseados = new Set(evaluadorIds.filter((id) => pool.has(id)));

  for (const asignacion of postulacion.asignaciones) {
    if (deseados.has(asignacion.evaluadorId)) continue;
    if (asignacion.estado !== "PENDIENTE") continue;
    await prisma.asignacionEvaluador.delete({ where: { id: asignacion.id } });
  }

  const restantes = await prisma.asignacionEvaluador.findMany({
    where: { postulacionId },
  });
  const existentes = new Set(restantes.map((a) => a.evaluadorId));
  let orden = restantes.reduce((max, a) => Math.max(max, a.orden), 0);
  const cupos = new Map(postulacion.convocatoria.evaluadores.map((e) => [e.evaluadorId, e.maxEvaluaciones]));
  const cargasRows = await prisma.asignacionEvaluador.groupBy({
    by: ["evaluadorId"],
    where: { postulacion: { convocatoriaId: postulacion.convocatoriaId } },
    _count: { _all: true },
  });
  const cargas = new Map(cargasRows.map((row) => [row.evaluadorId, row._count._all]));

  for (const evaluadorId of deseados) {
    if (existentes.has(evaluadorId)) continue;
    const cupo = cupos.get(evaluadorId) ?? 0;
    const carga = cargas.get(evaluadorId) ?? 0;
    if (cupoAlcanzado(cupo, carga)) continue;
    const user = await prisma.user.findUnique({ where: { id: evaluadorId } });
    if (!user || user.role !== "EVALUADOR") continue;
    orden += 1;
    await prisma.asignacionEvaluador.create({
      data: {
        postulacionId,
        evaluadorId,
        orden,
        estado: "PENDIENTE",
        rondaActual: 1,
      },
    });
    cargas.set(evaluadorId, carga + 1);
  }

  await sincronizarEstadoPostulacion(postulacionId);
  revalidatePath(`/admin/mentorias/${postulacion.convocatoriaId}`);
  revalidatePath("/evaluador");
  return { ok: true };
}

export async function eliminarPostulacion(formData: FormData) {
  await requireUser("ADMIN");
  const postulacionId = String(formData.get("postulacionId") ?? "");
  if (!postulacionId) return { error: "Datos incompletos." };

  const postulacion = await prisma.postulacion.findUnique({
    where: { id: postulacionId },
    include: {
      respuestas: { include: { versiones: true } },
    },
  });
  if (!postulacion) return { error: "Participación no encontrada." };

  const adjuntos = new Set<string>();
  for (const respuesta of postulacion.respuestas) {
    for (const archivo of parseArchivos(respuesta.archivos).filter(isStoredFile)) {
      adjuntos.add(archivo.relativePath);
    }
    for (const version of respuesta.versiones) {
      for (const archivo of parseArchivos(version.archivos).filter(isStoredFile)) {
        adjuntos.add(archivo.relativePath);
      }
    }
  }

  await prisma.postulacion.delete({ where: { id: postulacionId } });

  for (const relativePath of adjuntos) {
    try {
      await deleteUpload(relativePath);
    } catch {
      /* el registro ya se eliminó; no bloquear por un archivo huérfano */
    }
  }

  revalidateConvocatorias(postulacion.convocatoriaId);
  revalidatePath("/evaluador");
  return { ok: true, mensaje: "Participación eliminada." };
}

export async function eliminarConvocatoria(formData: FormData) {
  await requireUser("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Datos incompletos." };

  const convocatoria = await prisma.convocatoria.findUnique({
    where: { id },
    include: {
      postulaciones: {
        include: {
          respuestas: { include: { versiones: true } },
        },
      },
    },
  });
  if (!convocatoria) return { error: "Mentoría no encontrada." };

  const adjuntos = new Set<string>();
  const imagen = parseImagenConvocatoria(convocatoria.imagen);
  if (imagen?.relativePath) adjuntos.add(imagen.relativePath);

  for (const postulacion of convocatoria.postulaciones) {
    for (const respuesta of postulacion.respuestas) {
      for (const archivo of parseArchivos(respuesta.archivos).filter(isStoredFile)) {
        adjuntos.add(archivo.relativePath);
      }
      for (const version of respuesta.versiones) {
        for (const archivo of parseArchivos(version.archivos).filter(isStoredFile)) {
          adjuntos.add(archivo.relativePath);
        }
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    if (convocatoria.postulaciones.length > 0) {
      await tx.postulacion.deleteMany({ where: { convocatoriaId: id } });
    }
    await tx.convocatoria.delete({ where: { id } });
  });

  for (const relativePath of adjuntos) {
    try {
      await deleteUpload(relativePath);
    } catch {
      /* el registro ya se eliminó; no bloquear por un archivo huérfano */
    }
  }

  revalidateConvocatorias();
  revalidatePath("/evaluador");
  return { ok: true };
}

export async function asignarEvaluadoresAutomatico(formData: FormData) {
  await requireUser("ADMIN");
  const convocatoriaId = String(formData.get("convocatoriaId") ?? "");
  if (!convocatoriaId) return { error: "Mentoría no encontrada." };
  const result = await asignarEvaluadoresAutomaticoEnConvocatoria(convocatoriaId);
  revalidateConvocatorias(convocatoriaId);
  revalidatePath("/evaluador");
  return result;
}

export async function agregarSupervisorAlPool(formData: FormData) {
  await requireUser("ADMIN");
  const convocatoriaId = String(formData.get("convocatoriaId") ?? "");
  const supervisorId = String(formData.get("supervisorId") ?? formData.get("evaluadorId") ?? "");
  if (!convocatoriaId || !supervisorId) return { error: "Datos incompletos." };

  const user = await prisma.user.findUnique({ where: { id: supervisorId } });
  if (!user || user.role !== "SUPERVISOR") return { error: "Supervisor no válido." };

  await prisma.convocatoriaSupervisor.upsert({
    where: { convocatoriaId_supervisorId: { convocatoriaId, supervisorId } },
    update: {},
    create: { convocatoriaId, supervisorId, maxSupervisiones: 0 },
  });
  revalidateConvocatorias(convocatoriaId);
  return { ok: true };
}

export async function agregarSupervisoresAlPool(formData: FormData) {
  await requireUser("ADMIN");
  const convocatoriaId = String(formData.get("convocatoriaId") ?? "");
  const supervisorIds = [
    ...new Set(
      [...formData.getAll("supervisorId"), ...formData.getAll("evaluadorId")]
        .map(String)
        .filter(Boolean),
    ),
  ];
  if (!convocatoriaId) return { error: "Datos incompletos." };
  if (supervisorIds.length === 0) return { error: "Selecciona al menos un supervisor." };

  const usuarios = await prisma.user.findMany({
    where: { id: { in: supervisorIds }, role: "SUPERVISOR" },
    select: { id: true },
  });
  if (usuarios.length === 0) return { error: "No hay supervisores válidos para agregar." };

  await prisma.$transaction(
    usuarios.map((user) =>
      prisma.convocatoriaSupervisor.upsert({
        where: { convocatoriaId_supervisorId: { convocatoriaId, supervisorId: user.id } },
        update: {},
        create: { convocatoriaId, supervisorId: user.id, maxSupervisiones: 0 },
      }),
    ),
  );

  revalidateConvocatorias(convocatoriaId);
  const n = usuarios.length;
  return {
    ok: true,
    mensaje: n === 1 ? "Supervisor agregado." : `Se agregaron ${n} supervisores.`,
  };
}

export async function quitarSupervisorDelPool(formData: FormData) {
  await requireUser("ADMIN");
  const convocatoriaId = String(formData.get("convocatoriaId") ?? "");
  const supervisorId = String(formData.get("supervisorId") ?? formData.get("evaluadorId") ?? "");
  if (!convocatoriaId || !supervisorId) return { error: "Datos incompletos." };

  await prisma.convocatoriaSupervisor.deleteMany({
    where: { convocatoriaId, supervisorId },
  });
  revalidateConvocatorias(convocatoriaId);
  return { ok: true };
}

export async function asignarSupervisorAPostulacion(formData: FormData) {
  await requireUser("ADMIN");
  const postulacionId = String(formData.get("postulacionId") ?? "");
  const supervisorId = String(formData.get("supervisorId") ?? formData.get("evaluadorId") ?? "");
  if (!postulacionId || !supervisorId) return { error: "Datos incompletos." };

  const postulacion = await prisma.postulacion.findUnique({
    where: { id: postulacionId },
    include: {
      convocatoria: { include: { supervisores: true } },
      supervision: true,
    },
  });
  if (!postulacion) return { error: "Caso no encontrado." };
  if (postulacion.estado === "FINALIZADA" || !postulacion.enviadaAt) {
    return { error: "Solo se asignan respuestas enviadas y no finalizadas." };
  }

  const enPool = postulacion.convocatoria.supervisores.some((e) => e.supervisorId === supervisorId);
  if (!enPool) return { error: "El supervisor no está en el pool de esta mentoría." };

  if (postulacion.supervision) {
    return { error: "Esta respuesta ya tiene un supervisor asignado." };
  }

  const poolItem = postulacion.convocatoria.supervisores.find((e) => e.supervisorId === supervisorId);
  const cupo = poolItem?.maxSupervisiones ?? 0;
  if (cupo > 0) {
    const carga = await prisma.asignacionSupervisor.count({
      where: { supervisorId, postulacion: { convocatoriaId: postulacion.convocatoriaId } },
    });
    if (cupoAlcanzado(cupo, carga)) {
      return { error: mensajeCupoPersona("supervisor", cupo) };
    }
  }

  const user = await prisma.user.findUnique({ where: { id: supervisorId } });
  if (!user || user.role !== "SUPERVISOR") return { error: "Supervisor no válido." };

  await prisma.asignacionSupervisor.create({
    data: { postulacionId, supervisorId },
  });

  revalidatePath(`/admin/mentorias/${postulacion.convocatoriaId}`);
  revalidatePath("/evaluador");
  return { ok: true, mensaje: "Supervisor asignado." };
}

export async function asignarSupervisoresAutomatico(formData: FormData) {
  await requireUser("ADMIN");
  const convocatoriaId = String(formData.get("convocatoriaId") ?? "");
  if (!convocatoriaId) return { error: "Mentoría no encontrada." };
  const result = await asignarSupervisoresAutomaticoEnConvocatoria(convocatoriaId);
  revalidateConvocatorias(convocatoriaId);
  revalidatePath("/evaluador");
  return result;
}

export async function cargarRespuestasConvocatoria(convocatoriaId: string) {
  await requireUser("ADMIN");
  const data = await getRespuestasConvocatoria(convocatoriaId);
  if (!data) return { error: "Mentoría no encontrada." };
  return { data };
}

export async function cargarPanelEvaluacion(convocatoriaId: string, page = 1) {
  await requireUser("ADMIN");
  const data = await getPanelEvaluacion(convocatoriaId, page);
  if (!data) return { error: "Mentoría no encontrada." };
  return { data };
}

export async function cargarDetalleFichaAdmin(postulacionId: string) {
  await requireUser("ADMIN");
  if (!postulacionId) return { error: "Participación no encontrada." };
  const data = await getDetalleFichaAdmin(postulacionId);
  if (!data) return { error: "Participación no encontrada." };
  return { data };
}

export async function crearConvocatoriaForm(formData: FormData): Promise<void> {
  await crearConvocatoria(formData);
}

export async function actualizarConvocatoriaForm(formData: FormData): Promise<void> {
  await actualizarConvocatoria(formData);
}

export async function toggleConvocatoriaForm(formData: FormData): Promise<void> {
  await toggleConvocatoria(formData);
}

export async function eliminarConvocatoriaForm(formData: FormData): Promise<void> {
  await eliminarConvocatoria(formData);
}

export async function asignarEvaluadoresForm(formData: FormData): Promise<void> {
  await asignarEvaluadores(formData);
}

export async function guardarConfigEvaluacionForm(formData: FormData): Promise<void> {
  await guardarConfigEvaluacion(formData);
}

export async function agregarEvaluadorAlPoolForm(formData: FormData): Promise<void> {
  await agregarEvaluadorAlPool(formData);
}

export async function quitarEvaluadorDelPoolForm(formData: FormData): Promise<void> {
  await quitarEvaluadorDelPool(formData);
}

export async function asignarEvaluadoresAutomaticoForm(formData: FormData): Promise<void> {
  await asignarEvaluadoresAutomatico(formData);
}
