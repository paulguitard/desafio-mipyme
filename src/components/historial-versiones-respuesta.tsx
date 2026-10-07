"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { AdjuntosRespuesta, formatValorRespuesta } from "@/components/pregunta-campo";
import { TextoLargoVista } from "@/components/texto-largo-vista";
import { parseArchivos, parseValor } from "@/lib/preguntas";
import { versionesDistintas } from "@/lib/versiones-respuesta";

function IconoHistorial() {
  return (
    <svg viewBox="0 0 24 24" className="historial-versiones-icon" fill="none" aria-hidden="true">
      <path
        d="M12 8v4l3 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.05 11a9 9 0 1 0 .5-3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 4v4h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function htmlVersion(valorRaw: string): string {
  const valor = parseValor(valorRaw);
  return typeof valor === "string" ? valor : "";
}

export type VersionHistorial = {
  id: string;
  valor: string;
  archivos: string;
  createdAt: string;
  numero: number;
};

export function HistorialVersionesRespuesta({
  versiones,
  tipo,
  opciones,
  modificada = false,
}: {
  versiones: VersionHistorial[];
  tipo: string;
  opciones: string;
  modificada?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const visibles = versionesDistintas(versiones, tipo).map((version, index, lista) => ({
    ...version,
    numero: lista.length - index,
  }));
  const cantidad = visibles.length;
  if (cantidad < 2) return null;

  const etiqueta = modificada
    ? `Esta respuesta cambió en el último envío. Modificada (${cantidad})`
    : `Modificada (${cantidad})`;

  return (
    <>
      <div className="historial-versiones is-changed" data-tour="historial-versiones">
        <span className="historial-versiones-label">Modificada</span>
        <button
          type="button"
          className="historial-versiones-btn"
          aria-label={etiqueta}
          title={etiqueta}
          onClick={() => setOpen(true)}
        >
          <IconoHistorial />
          <span className="historial-versiones-count" aria-hidden="true">
            {cantidad}
          </span>
        </button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Modificada"
        tall
        className="modal-historial-versiones"
      >
        <ol className="historial-feed">
          {visibles.map((version, index) => (
            <li key={version.id} className="historial-feed-item">
              <div className="historial-feed-rail" aria-hidden="true">
                <span className="historial-feed-dot" />
                {index < visibles.length - 1 ? <span className="historial-feed-line" /> : null}
              </div>
              <div className="historial-feed-card">
                <div className="historial-feed-meta">
                  <strong>Versión {version.numero}</strong>
                  {index === 0 ? <span className="historial-feed-badge">Más reciente</span> : null}
                </div>
                <time className="historial-feed-date" dateTime={version.createdAt}>
                  {new Date(version.createdAt).toLocaleString("es-CL")}
                </time>
                {tipo === "texto_largo" ? (
                  <div className="historial-feed-valor">
                    <TextoLargoVista html={htmlVersion(version.valor)} />
                  </div>
                ) : (
                  <p className="historial-feed-valor">
                    {formatValorRespuesta(version.valor, version.archivos, tipo, opciones)}
                  </p>
                )}
                <AdjuntosRespuesta archivos={parseArchivos(version.archivos)} />
              </div>
            </li>
          ))}
        </ol>
      </Modal>
    </>
  );
}
