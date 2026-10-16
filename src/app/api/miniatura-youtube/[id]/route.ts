import { auth } from "@/auth";
import { youtubeThumbCdnUrl, YOUTUBE_VIDEO_ID_RE } from "@/lib/youtube-thumb";

const MAX_BYTES = 2 * 1024 * 1024;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("No autorizado", { status: 401 });
  }

  const { id } = await params;
  if (!YOUTUBE_VIDEO_ID_RE.test(id)) {
    return new Response("No encontrado", { status: 404 });
  }

  try {
    const remote = await fetch(youtubeThumbCdnUrl(id), {
      headers: { Accept: "image/*" },
    });
    if (!remote.ok) {
      return new Response("No encontrado", { status: 404 });
    }
    const contentType = remote.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/") || contentType.includes("svg")) {
      return new Response("No encontrado", { status: 404 });
    }
    const buffer = Buffer.from(await remote.arrayBuffer());
    if (buffer.byteLength < 32 || buffer.byteLength > MAX_BYTES) {
      return new Response("No encontrado", { status: 404 });
    }
    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
