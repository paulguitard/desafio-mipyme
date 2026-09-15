import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { StoredFile } from "@/lib/preguntas";
import {
  MAX_FILE_BYTES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_INPUT_BYTES,
} from "@/lib/storage/limits";

export { MAX_FILE_BYTES, MAX_IMAGE_BYTES, MAX_IMAGE_INPUT_BYTES } from "@/lib/storage/limits";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

function withExtension(name: string, ext: string) {
  const base = name.replace(/\.[^.]+$/, "") || "imagen";
  return `${base}.${ext}`;
}

async function compressImageToMaxBytes(
  input: Buffer,
  maxBytes: number,
): Promise<{ buffer: Buffer; mimeType: string; ext: string }> {
  const meta = await sharp(input).rotate().metadata();
  const width = meta.width && meta.width > 0 ? meta.width : 1920;

  for (let quality = 82; quality >= 40; quality -= 8) {
    for (let scale = 1; scale >= 0.35; scale = Math.round((scale - 0.15) * 100) / 100) {
      const targetWidth = Math.max(320, Math.round(width * scale));
      const buffer = await sharp(input)
        .rotate()
        .resize({ width: targetWidth, withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();
      if (buffer.length <= maxBytes) {
        return { buffer, mimeType: "image/webp", ext: "webp" };
      }
    }
  }

  throw new Error(
    `No se pudo comprimir la imagen a ${Math.round(maxBytes / 1024)} KB. Prueba con otra imagen.`,
  );
}

export async function saveUpload(
  file: File,
  kind: "file" | "image",
): Promise<StoredFile> {
  const id = randomUUID();
  let originalName = file.name || (kind === "image" ? "imagen" : "archivo");
  let mimeType = file.type || "application/octet-stream";
  let buffer = Buffer.from(await file.arrayBuffer());

  if (kind === "file") {
    if (buffer.length > MAX_FILE_BYTES) {
      throw new Error("El archivo no puede superar 2 MB.");
    }
  } else {
    if (buffer.length > MAX_IMAGE_INPUT_BYTES) {
      throw new Error("La imagen no puede superar 10 MB antes de comprimirse.");
    }
    if (buffer.length > MAX_IMAGE_BYTES) {
      const compressed = await compressImageToMaxBytes(buffer, MAX_IMAGE_BYTES);
      buffer = Buffer.from(compressed.buffer);
      mimeType = compressed.mimeType;
      originalName = withExtension(originalName, compressed.ext);
    }
  }

  const filename = `${id}-${safeName(originalName)}`;
  await mkdir(UPLOAD_ROOT, { recursive: true });
  await writeFile(path.join(UPLOAD_ROOT, filename), buffer);
  return {
    id,
    originalName,
    mimeType,
    kind,
    relativePath: filename,
  };
}

export function uploadAbsolutePath(relativePath: string) {
  const resolved = path.join(UPLOAD_ROOT, relativePath);
  if (!resolved.startsWith(UPLOAD_ROOT)) {
    throw new Error("Ruta de archivo inválida");
  }
  return resolved;
}

export async function deleteUpload(relativePath: string) {
  try {
    await unlink(uploadAbsolutePath(relativePath));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

export function publicUploadUrl(file: StoredFile) {
  return `/api/archivos/${encodeURIComponent(file.relativePath)}`;
}

export function mimeFromFilename(relativePath: string): string {
  const ext = path.extname(relativePath).toLowerCase();
  const map: Record<string, string> = {
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".zip": "application/zip",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
  };
  return map[ext] ?? "application/octet-stream";
}
