"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { deleteUpload, saveUpload } from "@/lib/storage";
import { parseImagenConvocatoria } from "@/lib/convocatoria";
import {
  DEFAULT_CORREO_RECUPERACION,
  destosearTextoCorreo,
  toConfigCorreoView,
  type ConfigCorreoRecuperacionData,
} from "@/lib/correo-recuperacion";
import {
  DEFAULT_CORREO_NOTIFICACION,
  guardarFilaCorreoNotificacion,
  isTipoCorreoNotificacion,
  listarConfigCorreoNotificacion,
  type TextosCorreoNotificacion,
  type TipoCorreoNotificacion,
} from "@/lib/correo-notificacion";
import {
  CONFIG_APP_ID,
  DEFAULT_CONFIG_APP,
  type ConfigAppData,
  leerConfigApp,
} from "@/lib/config-app";

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

async function borrarImagenSiExiste(raw: string) {
  const file = parseImagenConvocatoria(raw);
  if (!file?.relativePath) return;
  try {
    await deleteUpload(file.relativePath);
  } catch {
    /* no bloquear si el archivo ya no existe */
  }
}

async function leerImagen(formData: FormData, actual: string) {
  const file = formData.get("imagen");
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return { error: "La imagen debe ser un archivo de imagen." };
    }
    await borrarImagenSiExiste(actual);
    const stored = await saveUpload(file, "image");
    return JSON.stringify(stored);
  }

  const quitar = String(formData.get("quitarImagen") ?? "") === "1";
  if (quitar) {
    await borrarImagenSiExiste(actual);
    return "";
  }

  return actual;
}

export async function getConfigCorreoRecuperacion(): Promise<
  { ok: true; config: ConfigCorreoRecuperacionData } | { ok: false; error: string; config: ConfigCorreoRecuperacionData }
> {
  await requireUser("ADMIN");
  try {
    const row = await prisma.configCorreoRecuperacion.findUnique({
      where: { id: "default" },
    });
    if (!row) {
      return { ok: true, config: toConfigCorreoView(DEFAULT_CORREO_RECUPERACION) };
    }
    return {
      ok: true,
      config: toConfigCorreoView({
        asunto: row.asunto,
        titulo: row.titulo,
        cuerpo: row.cuerpo,
        textoBoton: row.textoBoton,
        pie: row.pie,
        colorFondo: row.colorFondo,
        colorEncabezado: row.colorEncabezado,
        colorBoton: row.colorBoton,
        colorTexto: row.colorTexto,
        imagen: row.imagen,
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return {
      ok: false,
      error: `No se pudo cargar la configuración. ${message.slice(0, 160)}`,
      config: toConfigCorreoView(DEFAULT_CORREO_RECUPERACION),
    };
  }
}

export async function guardarConfigCorreoRecuperacion(formData: FormData) {
  await requireUser("ADMIN");

  const asunto = destosearTextoCorreo(String(formData.get("asunto") ?? "").trim());
  const titulo = destosearTextoCorreo(String(formData.get("titulo") ?? "").trim());
  const cuerpo = destosearTextoCorreo(String(formData.get("cuerpo") ?? "").trim());
  const textoBoton = destosearTextoCorreo(String(formData.get("textoBoton") ?? "").trim());
  const pie = destosearTextoCorreo(String(formData.get("pie") ?? "").trim());
  const colorFondo = String(formData.get("colorFondo") ?? "").trim();
  const colorEncabezado = String(formData.get("colorEncabezado") ?? "").trim();
  const colorBoton = String(formData.get("colorBoton") ?? "").trim();
  const colorTexto = String(formData.get("colorTexto") ?? "").trim();

  if (!asunto || !titulo || !cuerpo || !textoBoton) {
    return { error: "Asunto, título, cuerpo y texto del botón son obligatorios." };
  }
  if (![colorFondo, colorEncabezado, colorBoton, colorTexto].every(isHexColor)) {
    return { error: "Los colores deben ser hexadecimales (#RRGGBB)." };
  }

  const actual = await prisma.configCorreoRecuperacion.findUnique({
    where: { id: "default" },
  });
  const imagen = await leerImagen(formData, actual?.imagen ?? "");
  if (typeof imagen !== "string") return imagen;

  await prisma.configCorreoRecuperacion.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      asunto,
      titulo,
      cuerpo,
      textoBoton,
      pie,
      colorFondo,
      colorEncabezado,
      colorBoton,
      colorTexto,
      imagen,
    },
    update: {
      asunto,
      titulo,
      cuerpo,
      textoBoton,
      pie,
      colorFondo,
      colorEncabezado,
      colorBoton,
      colorTexto,
      imagen,
    },
  });

  const loaded = await getConfigCorreoRecuperacion();
  if (!loaded.ok) return { error: loaded.error };
  return { ok: true as const, config: loaded.config };
}

export async function getConfigCorreoNotificaciones(): Promise<{
  ok: boolean;
  error?: string;
  textos: Record<TipoCorreoNotificacion, TextosCorreoNotificacion>;
}> {
  await requireUser("ADMIN");
  const fallback = { ...DEFAULT_CORREO_NOTIFICACION };
  try {
    const rows = await listarConfigCorreoNotificacion();
    const textos = { ...fallback };
    for (const row of rows) {
      if (!isTipoCorreoNotificacion(row.id)) continue;
      textos[row.id] = {
        asunto: destosearTextoCorreo(row.asunto),
        titulo: destosearTextoCorreo(row.titulo),
        cuerpo: destosearTextoCorreo(row.cuerpo),
        textoBoton: destosearTextoCorreo(row.textoBoton),
        pie: destosearTextoCorreo(row.pie),
      };
    }
    return { ok: true, textos };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return {
      ok: false,
      error: `No se pudieron cargar los avisos. ${message.slice(0, 160)}`,
      textos: fallback,
    };
  }
}

export async function guardarConfigCorreoNotificacion(formData: FormData) {
  await requireUser("ADMIN");

  const tipo = String(formData.get("tipo") ?? "").trim();
  if (!isTipoCorreoNotificacion(tipo)) {
    return { error: "Tipo de aviso no válido." };
  }

  const asunto = destosearTextoCorreo(String(formData.get("asunto") ?? "").trim());
  const titulo = destosearTextoCorreo(String(formData.get("titulo") ?? "").trim());
  const cuerpo = destosearTextoCorreo(String(formData.get("cuerpo") ?? "").trim());
  const textoBoton = destosearTextoCorreo(String(formData.get("textoBoton") ?? "").trim());
  const pie = destosearTextoCorreo(String(formData.get("pie") ?? "").trim());

  if (!asunto || !titulo || !cuerpo || !textoBoton) {
    return { error: "Asunto, título, cuerpo y texto del botón son obligatorios." };
  }

  await guardarFilaCorreoNotificacion(tipo, { asunto, titulo, cuerpo, textoBoton, pie });

  const loaded = await getConfigCorreoNotificaciones();
  if (!loaded.ok) return { error: loaded.error };
  return { ok: true as const, textos: loaded.textos };
}

export async function getConfigApp(): Promise<
  { ok: true; config: ConfigAppData } | { ok: false; error: string; config: ConfigAppData }
> {
  await requireUser("ADMIN");
  try {
    return { ok: true, config: await leerConfigApp() };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return {
      ok: false,
      error: `No se pudo cargar la configuración. ${message.slice(0, 160)}`,
      config: { ...DEFAULT_CONFIG_APP },
    };
  }
}

export async function guardarConfigApp(formData: FormData) {
  await requireUser("ADMIN");
  const permitirEvaluacionPorPregunta =
    String(formData.get("permitirEvaluacionPorPregunta") ?? "") === "1";

  await prisma.configApp.upsert({
    where: { id: CONFIG_APP_ID },
    create: {
      id: CONFIG_APP_ID,
      permitirEvaluacionPorPregunta,
    },
    update: { permitirEvaluacionPorPregunta },
  });

  const loaded = await getConfigApp();
  if (!loaded.ok) return { error: loaded.error };
  revalidatePath("/admin/formularios");
  revalidatePath("/admin/formularios/nuevo");
  return { ok: true as const, config: loaded.config };
}
