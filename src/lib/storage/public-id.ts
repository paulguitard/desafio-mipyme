type StoredFileRef = { relativePath?: string; url?: string };

export function cloudinaryPublicIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("cloudinary.com")) return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    const marker = parts.findIndex((part) => part === "upload" || part === "authenticated");
    if (marker < 0) return null;
    let rest = parts.slice(marker + 1);
    if (rest[0] && /^v\d+$/.test(rest[0])) rest = rest.slice(1);
    const id = decodeURIComponent(rest.join("/")).replace(/\.[a-z0-9]+$/i, "");
    return id || null;
  } catch {
    return null;
  }
}

export function storedFilePublicId(file: StoredFileRef): string | null {
  const path = (file.relativePath ?? "").trim();
  if (path && !/^https?:\/\//i.test(path)) return path;
  return cloudinaryPublicIdFromUrl(file.url || path);
}

export function looksLikeCloudinaryPublicId(relativePath: string) {
  return relativePath.startsWith("desafio-mipyme/") || relativePath.startsWith("desafio-aiep/");
}

export function parseUploadWidth(raw: string | null | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 32 || n > 2000) return undefined;
  return n;
}

export function appUploadUrl(file: StoredFileRef, options?: { width?: number }): string {
  const publicId = storedFilePublicId(file);
  if (publicId) {
    const path = `/api/archivos/${publicId
      .split("/")
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join("/")}`;
    const width = options?.width;
    if (width && Number.isInteger(width) && width >= 32 && width <= 2000) {
      return `${path}?w=${width}`;
    }
    return path;
  }
  const fallback = file.url?.trim() ?? "";
  return /^https?:\/\//i.test(fallback) ? fallback : "";
}
