"use server";

import { revalidatePath } from "next/cache";
import { updateSession } from "@/auth";
import { prisma } from "@/lib/db";
import { parseArchivosSoloFiles, publicUploadUrl, type StoredFile } from "@/lib/preguntas";
import { normalizarRutParaGuardar } from "@/lib/rut";
import { requirePortalUser, requireUser } from "@/lib/session";
import {
  deleteUpload,
  MAX_DOCUMENTOS_FORMALIZACION,
  MAX_PERFIL_PDF_BYTES,
  saveUpload,
} from "@/lib/storage";

const MAX_DIRECCION = 200;

function serializeDocumentos(docs: StoredFile[]): string {
  return JSON.stringify(docs);
}

export async function actualizarPerfilPropio(formData: FormData) {
  const sessionUser = await requirePortalUser();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "El nombre es obligatorio." };
  }

  if (name.length > 120) {
    return { error: "El nombre es demasiado largo." };
  }

  const data: {
    name: string;
    rutPersonal?: string | null;
    direccionPersonal?: string | null;
    telefonoMovil?: string | null;
    contactoWhatsapp?: boolean;
  } = { name };

  if (sessionUser.role === "EMPRENDEDOR") {
    const rutResult = normalizarRutParaGuardar(String(formData.get("rutPersonal") ?? ""));
    if (!rutResult.ok) {
      return { error: rutResult.error };
    }

    const direccion = String(formData.get("direccionPersonal") ?? "").trim();
    if (direccion.length > MAX_DIRECCION) {
      return { error: `La dirección no puede superar ${MAX_DIRECCION} caracteres.` };
    }

    const telefonoRaw = String(formData.get("telefonoMovil") ?? "").trim();
    const telefono = telefonoRaw.replace(/\D/g, "");
    if (telefonoRaw && telefono !== telefonoRaw) {
      return { error: "El número de teléfono móvil solo puede contener dígitos." };
    }
    if (telefono && !/^\d{9}$/.test(telefono)) {
      return { error: "El número de teléfono móvil debe tener 9 dígitos." };
    }

    const contactoWhatsapp =
      String(formData.get("contactoWhatsapp") ?? "") === "true" ||
      String(formData.get("contactoWhatsapp") ?? "") === "on" ||
      String(formData.get("contactoWhatsapp") ?? "") === "1";

    if (contactoWhatsapp && !telefono) {
      return {
        error: "Indica un número de teléfono móvil para ser contactado por WhatsApp.",
      };
    }

    data.rutPersonal = rutResult.rut;
    data.direccionPersonal = direccion || null;
    data.telefonoMovil = telefono || null;
    data.contactoWhatsapp = contactoWhatsapp;
  }

  await prisma.user.update({
    where: { id: sessionUser.id },
    data,
  });

  await updateSession({ user: { name } });

  revalidatePath("/participante");
  revalidatePath("/participante/perfil");
  revalidatePath("/evaluador");
  revalidatePath("/evaluador/perfil");
  return { ok: true };
}

function esPdfValido(file: File, buffer: Buffer): string | null {
  const name = (file.name || "").toLowerCase();
  if (!name.endsWith(".pdf")) {
    return "Solo se permiten archivos PDF.";
  }
  const mime = (file.type || "").toLowerCase();
  if (mime && mime !== "application/pdf" && mime !== "application/x-pdf") {
    return "Solo se permiten archivos PDF.";
  }
  if (buffer.length < 5 || buffer.subarray(0, 4).toString("ascii") !== "%PDF") {
    return "El archivo no es un PDF válido.";
  }
  if (buffer.length > MAX_PERFIL_PDF_BYTES) {
    return "El archivo no puede superar 5 MB.";
  }
  return null;
}

export async function subirDocumentoFormalizacion(formData: FormData) {
  const sessionUser = await requireUser("EMPRENDEDOR");
  const file = formData.get("documento");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un archivo PDF." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const invalido = esPdfValido(file, buffer);
  if (invalido) {
    return { error: invalido };
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { documentosFormalizacion: true },
  });
  if (!user) {
    return { error: "Usuario no encontrado." };
  }

  const actuales = parseArchivosSoloFiles(user.documentosFormalizacion);
  if (actuales.length >= MAX_DOCUMENTOS_FORMALIZACION) {
    return { error: `Puedes subir como máximo ${MAX_DOCUMENTOS_FORMALIZACION} documentos.` };
  }

  let stored: StoredFile;
  try {
    stored = await saveUpload(file, "file", { maxFileBytes: MAX_PERFIL_PDF_BYTES });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo subir el archivo.";
    return { error: message };
  }

  const siguiente = [...actuales, stored];
  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { documentosFormalizacion: serializeDocumentos(siguiente) },
  });

  revalidatePath("/participante/perfil");
  return {
    ok: true as const,
    documento: { ...stored, url: publicUploadUrl(stored) },
    documentos: siguiente.map((d) => ({ ...d, url: publicUploadUrl(d) })),
  };
}

export async function eliminarDocumentoFormalizacion(documentoId: string) {
  const sessionUser = await requireUser("EMPRENDEDOR");
  const id = String(documentoId ?? "").trim();
  if (!id) {
    return { error: "Documento no encontrado." };
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { documentosFormalizacion: true },
  });
  if (!user) {
    return { error: "Usuario no encontrado." };
  }

  const actuales = parseArchivosSoloFiles(user.documentosFormalizacion);
  const target = actuales.find((d) => d.id === id);
  if (!target) {
    return { error: "Documento no encontrado." };
  }

  const resto = actuales.filter((d) => d.id !== id);
  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { documentosFormalizacion: serializeDocumentos(resto) },
  });

  try {
    await deleteUpload(target.relativePath);
  } catch {
    /* el registro ya se actualizó; no bloquear por un archivo huérfano */
  }

  revalidatePath("/participante/perfil");
  return {
    ok: true as const,
    documentos: resto.map((d) => ({ ...d, url: publicUploadUrl(d) })),
  };
}
