"use client";

export function SelectorVeredicto({
  campo,
  veredicto,
  onChange,
}: {
  campo: string;
  veredicto: string;
  onChange: (valor: "OK" | "OBSERVACION") => void;
}) {
  return (
    <div>
      <div
        className="veredicto-opciones flex flex-wrap gap-2"
        data-veredicto-opciones={campo}
        role="group"
        aria-label="Observaciones"
      >
        <button
          className={`btn btn-sm ${veredicto === "OBSERVACION" ? "btn-primary" : "btn-secondary"}`}
          type="button"
          onClick={(event) => {
            event.currentTarget
              .closest("[data-veredicto-opciones]")
              ?.classList.remove("is-seleccion-pendiente");
            onChange("OBSERVACION");
          }}
        >
          Comentar observaciones
        </button>
        <button
          className={`btn btn-sm ${veredicto === "OK" ? "btn-primary" : "btn-secondary"}`}
          type="button"
          onClick={(event) => {
            event.currentTarget
              .closest("[data-veredicto-opciones]")
              ?.classList.remove("is-seleccion-pendiente");
            onChange("OK");
          }}
        >
          Sin observaciones
        </button>
      </div>
      <p className="veredicto-opciones-aviso text-danger" role="alert">
        Tienes que seleccionar alguna de las opciones.
      </p>
    </div>
  );
}
