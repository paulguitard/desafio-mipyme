"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { deleteUpload, saveUpload } from "@/lib/storage";
import { parseImagenConvocatoria } from "@/lib/convocatoria";
import {
  DEFAULT_CORREO_RECUPERACION,
  toConfigCorreoView,
  type ConfigCorreoRecuperacionData,
} from "@/lib/correo-recuperacion";

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

/** Para el envío de mails (sin exigir sesión admin). */
export async function loadConfigCorreoRecuperacionForMail(): Promise<
  Omit<ConfigCorreoRecuperacionData, "imagenUrl">
> {
  const row = await prisma.configCorreoRecuperacion.findUnique({
    where: { id: "default" },
  });
  if (!row) return DEFAULT_CORREO_RECUPERACION;
  return {
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
  };
}

export async function guardarConfigCorreoRecuperacion(formData: FormData) {
  await requireUser("ADMIN");

  const asunto = String(formData.get("asunto") ?? "").trim();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const cuerpo = String(formData.get("cuerpo") ?? "").trim();
  const textoBoton = String(formData.get("textoBoton") ?? "").trim();
  const pie = String(formData.get("pie") ?? "").trim();
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
