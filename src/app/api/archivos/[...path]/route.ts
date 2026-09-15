import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { mimeFromFilename, uploadAbsolutePath } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const relativePath = segments.join("/");
  try {
    const absolute = uploadAbsolutePath(relativePath);
    const info = await stat(absolute);
    if (!info.isFile()) {
      return new Response("No encontrado", { status: 404 });
    }
    const stream = Readable.toWeb(createReadStream(absolute)) as ReadableStream;
    const contentType = mimeFromFilename(relativePath);
    return new Response(stream, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(
          relativePath.replace(/^[0-9a-f-]{36}-/i, "") || "archivo",
        )}`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
