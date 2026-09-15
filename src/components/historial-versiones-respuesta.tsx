"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { AdjuntosRespuesta, formatValorRespuesta } from "@/components/pregunta-campo";
import { parseArchivos } from "@/lib/preguntas";

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
}: {
  versiones: VersionHistorial[];
  tipo: string;
  opciones: string;
}) {
  const [open, setOpen] = useState(false);

  const cantidad = versiones.length;
  if (cantidad === 0) return null;

  const conCambios = cantidad > 1;
  const etiqueta = conCambios
    ? `Historial de versiones (${cantidad})`
    : "Historial de versiones";

  return (
    <>
      <button
        type="button"
        className={`historial-versiones-btn ${conCambios ? "is-changed" : "is-single"}`}
        aria-label={etiqueta}
        title={etiqueta}
        onClick={() => setOpen(true)}
      >
        <IconoHistorial />
        {conCambios ? (
          <span className="historial-versiones-count" aria-hidden="true">
            {cantidad}
          </span>
        ) : null}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Historial de versiones" tall>
        <ol className="historial-feed">
          {versiones.map((version, index) => (
            <li key={version.id} className="historial-feed-item">
              <div className="historial-feed-rail" aria-hidden="true">
                <span className="historial-feed-dot" />
                {index < versiones.length - 1 ? <span className="historial-feed-line" /> : null}
              </div>
              <div className="historial-feed-card">
                <div className="historial-feed-meta">
                  <strong>Versión {version.numero}</strong>
                  {index === 0 ? <span className="historial-feed-badge">Más reciente</span> : null}
                </div>
                <time className="historial-feed-date" dateTime={version.createdAt}>
                  {new Date(version.createdAt).toLocaleString("es-CL")}
                </time>
                <p className="historial-feed-valor">
                  {formatValorRespuesta(version.valor, version.archivos, tipo, opciones)}
                </p>
                <AdjuntosRespuesta archivos={parseArchivos(version.archivos)} />
              </div>
            </li>
          ))}
        </ol>
      </Modal>
    </>
  );
}
