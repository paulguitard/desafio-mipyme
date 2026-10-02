"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
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

export function VideoMiniatura({ url, onAbrir }: { url: string; onAbrir?: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const resolved = resolveVideoEmbed(url);
  if (!resolved) {
    return <span className="text-muted">Video no válido</span>;
  }

  const thumb = resolved.provider === "youtube" ? youtubeThumb(resolved.embedUrl) : null;
  const label = `Reproducir video de ${PROVIDER_LABEL[resolved.provider]}`;

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
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="pregunta-adjuntos-media" />
        ) : (
          <span className="pregunta-adjuntos-media pregunta-adjuntos-video-fallback" />
        )}
        <span className="pregunta-adjuntos-play" aria-hidden="true" />
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
