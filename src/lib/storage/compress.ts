import sharp from "sharp";
import {
  MAX_FILE_BYTES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_INPUT_BYTES,
} from "@/lib/storage/limits";

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

export async function prepareUploadBuffer(
  file: File,
  kind: "file" | "image",
  options?: { maxFileBytes?: number },
): Promise<{ originalName: string; mimeType: string; buffer: Buffer }> {
  let originalName = file.name || (kind === "image" ? "imagen" : "archivo");
  let mimeType = file.type || "application/octet-stream";
  let buffer = Buffer.from(await file.arrayBuffer());

  if (kind === "file") {
    if (mimeType === "image/svg+xml" || originalName.toLowerCase().endsWith(".svg")) {
      throw new Error("No se permiten archivos SVG.");
    }
    const maxBytes = options?.maxFileBytes ?? MAX_FILE_BYTES;
    if (buffer.length > maxBytes) {
      const mb = Math.round((maxBytes / (1024 * 1024)) * 10) / 10;
      throw new Error(`El archivo no puede superar ${mb} MB.`);
    }
    return { originalName, mimeType, buffer };
  }

  if (mimeType === "image/svg+xml" || originalName.toLowerCase().endsWith(".svg")) {
    throw new Error("No se permiten imágenes SVG.");
  }
  if (buffer.length > MAX_IMAGE_INPUT_BYTES) {
    throw new Error("La imagen no puede superar 10 MB antes de comprimirse.");
  }
  const compressed = await compressImageToMaxBytes(buffer, MAX_IMAGE_BYTES);
  return {
    originalName: withExtension(originalName, compressed.ext),
    mimeType: compressed.mimeType,
    buffer: Buffer.from(compressed.buffer),
  };
}
