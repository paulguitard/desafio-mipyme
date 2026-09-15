import { unlink } from "node:fs/promises";
import path from "node:path";
import type { StoredFile } from "@/lib/preguntas";

export { MAX_FILE_BYTES, MAX_IMAGE_BYTES, MAX_IMAGE_INPUT_BYTES } from "@/lib/storage/limits";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

export function uploadAbsolutePath(relativePath: string) {
  const resolved = path.join(UPLOAD_ROOT, relativePath);
  if (!resolved.startsWith(UPLOAD_ROOT)) {
    throw new Error("Ruta de archivo inválida");
  }
  return resolved;
}

export async function deleteLocalUpload(relativePath: string) {
  try {
    await unlink(uploadAbsolutePath(relativePath));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

export function publicUploadUrl(file: StoredFile) {
  if (file.url) return file.url;
  if (/^https?:\/\//i.test(file.relativePath)) return file.relativePath;
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
