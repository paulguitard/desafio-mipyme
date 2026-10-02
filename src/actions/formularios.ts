"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  datosPreguntaNombreCaso,
  esPreguntaNombreCaso,
  asegurarPreguntaNombreCaso,
} from "@/lib/nombre-caso";
import { leerConfigApp } from "@/lib/config-app";
import {
  esModoEvaluacion,
  modoEvaluacionAlCrear,
  puedeAsignarModoEvaluacion,
  type ModoEvaluacion,
} from "@/lib/modo-evaluacion";
import {
  esTipoFormato,
  parseEscalaNotas,
  campoLimiteCuenta,
  serializeConfigCorreo,
  serializeConfigFecha,
  serializeConfigGantt,
  serializeConfigObjetivos,
  serializeConfigPresupuesto,
  serializeEscalaNotas,
  serializeOpcionesConLimites,
  serializeSoloLimites,
  TIPOS_PREGUNTA,
  tipoTieneOpciones,
  validarEscalaNotas,
  validarVideoLink,
  resolveVideoEmbed,
  type ConfigGantt,
  type ConfigLimites,
  type ConfigObjetivos,
  type ConfigPresupuesto,
  type TipoPregunta,
} from "@/lib/preguntas";
import { deleteUpload, saveUpload } from "@/lib/storage";
import { parseClaseMedio, parseMedioPayload, serializeMedioPayload } from "@/lib/contenido";
import { esMentoriaContenido, parseTipoFormulario, type TipoFormulario } from "@/lib/tipo-formulario";
import { randomUUID } from "node:crypto";

function isTipo(value: string): value is TipoPregunta {
  return (TIPOS_PREGUNTA as readonly string[]).includes(value);
}

function leerEscala(formData: FormData) {
  const conNotas = formData.get("conNotas") === "on";
  const escala = parseEscalaNotas(String(formData.get("escalaNotas") ?? "[]"));
  if (conNotas) {
    const error = validarEscalaNotas(escala);
    if (error) return { error, conNotas, escalaNotas: "[]" as const };
  }
  return {
    conNotas,
    escalaNotas: conNotas ? serializeEscalaNotas(escala) : "[]",
  };
}

function leerLimites(formData: FormData): ConfigLimites {
  const num = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
  };
  return {
    minCaracteres: num("minCaracteres"),
    maxCaracteres: num("maxCaracteres"),
    minPalabras: num("minPalabras"),
    maxPalabras: num("maxPalabras"),
  };
}

function leerNumero(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function leerEntero(formData: FormData, key: string): number | null {
  const n = leerNumero(formData, key);
  return n == null ? null : Math.floor(n);
}

function leerConfigGantt(formData: FormData): ConfigGantt {
  return {
    minActividades: leerEntero(formData, "minActividades"),
    maxActividades: leerEntero(formData, "maxActividades"),
    fechaMin: String(formData.get("fechaMin") ?? "").trim() || null,
    fechaMax: String(formData.get("fechaMax") ?? "").trim() || null,
    maxDiasActividad: leerEntero(formData, "maxDiasActividad"),
  };
}

function leerConfigPresupuesto(formData: FormData): ConfigPresupuesto {
  return {
    minItems: leerEntero(formData, "minItems"),
    maxItems: leerEntero(formData, "maxItems"),
    limitesCuentas: {
      recursos_humanos: {
        montoMin: leerNumero(formData, campoLimiteCuenta("recursos_humanos", "min")),
        montoMax: leerNumero(formData, campoLimiteCuenta("recursos_humanos", "max")),
      },
      operacion: {
        montoMin: leerNumero(formData, campoLimiteCuenta("operacion", "min")),
        montoMax: leerNumero(formData, campoLimiteCuenta("operacion", "max")),
      },
      inversion: {
        montoMin: leerNumero(formData, campoLimiteCuenta("inversion", "min")),
        montoMax: leerNumero(formData, campoLimiteCuenta("inversion", "max")),
      },
    },
    montoTotalMin: leerNumero(formData, "montoTotalMin"),
    montoTotalMax: leerNumero(formData, "montoTotalMax"),
  };
}

function leerConfigObjetivos(formData: FormData): ConfigObjetivos {
  const cantidad = leerEntero(formData, "cantidadObjetivosEspecificos") ?? 3;
  return {
    cantidadObjetivosEspecificos: Math.max(1, Math.min(20, cantidad)),
    minIndicadoresPorObjetivo: leerEntero(formData, "minIndicadoresPorObjetivo"),
    maxIndicadoresPorObjetivo: leerEntero(formData, "maxIndicadoresPorObjetivo"),
  };
}

function leerOpcionesGuardadas(tipo: TipoPregunta, formData: FormData): { opciones: string; error?: string } {
  const limites = leerLimites(formData);
  if (tipo === "fecha") {
    const modo = String(formData.get("fechaModo") ?? "unica") === "rango" ? "rango" : "unica";
    return { opciones: serializeConfigFecha(modo, limites) };
  }
  if (tipo === "correo") {
    const cantidad = Math.max(1, Math.min(20, Number(formData.get("cantidadCorreos") ?? 1) || 1));
    return { opciones: serializeConfigCorreo(cantidad, limites) };
  }
  if (tipo === "gantt") return { opciones: serializeConfigGantt(leerConfigGantt(formData)) };
  if (tipo === "presupuesto") {
    return { opciones: serializeConfigPresupuesto(leerConfigPresupuesto(formData)) };
  }
  if (tipo === "objetivos_indicadores") {
    return { opciones: serializeConfigObjetivos(leerConfigObjetivos(formData)) };
  }
  const opciones = String(formData.get("opciones") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (tipoTieneOpciones(tipo) && opciones.length < 2) {
    return { opciones: "[]", error: "Este tipo necesita al menos dos opciones (una por línea)." };
  }
  if (tipoTieneOpciones(tipo)) {
    return { opciones: serializeOpcionesConLimites(opciones, limites) };
  }
  return { opciones: serializeSoloLimites(limites) };
}

export async function crearFormulario(formData: FormData) {
  const admin = await requireUser("ADMIN");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const tipo = parseTipoFormulario(String(formData.get("tipo") ?? ""));
  const { permitirEvaluacionPorPregunta } = await leerConfigApp();
  const modoEvaluacion = modoEvaluacionAlCrear(
    formData.get("modoEvaluacion"),
    permitirEvaluacionPorPregunta,
  );
  if (!titulo) return { error: "El título es obligatorio." };

  const form = await prisma.formulario.create({
    data: {
      titulo,
      tipo,
      modoEvaluacion,
      creadoPorId: admin.id,
      preguntas:
        tipo === "CONTENIDO"
          ? undefined
          : {
              create: [{ orden: 1, ...datosPreguntaNombreCaso() }],
            },
    },
  });

  redirect(`/admin/formularios/${form.id}`);
}

export async function actualizarFormulario(formData: FormData) {
  await requireUser("ADMIN");
  const id = String(formData.get("id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!id || !titulo) return { error: "El título es obligatorio." };

  const existente = await prisma.formulario.findUnique({
    where: { id },
    include: { _count: { select: { convocatorias: true } } },
  });
  if (!existente) return { error: "Formulario no encontrado." };

  const data: { titulo: string; modoEvaluacion?: ModoEvaluacion } = {
    titulo,
  };

  if (formData.has("modoEvaluacion")) {
    const modoRaw = String(formData.get("modoEvaluacion") ?? "").trim();
    if (!esModoEvaluacion(modoRaw)) {
      return { error: "El tipo de evaluación no es válido." };
    }
    if (existente._count.convocatorias > 0 && modoRaw !== existente.modoEvaluacion) {
      return { error: "No puedes cambiar el tipo de evaluación de un formulario con asesorías." };
    }
    const { permitirEvaluacionPorPregunta } = await leerConfigApp();
    if (!puedeAsignarModoEvaluacion(modoRaw, permitirEvaluacionPorPregunta, existente.modoEvaluacion)) {
      return {
        error:
          "La evaluación pregunta por pregunta está desactivada. Puedes habilitarla en Configuración.",
      };
    }
    data.modoEvaluacion = modoRaw;
  }

  await prisma.formulario.update({
    where: { id },
    data,
  });
  if (!esMentoriaContenido(existente.tipo)) {
    await asegurarPreguntaNombreCaso(id);
  }
  revalidatePath(`/admin/formularios/${id}`);
  revalidatePath("/admin/formularios");
  return { ok: true };
}

export async function agregarPregunta(formData: FormData) {
  await requireUser("ADMIN");
  const formularioId = String(formData.get("formularioId") ?? "");
  const enunciado = String(formData.get("enunciado") ?? "").trim();
  const ayuda = String(formData.get("ayuda") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "");
  const obligatoria = formData.get("obligatoria") === "on";
  const permiteArchivo = formData.get("permiteArchivo") === "on";
  const permiteImagen = formData.get("permiteImagen") === "on";
  const permiteVideoLink = formData.get("permiteVideoLink") === "on";

  if (!formularioId || !enunciado || !isTipo(tipo)) {
    return { error: "Completa el enunciado y el tipo de pregunta." };
  }

  const formulario = await prisma.formulario.findUnique({
    where: { id: formularioId },
    select: { tipo: true },
  });
  if (!formulario) return { error: "Formulario no encontrado." };
  if (esMentoriaContenido(formulario.tipo)) {
    return { error: "Este formulario de contenido no admite preguntas." };
  }

  const opcionesLeidas = leerOpcionesGuardadas(tipo, formData);
  if (opcionesLeidas.error) return { error: opcionesLeidas.error };

  const escala = leerEscala(formData);
  if ("error" in escala && escala.error) return { error: escala.error };

  const last = await prisma.pregunta.findFirst({
    where: { formularioId },
    orderBy: { orden: "desc" },
  });

  const pregunta = await prisma.pregunta.create({
    data: {
      formularioId,
      enunciado,
      ayuda,
      tipo,
      obligatoria,
      permiteArchivo,
      permiteImagen,
      permiteVideoLink,
      opciones: opcionesLeidas.opciones,
      conNotas: escala.conNotas,
      escalaNotas: escala.escalaNotas,
      orden: (last?.orden ?? 0) + 1,
    },
  });

  revalidatePath(`/admin/formularios/${formularioId}`);
  return { ok: true, id: pregunta.id };
}

export async function eliminarPregunta(formData: FormData) {
  await requireUser("ADMIN");
  const id = String(formData.get("id") ?? "");
  const formularioId = String(formData.get("formularioId") ?? "");
  if (!id) return { error: "Pregunta no encontrada." };
  const actual = await prisma.pregunta.findUnique({ where: { id } });
  if (!actual) return { error: "Pregunta no encontrada." };
  if (esPreguntaNombreCaso(actual)) {
    return { error: "El nombre del caso es una pregunta fija y no se puede eliminar." };
  }
  await prisma.pregunta.delete({ where: { id } });
  revalidatePath(`/admin/formularios/${formularioId}`);
  return { ok: true };
}

export async function moverPregunta(formData: FormData) {
  await requireUser("ADMIN");
  const id = String(formData.get("id") ?? "");
  const formularioId = String(formData.get("formularioId") ?? "");
  const direccion = String(formData.get("direccion") ?? "");

  const preguntas = await prisma.pregunta.findMany({
    where: { formularioId },
    orderBy: { orden: "asc" },
  });
  const index = preguntas.findIndex((p) => p.id === id);
  if (index < 0) return { error: "Pregunta no encontrada." };
  const swapWith = direccion === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= preguntas.length) return { ok: true };
  if (esPreguntaNombreCaso(preguntas[index]) || esPreguntaNombreCaso(preguntas[swapWith])) {
    return { error: "El nombre del caso debe permanecer como primera pregunta." };
  }

  const a = preguntas[index];
  const b = preguntas[swapWith];
  await prisma.$transaction([
    prisma.pregunta.update({ where: { id: a.id }, data: { orden: b.orden } }),
    prisma.pregunta.update({ where: { id: b.id }, data: { orden: a.orden } }),
  ]);
  revalidatePath(`/admin/formularios/${formularioId}`);
  return { ok: true };
}

export async function actualizarPregunta(formData: FormData) {
  await requireUser("ADMIN");
  const id = String(formData.get("id") ?? "");
  const formularioId = String(formData.get("formularioId") ?? "");
  const enunciado = String(formData.get("enunciado") ?? "").trim();
  const ayuda = String(formData.get("ayuda") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "");
  const obligatoria = formData.get("obligatoria") === "on";
  const permiteArchivo = formData.get("permiteArchivo") === "on";
  const permiteImagen = formData.get("permiteImagen") === "on";
  const permiteVideoLink = formData.get("permiteVideoLink") === "on";

  if (!id || !formularioId || !enunciado || !isTipo(tipo)) {
    return { error: "Completa el enunciado y el tipo de pregunta." };
  }

  const actual = await prisma.pregunta.findUnique({ where: { id } });
  if (!actual) return { error: "Pregunta no encontrada." };
  if (esPreguntaNombreCaso(actual)) {
    return { error: "El nombre del caso es una pregunta fija y no se puede editar." };
  }

  const opcionesLeidas = leerOpcionesGuardadas(tipo, formData);
  if (opcionesLeidas.error) return { error: opcionesLeidas.error };

  const escala = leerEscala(formData);
  if ("error" in escala && escala.error) return { error: escala.error };

  await prisma.pregunta.update({
    where: { id },
    data: {
      enunciado,
      ayuda,
      tipo,
      obligatoria,
      permiteArchivo,
      permiteImagen,
      permiteVideoLink,
      opciones: opcionesLeidas.opciones,
      conNotas: escala.conNotas,
      escalaNotas: escala.escalaNotas,
    },
  });
  revalidatePath(`/admin/formularios/${formularioId}`);
  return { ok: true };
}

export async function crearFormularioCompleto(payload: {
  titulo: string;
  tipo?: TipoFormulario;
  modoEvaluacion?: string;
  preguntas: {
    enunciado: string;
    ayuda: string;
    tipo: TipoPregunta;
    opciones: string;
    obligatoria: boolean;
    permiteArchivo: boolean;
    permiteImagen: boolean;
    permiteVideoLink: boolean;
    conNotas: boolean;
    escalaNotas: { valor: number; etiqueta: string }[];
  }[];
}) {
  const admin = await requireUser("ADMIN");
  const titulo = payload.titulo.trim();
  if (!titulo) return { error: "El título es obligatorio." };
  const { permitirEvaluacionPorPregunta } = await leerConfigApp();
  const modoEvaluacion = modoEvaluacionAlCrear(payload.modoEvaluacion, permitirEvaluacionPorPregunta);

  const payloadPreguntas = esPreguntaNombreCaso(payload.preguntas[0] ?? { opciones: "" })
    ? payload.preguntas
    : [{ ...datosPreguntaNombreCaso(), escalaNotas: [] as { valor: number; etiqueta: string }[] }, ...payload.preguntas];

  for (const pregunta of payloadPreguntas) {
    if (!pregunta.enunciado.trim() || !isTipo(pregunta.tipo)) {
      return { error: "Completa el enunciado y el tipo de cada pregunta." };
    }
    if (tipoTieneOpciones(pregunta.tipo)) {
      try {
        const opciones = JSON.parse(pregunta.opciones) as unknown;
        if (!Array.isArray(opciones) || opciones.length < 2) {
          return { error: "Hay una pregunta de opciones que necesita al menos dos alternativas." };
        }
      } catch {
        return { error: "Hay una pregunta de opciones inválida." };
      }
    }
    if (pregunta.conNotas) {
      const error = validarEscalaNotas(pregunta.escalaNotas);
      if (error) return { error };
    }
  }

  const tipo = parseTipoFormulario(payload.tipo);
  if (tipo === "CONTENIDO") {
    return { error: "Usa el compositor de contenido para este tipo de formulario." };
  }

  const form = await prisma.formulario.create({
    data: {
      titulo,
      tipo,
      modoEvaluacion,
      creadoPorId: admin.id,
      preguntas: {
        create: payloadPreguntas.map((pregunta, index) => ({
          enunciado: pregunta.enunciado.trim(),
          ayuda: pregunta.ayuda.trim(),
          tipo: pregunta.tipo,
          obligatoria: pregunta.obligatoria,
          permiteArchivo: pregunta.permiteArchivo,
          permiteImagen: pregunta.permiteImagen,
          permiteVideoLink: pregunta.permiteVideoLink,
          opciones: pregunta.opciones,
          conNotas: pregunta.conNotas,
          escalaNotas: pregunta.conNotas ? serializeEscalaNotas(pregunta.escalaNotas) : "[]",
          orden: index + 1,
        })),
      },
    },
  });

  redirect(`/admin/formularios/${form.id}`);
}

async function formularioContenido(formularioId: string) {
  const formulario = await prisma.formulario.findUnique({
    where: { id: formularioId },
    select: { id: true, tipo: true },
  });
  if (!formulario) return { error: "Formulario no encontrado." };
  if (!esMentoriaContenido(formulario.tipo)) {
    return { error: "Este formulario no es de contenido." };
  }
  return { formulario };
}

async function guardarMedioDesdeFormData(formData: FormData): Promise<
  { error: string } | { clase: "imagen" | "video" | "archivo"; payload: string }
> {
  const clase = parseClaseMedio(String(formData.get("clase") ?? ""));
  if (!clase) return { error: "Indica si es foto, video o archivo." };

  if (clase === "video") {
    const url = String(formData.get("videoUrl") ?? "").trim();
    const errorLink = validarVideoLink(url);
    if (!url) return { error: "Pega un link de video." };
    if (errorLink) return { error: errorLink };
    const resolved = resolveVideoEmbed(url);
    if (!resolved) return { error: errorLink ?? "El link de video no es válido." };
    return {
      clase,
      payload: serializeMedioPayload({
        id: randomUUID(),
        kind: "video_link",
        url: resolved.url,
        provider: resolved.provider,
      }),
    };
  }

  const file = formData.get("archivo");
  if (!(file instanceof File) || file.size <= 0) {
    return { error: clase === "imagen" ? "Sube una foto." : "Sube un archivo." };
  }
  if (clase === "imagen" && !file.type.startsWith("image/")) {
    return { error: "La foto debe ser un archivo de imagen." };
  }
  const stored = await saveUpload(file, clase === "imagen" ? "image" : "file");
  return { clase, payload: serializeMedioPayload(stored) };
}

export async function crearFormularioContenido(formData: FormData) {
  const admin = await requireUser("ADMIN");
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return { error: "El título es obligatorio." };

  let piezasMeta: { titulo: string; descripcion: string; medios: number }[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("piezas") ?? "[]")) as unknown;
    if (!Array.isArray(parsed)) throw new Error("invalid");
    piezasMeta = parsed.map((item) => {
      const row = item as { titulo?: unknown; descripcion?: unknown; medios?: unknown };
      return {
        titulo: String(row.titulo ?? "").trim(),
        descripcion: String(row.descripcion ?? "").trim(),
        medios: Math.max(0, Number(row.medios) || 0),
      };
    });
  } catch {
    return { error: "Las casillas de contenido no son válidas." };
  }

  if (piezasMeta.length === 0) return { error: "Agrega al menos una casilla de contenido." };
  if (piezasMeta.some((pieza) => !pieza.titulo)) {
    return { error: "Cada casilla necesita un título." };
  }

  const form = await prisma.formulario.create({
    data: {
      titulo,
      tipo: "CONTENIDO",
      modoEvaluacion: "GENERAL",
      creadoPorId: admin.id,
    },
  });

  try {
    for (let i = 0; i < piezasMeta.length; i += 1) {
      const pieza = await prisma.piezaContenido.create({
        data: {
          formularioId: form.id,
          titulo: piezasMeta[i].titulo,
          descripcion: piezasMeta[i].descripcion,
          orden: i + 1,
        },
      });
      for (let j = 0; j < piezasMeta[i].medios; j += 1) {
        const medioData = new FormData();
        medioData.set("clase", String(formData.get(`medio-${i}-${j}-clase`) ?? ""));
        medioData.set("videoUrl", String(formData.get(`medio-${i}-${j}-videoUrl`) ?? ""));
        const archivo = formData.get(`medio-${i}-${j}-archivo`);
        if (archivo instanceof File) medioData.set("archivo", archivo);
        const medio = await guardarMedioDesdeFormData(medioData);
        if ("error" in medio) throw new Error(medio.error);
        await prisma.medioContenido.create({
          data: {
            piezaId: pieza.id,
            orden: j + 1,
            clase: medio.clase,
            payload: medio.payload,
          },
        });
      }
    }
  } catch (error) {
    await prisma.formulario.delete({ where: { id: form.id } }).catch(() => undefined);
    return { error: error instanceof Error ? error.message : "No se pudo guardar el formulario." };
  }

  redirect(`/admin/formularios/${form.id}`);
}

export async function agregarPiezaContenido(formData: FormData) {
  await requireUser("ADMIN");
  const formularioId = String(formData.get("formularioId") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  if (!formularioId || !titulo) return { error: "El título de la casilla es obligatorio." };
  const formOk = await formularioContenido(formularioId);
  if ("error" in formOk) return formOk;

  const last = await prisma.piezaContenido.findFirst({
    where: { formularioId },
    orderBy: { orden: "desc" },
  });
  const pieza = await prisma.piezaContenido.create({
    data: { formularioId, titulo, descripcion, orden: (last?.orden ?? 0) + 1 },
  });
  revalidatePath(`/admin/formularios/${formularioId}`);
  return { ok: true, id: pieza.id };
}

export async function actualizarPiezaContenido(formData: FormData) {
  await requireUser("ADMIN");
  const id = String(formData.get("id") ?? "");
  const formularioId = String(formData.get("formularioId") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  if (!id || !formularioId || !titulo) return { error: "El título de la casilla es obligatorio." };
  const formOk = await formularioContenido(formularioId);
  if ("error" in formOk) return formOk;

  const actual = await prisma.piezaContenido.findFirst({ where: { id, formularioId } });
  if (!actual) return { error: "Casilla no encontrada." };
  await prisma.piezaContenido.update({ where: { id }, data: { titulo, descripcion } });
  revalidatePath(`/admin/formularios/${formularioId}`);
  return { ok: true };
}

export async function eliminarPiezaContenido(formData: FormData) {
  await requireUser("ADMIN");
  const id = String(formData.get("id") ?? "");
  const formularioId = String(formData.get("formularioId") ?? "");
  if (!id) return { error: "Casilla no encontrada." };
  const actual = await prisma.piezaContenido.findUnique({
    where: { id },
    include: { medios: true },
  });
  if (!actual) return { error: "Casilla no encontrada." };
  for (const medio of actual.medios) {
    const parsed = parseMedioPayload(medio.payload);
    if (parsed && "relativePath" in parsed && parsed.relativePath) {
      await deleteUpload(parsed.relativePath);
    }
  }
  await prisma.piezaContenido.delete({ where: { id } });
  revalidatePath(`/admin/formularios/${formularioId}`);
  return { ok: true };
}

export async function moverPiezaContenido(formData: FormData) {
  await requireUser("ADMIN");
  const id = String(formData.get("id") ?? "");
  const formularioId = String(formData.get("formularioId") ?? "");
  const direccion = String(formData.get("direccion") ?? "");
  const piezas = await prisma.piezaContenido.findMany({
    where: { formularioId },
    orderBy: { orden: "asc" },
  });
  const index = piezas.findIndex((p) => p.id === id);
  if (index < 0) return { error: "Casilla no encontrada." };
  const swapWith = direccion === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= piezas.length) return { ok: true };
  const a = piezas[index];
  const b = piezas[swapWith];
  await prisma.$transaction([
    prisma.piezaContenido.update({ where: { id: a.id }, data: { orden: b.orden } }),
    prisma.piezaContenido.update({ where: { id: b.id }, data: { orden: a.orden } }),
  ]);
  revalidatePath(`/admin/formularios/${formularioId}`);
  return { ok: true };
}

export async function agregarMedioContenido(formData: FormData) {
  await requireUser("ADMIN");
  const piezaId = String(formData.get("piezaId") ?? "");
  const formularioId = String(formData.get("formularioId") ?? "");
  if (!piezaId || !formularioId) return { error: "Casilla no encontrada." };
  const formOk = await formularioContenido(formularioId);
  if ("error" in formOk) return formOk;
  const pieza = await prisma.piezaContenido.findFirst({ where: { id: piezaId, formularioId } });
  if (!pieza) return { error: "Casilla no encontrada." };

  const medio = await guardarMedioDesdeFormData(formData);
  if ("error" in medio) return medio;

  const last = await prisma.medioContenido.findFirst({
    where: { piezaId },
    orderBy: { orden: "desc" },
  });
  const creado = await prisma.medioContenido.create({
    data: {
      piezaId,
      orden: (last?.orden ?? 0) + 1,
      clase: medio.clase,
      payload: medio.payload,
    },
  });
  revalidatePath(`/admin/formularios/${formularioId}`);
  return { ok: true, id: creado.id, clase: medio.clase, payload: medio.payload };
}

export async function eliminarMedioContenido(formData: FormData) {
  await requireUser("ADMIN");
  const id = String(formData.get("id") ?? "");
  const formularioId = String(formData.get("formularioId") ?? "");
  const medio = await prisma.medioContenido.findUnique({
    where: { id },
    include: { pieza: { select: { formularioId: true } } },
  });
  if (!medio) return { error: "Archivo no encontrado." };
  const parsed = parseMedioPayload(medio.payload);
  if (parsed && "relativePath" in parsed && parsed.relativePath) {
    await deleteUpload(parsed.relativePath);
  }
  await prisma.medioContenido.delete({ where: { id } });
  revalidatePath(`/admin/formularios/${formularioId || medio.pieza.formularioId}`);
  return { ok: true };
}

export async function crearFormularioForm(formData: FormData): Promise<void> {
  await crearFormulario(formData);
}

export async function moverPreguntaForm(formData: FormData): Promise<void> {
  await moverPregunta(formData);
}

export async function eliminarPreguntaForm(formData: FormData): Promise<void> {
  await eliminarPregunta(formData);
}
