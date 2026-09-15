"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { sincronizarEstadoPostulacion } from "@/lib/sync-estado";
import { deleteUpload, saveUpload } from "@/lib/storage";
import { parseFechaForm, parseImagenConvocatoria } from "@/lib/convocatoria";
import { isStoredFile, parseArchivos } from "@/lib/preguntas";
import { asignarEvaluadoresAutomaticoEnConvocatoria } from "@/lib/asignacion-automatica";
import { getPanelEvaluacion, getRespuestasConvocatoria } from "@/lib/convocatoria-admin-data";

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
  const file = formData.get("imagen");
  if (!(file instanceof File) || file.size === 0) return actual;
  if (!file.type.startsWith("image/")) {
    return { error: "La imagen debe ser un archivo de imagen." };
  }
  const stored = await saveUpload(file, "image");
  return JSON.stringify(stored);
}

function revalidateConvocatorias(id?: string) {
  revalidatePath("/admin/convocatorias");
  revalidatePath("/admin");
  revalidatePath("/emprendedor");
  if (id) revalidatePath(`/admin/convocatorias/${id}`);
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
  if ("error" in formOk) return formOk;

  const fechas = leerFechas(formData);
  if ("error" in fechas) return fechas;

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
  if (!convocatoria) return { error: "Convocatoria no encontrada." };

  const formIdFinal =
    convocatoria._count.postulaciones > 0 ? convocatoria.formularioId : formularioId;
  if (formIdFinal !== convocatoria.formularioId) {
    const formOk = await validarFormulario(formIdFinal);
    if ("error" in formOk) return formOk;
  }

  const fechas = leerFechas(formData);
  if ("error" in fechas) return fechas;

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
  if (!convocatoria) return { error: "Convocatoria no encontrada." };

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
  if (!convocatoriaId) return { error: "Convocatoria no encontrada." };
  if (!Number.isFinite(n) || n < 1) {
    return { error: "Las evaluaciones por caso deben ser al menos 1." };
  }

  const convocatoria = await prisma.convocatoria.findUnique({
    where: { id: convocatoriaId },
    include: { evaluadores: true },
  });
  if (!convocatoria) return { error: "Convocatoria no encontrada." };

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

  revalidateConvocatorias(convocatoriaId);
  return { ok: true };
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
  if (postulacion.convocatoria.estado !== "ABIERTA") {
    return { error: "La convocatoria está cerrada. No se puede asignar." };
  }
  if (postulacion.estado === "FINALIZADA" || !postulacion.enviadaAt) {
    return { error: "Solo se asignan respuestas enviadas y no finalizadas." };
  }

  const enPool = postulacion.convocatoria.evaluadores.some((e) => e.evaluadorId === evaluadorId);
  if (!enPool) return { error: "El evaluador no está en el pool de esta convocatoria." };

  if (postulacion.asignaciones.some((a) => a.evaluadorId === evaluadorId)) {
    return { error: "Ese evaluador ya está asignado a esta respuesta." };
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
  revalidatePath(`/admin/convocatorias/${postulacion.convocatoriaId}`);
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
  if (postulacion.convocatoria.estado !== "ABIERTA") {
    return { error: "La convocatoria está cerrada. No se puede asignar." };
  }
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

  for (const evaluadorId of deseados) {
    if (existentes.has(evaluadorId)) continue;
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
  }

  await sincronizarEstadoPostulacion(postulacionId);
  revalidatePath(`/admin/convocatorias/${postulacion.convocatoriaId}`);
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
  if (!postulacion) return { error: "Postulación no encontrada." };

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
  return { ok: true, mensaje: "Postulación eliminada." };
}

export async function asignarEvaluadoresAutomatico(formData: FormData) {
  await requireUser("ADMIN");
  const convocatoriaId = String(formData.get("convocatoriaId") ?? "");
  if (!convocatoriaId) return { error: "Convocatoria no encontrada." };
  const result = await asignarEvaluadoresAutomaticoEnConvocatoria(convocatoriaId);
  revalidateConvocatorias(convocatoriaId);
  revalidatePath("/evaluador");
  return result;
}

export async function cargarRespuestasConvocatoria(convocatoriaId: string) {
  await requireUser("ADMIN");
  const data = await getRespuestasConvocatoria(convocatoriaId);
  if (!data) return { error: "Convocatoria no encontrada." };
  return { data };
}

export async function cargarPanelEvaluacion(convocatoriaId: string) {
  await requireUser("ADMIN");
  const data = await getPanelEvaluacion(convocatoriaId);
  if (!data) return { error: "Convocatoria no encontrada." };
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
