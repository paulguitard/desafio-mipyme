import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { auth } from "@/auth";
import { normalizeRole } from "@/lib/roles";
import { cloudinaryDeliveryUrl } from "@/lib/storage/cloudinary";
import { userCanAccessStoredFile, tokenCanAccessStoredFile, fileLooksLikeSvg } from "@/lib/storage/authorize";
import { mimeFromFilename, uploadAbsolutePath } from "@/lib/storage/local";
import { looksLikeCloudinaryPublicId, parseUploadWidth } from "@/lib/storage/public-id";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const relativePath = segments.map((segment) => decodeURIComponent(segment)).join("/");
  const requestUrl = new URL(request.url);
  const width = parseUploadWidth(requestUrl.searchParams.get("w"));
  const fichaToken = requestUrl.searchParams.get("ficha");

  let allowed = false;
  if (fichaToken) {
    allowed = await tokenCanAccessStoredFile(fichaToken, relativePath);
  } else {
    const session = await auth();
    const role = normalizeRole(session?.user?.role ?? "");
    if (!session?.user?.id || !role) {
      return new Response("No autorizado", { status: 401 });
    }
    allowed = await userCanAccessStoredFile({ id: session.user.id, role }, relativePath);
  }
  if (!allowed) {
    return new Response("No autorizado", { status: 403 });
  }

  if (!looksLikeCloudinaryPublicId(relativePath)) {
    try {
      const absolute = uploadAbsolutePath(relativePath);
      const info = await stat(absolute);
      if (!info.isFile()) {
        return new Response("No encontrado", { status: 404 });
      }
      const contentType = mimeFromFilename(relativePath);
      if (fileLooksLikeSvg(relativePath, contentType)) {
        return new Response("No encontrado", { status: 404 });
      }
      const stream = Readable.toWeb(createReadStream(absolute)) as ReadableStream;
      const filename = relativePath.replace(/^[0-9a-f-]{36}-/i, "") || "archivo";
      return new Response(stream, {
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(info.size),
          "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, max-age=300",
        },
      });
    } catch {
      /* local miss: try Cloudinary */
    }
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return new Response("No encontrado", { status: 404 });
  }

  const mime = mimeFromFilename(relativePath);
  const resourceType =
    mime.startsWith("image/") || mime === "application/octet-stream" ? "image" : "raw";
  const url = cloudinaryDeliveryUrl(relativePath, {
    resourceType,
    width: resourceType === "image" ? (width ?? 1200) : undefined,
  });
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Cache-Control": "private, max-age=300",
    },
  });
}
