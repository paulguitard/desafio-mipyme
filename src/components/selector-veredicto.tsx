"use client";

export function SelectorVeredicto({
  campo,
  veredicto,
  onChange,
  etiquetaObservacion = "Pedir cambios al evaluador",
  etiquetaOk = "Aprobar",
}: {
  campo?: string;
  veredicto: string;
  onChange: (valor: "OK" | "OBSERVACION") => void;
  etiquetaObservacion?: string;
  etiquetaOk?: string;
}) {
  return (
    <div>
      <div
        className="veredicto-opciones flex flex-wrap gap-2"
        data-veredicto-opciones={campo || undefined}
        role="group"
        aria-label="Decisión de supervisión"
      >
        <button
          className={`btn btn-sm ${veredicto === "OBSERVACION" ? "btn-primary" : "btn-secondary"}`}
          type="button"
          data-tour="enviar-observaciones"
          onClick={(event) => {
            event.currentTarget
              .closest("[data-veredicto-opciones]")
              ?.classList.remove("is-seleccion-pendiente");
            onChange("OBSERVACION");
          }}
        >
          {etiquetaObservacion}
        </button>
        <button
          className={`btn btn-sm ${veredicto === "OK" ? "btn-primary" : "btn-secondary"}`}
          type="button"
          data-tour="proceder"
          onClick={(event) => {
            event.currentTarget
              .closest("[data-veredicto-opciones]")
              ?.classList.remove("is-seleccion-pendiente");
            onChange("OK");
          }}
        >
          {etiquetaOk}
        </button>
      </div>
      <p className="veredicto-opciones-aviso text-danger" role="alert">
        Tienes que seleccionar alguna de las opciones.
      </p>
    </div>
  );
}
