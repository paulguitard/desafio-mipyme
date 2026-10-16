"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { resolveVideoEmbed } from "@/lib/preguntas";
import { youtubeThumbAppUrl, youtubeThumbCdnUrl, youtubeVideoIdDesdeEmbed } from "@/lib/youtube-thumb";

const PROVIDER_LABEL = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  google_drive: "Google Drive",
  sharepoint: "SharePoint",
} as const;

function youtubeThumb(embedUrl: string, sameOrigin: boolean) {
  const id = youtubeVideoIdDesdeEmbed(embedUrl);
  if (!id) return null;
  return sameOrigin ? youtubeThumbAppUrl(id) : youtubeThumbCdnUrl(id);
}

function embedSrc(embedUrl: string, autoPlay?: boolean) {
  if (!autoPlay) return embedUrl;
  try {
    const parsed = new URL(embedUrl);
    parsed.searchParams.set("autoplay", "1");
    return parsed.toString();
  } catch {
    return embedUrl;
  }
}

export function VideoEmbed({ url, autoPlay }: { url: string; autoPlay?: boolean }) {
  const resolved = resolveVideoEmbed(url);
  if (!resolved) {
    return <p className="text-sm text-muted">Link de video no válido.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-border bg-black">
        <iframe
          src={embedSrc(resolved.embedUrl, autoPlay)}
          title={`Video ${PROVIDER_LABEL[resolved.provider]}`}
          className="aspect-video w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
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

function VideoMiniaturaContenido({ thumb }: { thumb: string | null }) {
  const [roto, setRoto] = useState(false);
  const mostrarImg = Boolean(thumb) && !roto;
  return (
    <>
      {mostrarImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb ?? ""}
          alt=""
          className="pregunta-adjuntos-media"
          onError={() => setRoto(true)}
        />
      ) : (
        <span className="pregunta-adjuntos-media pregunta-adjuntos-video-fallback" />
      )}
      <span className="pregunta-adjuntos-play" aria-hidden="true" />
    </>
  );
}

export function VideoMiniatura({
  url,
  onAbrir,
  enlaceExterno = false,
}: {
  url: string;
  onAbrir?: () => void;
  /** En PDF: abre el link del video en pestaña nueva (sin modal). */
  enlaceExterno?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const resolved = resolveVideoEmbed(url);
  if (!resolved) {
    return <span className="text-muted">Video no válido</span>;
  }

  const thumb =
    resolved.provider === "youtube" ? youtubeThumb(resolved.embedUrl, enlaceExterno) : null;
  const label = `Reproducir video de ${PROVIDER_LABEL[resolved.provider]}`;

  if (enlaceExterno) {
    return (
      <a
        href={resolved.url}
        target="_blank"
        rel="noreferrer"
        className="pregunta-adjuntos-video"
        title={label}
        aria-label={label}
        data-pdf-link={resolved.url}
        data-pdf-bloque=""
      >
        <VideoMiniaturaContenido thumb={thumb} />
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        className="pregunta-adjuntos-video"
        title={label}
        aria-label={label}
        onClick={() => {
          onAbrir?.();
          setAbierto(true);
        }}
      >
        <VideoMiniaturaContenido thumb={thumb} />
      </button>
      <Modal
        open={abierto}
        title="Video"
        onClose={() => setAbierto(false)}
        className="modal-video-embed"
      >
        {abierto ? <VideoEmbed url={url} autoPlay /> : null}
      </Modal>
    </>
  );
}
