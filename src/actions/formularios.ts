"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  datosPreguntaNombreCaso,
  esPreguntaNombreCaso,
} from "@/lib/nombre-caso";
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
  type ConfigGantt,
  type ConfigLimites,
  type ConfigObjetivos,
  type ConfigPresupuesto,
  type TipoPregunta,
} from "@/lib/preguntas";

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
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  if (!titulo) return { error: "El título es obligatorio." };

  const form = await prisma.formulario.create({
    data: {
      titulo,
      descripcion,
      creadoPorId: admin.id,
      preguntas: {
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
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  if (!id || !titulo) return { error: "El título es obligatorio." };

  await prisma.formulario.update({
    where: { id },
    data: { titulo, descripcion },
  });
  revalidatePath(`/admin/formularios/${id}`);
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
  descripcion: string;
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

  const form = await prisma.formulario.create({
    data: {
      titulo,
      descripcion: payload.descripcion.trim(),
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

export async function crearFormularioForm(formData: FormData): Promise<void> {
  await crearFormulario(formData);
}

export async function moverPreguntaForm(formData: FormData): Promise<void> {
  await moverPregunta(formData);
}

export async function eliminarPreguntaForm(formData: FormData): Promise<void> {
  await eliminarPregunta(formData);
}
