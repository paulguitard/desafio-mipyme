import { resolveVideoEmbed } from "@/lib/preguntas";

const PROVIDER_LABEL = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  google_drive: "Google Drive",
  sharepoint: "SharePoint",
} as const;

function youtubeThumb(embedUrl: string) {
  const id = embedUrl.split("/embed/")[1]?.split(/[/?#]/)[0];
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export function VideoEmbed({ url }: { url: string }) {
  const resolved = resolveVideoEmbed(url);
  if (!resolved) {
    return (
      <p className="text-sm text-muted">
        Link de video no válido:{" "}
        <a className="text-accent underline" href={url} target="_blank" rel="noreferrer">
          {url}
        </a>
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-border bg-black">
        <iframe
          src={resolved.embedUrl}
          title={`Video ${PROVIDER_LABEL[resolved.provider]}`}
          className="aspect-video w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <a className="text-sm text-accent underline" href={resolved.url} target="_blank" rel="noreferrer">
        Abrir en {PROVIDER_LABEL[resolved.provider]}
      </a>
    </div>
  );
}

export function VideoMiniatura({ url }: { url: string }) {
  const resolved = resolveVideoEmbed(url);
  if (!resolved) {
    return (
      <a className="text-accent underline" href={url} target="_blank" rel="noreferrer">
        {url}
      </a>
    );
  }

  const thumb = resolved.provider === "youtube" ? youtubeThumb(resolved.embedUrl) : null;
  const label = `Abrir video en ${PROVIDER_LABEL[resolved.provider]}`;

  return (
    <a
      className="pregunta-adjuntos-video"
      href={resolved.url}
      target="_blank"
      rel="noreferrer"
      title={label}
      aria-label={label}
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" className="pregunta-adjuntos-media" />
      ) : (
        <span className="pregunta-adjuntos-media pregunta-adjuntos-video-fallback" />
      )}
      <span className="pregunta-adjuntos-play" aria-hidden="true" />
    </a>
  );
}

