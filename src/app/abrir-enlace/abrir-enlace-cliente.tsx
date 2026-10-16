"use client";

export function AbrirEnlaceCliente({ dest }: { dest: string }) {
  return (
    <div className="eval-acciones-caso mt-3">
      <p className="text-muted">Abriendo el adjunto…</p>
      <p className="text-muted">
        Si no se abrió solo, usá el botón. Después volvé a esta pestaña para seguir leyendo el caso.
      </p>
      <a className="btn btn-sm btn-secondary" href={dest} target="_blank" rel="noreferrer">
        Abrir en una pestaña nueva
      </a>
      <button className="btn btn-sm btn-secondary" type="button" onClick={() => window.history.back()}>
        Volver al caso
      </button>
    </div>
  );
}
