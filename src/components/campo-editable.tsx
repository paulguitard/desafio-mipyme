"use client";

function IconoLapiz() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CampoEditable({
  editing,
  onEditar,
  onCancelar,
  onGuardar,
  guardando,
  lectura,
  edicion,
}: {
  editing: boolean;
  onEditar: () => void;
  onCancelar: () => void;
  onGuardar: () => void | Promise<void>;
  guardando?: boolean;
  lectura: React.ReactNode;
  edicion: React.ReactNode;
}) {
  if (editing) {
    return (
      <div className="space-y-3">
        {edicion}
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-sm btn-primary" type="button" disabled={guardando} onClick={() => void onGuardar()}>
            {guardando ? "Guardando…" : "Guardar"}
          </button>
          <button className="btn btn-sm btn-secondary" type="button" disabled={guardando} onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      {lectura}
      <button
        className="ml-1.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md align-middle text-navy opacity-0 transition-opacity hover:bg-navy-soft group-hover:opacity-100 group-focus-within:opacity-100"
        type="button"
        aria-label="Editar"
        onClick={onEditar}
      >
        <IconoLapiz />
      </button>
    </div>
  );
}
