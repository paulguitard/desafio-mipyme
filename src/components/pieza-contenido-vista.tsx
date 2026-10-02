"use client";

import type { ReactNode } from "react";
import { VideoMiniatura } from "@/components/video-embed";
import { publicUploadUrl, isStoredFile, isStoredVideoLink } from "@/lib/preguntas";
import type { PiezaContenidoVista as Pieza } from "@/lib/contenido";

function etiquetaArchivo(name: string, mimeType: string) {
  const nombre = name.toLowerCase();
  if (mimeType.includes("pdf") || nombre.endsWith(".pdf")) return "PDF";
  const ext = name.split(".").pop()?.toUpperCase();
  return ext && ext.length <= 5 ? ext : "DOC";
}

export function PiezaContenidoVista({
  pieza,
  onAbrirMedio,
  checkbox = true,
  acciones,
  onQuitarMedio,
}: {
  pieza: Pieza;
  onAbrirMedio?: (piezaId: string) => void;
  checkbox?: boolean;
  acciones?: ReactNode;
  onQuitarMedio?: (medioId: string) => void;
}) {
  return (
    <article className="pieza-contenido card space-y-3 p-5">
      {checkbox || pieza.titulo || acciones || pieza.descripcion ? (
      <div className="space-y-1">
        {checkbox || pieza.titulo || acciones ? (
        <div className="flex items-start justify-between gap-3">
          {checkbox ? (
            <label className="pieza-contenido-titulo min-w-0 flex-1">
              <input
                className="pieza-contenido-check"
                type="checkbox"
                checked={Boolean(pieza.marcada)}
                disabled
                readOnly
              />
              <span>{pieza.titulo}</span>
            </label>
          ) : pieza.titulo ? (
            <h3 className="min-w-0 flex-1 text-xl font-semibold text-navy">{pieza.titulo}</h3>
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          {acciones ? <div className="flex shrink-0 items-center gap-1">{acciones}</div> : null}
        </div>
        ) : null}
        {pieza.descripcion?.trim() ? (
          <p className={`pieza-contenido-descripcion${checkbox ? " is-con-check" : ""}`}>
            {pieza.descripcion.trim()}
          </p>
        ) : null}
      </div>
      ) : null}
      {pieza.medios.length === 0 ? (
        <p className="text-muted">Aún no hay fotos, videos ni archivos en esta casilla.</p>
      ) : (
        <aside className="pregunta-adjuntos">
          <ul className="pregunta-adjuntos-lista">
            {pieza.medios.map((medio) => (
              <li key={medio.id} className="pieza-contenido-medio">
                <MedioContenidoVista
                  medio={medio}
                  onAbrir={onAbrirMedio ? () => onAbrirMedio(pieza.id) : undefined}
                />
                {onQuitarMedio ? (
                  <button
                    className="pieza-contenido-medio-quitar"
                    type="button"
                    onClick={() => onQuitarMedio(medio.id)}
                    aria-label={`Quitar ${medio.clase}`}
                    title="Quitar"
                  >
                    ×
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </aside>
      )}
    </article>
  );
}

function MedioContenidoVista({
  medio,
  onAbrir,
}: {
  medio: Pieza["medios"][number];
  onAbrir?: () => void;
}) {
  const { attachment } = medio;

  if (isStoredVideoLink(attachment)) {
    return <VideoMiniatura url={attachment.url} onAbrir={onAbrir} />;
  }

  if (!isStoredFile(attachment)) return null;

  if (attachment.kind === "image") {
    const href = attachment.url?.startsWith("blob:")
      ? attachment.url
      : publicUploadUrl(attachment);
    const src = attachment.url?.startsWith("blob:")
      ? attachment.url
      : publicUploadUrl(attachment, { width: 1200 });
    return (
      <a
        href={href || "#"}
        target="_blank"
        rel="noreferrer"
        className="pregunta-adjuntos-link"
        title={`Abrir ${attachment.originalName}`}
        onClick={() => onAbrir?.()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={attachment.originalName}
          className="pregunta-adjuntos-media"
        />
      </a>
    );
  }

  const etiqueta = etiquetaArchivo(attachment.originalName, attachment.mimeType);
  return (
    <a
      className="pregunta-adjuntos-doc"
      href={publicUploadUrl(attachment)}
      target="_blank"
      rel="noreferrer"
      title={`Abrir ${attachment.originalName}`}
      aria-label={`Abrir ${attachment.originalName}`}
      onClick={() => onAbrir?.()}
    >
      <span className="pregunta-adjuntos-doc-sheet" aria-hidden="true">
        <span className="pregunta-adjuntos-doc-fold" />
        <span className="pregunta-adjuntos-doc-badge">{etiqueta}</span>
        <span className="pregunta-adjuntos-doc-lines">
          <span />
          <span />
          <span />
        </span>
      </span>
      <span className="pregunta-adjuntos-doc-name">{attachment.originalName}</span>
    </a>
  );
}
