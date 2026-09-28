"use client";

import { useState } from "react";

export function useEvalPanelesColapsables() {
  const [evalColapsado, setEvalColapsado] = useState(false);
  const [supColapsado, setSupColapsado] = useState(false);

  const bodyClassName = [
    evalColapsado ? "is-eval-collapsed" : "",
    supColapsado ? "is-sup-collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    evalColapsado,
    supColapsado,
    toggleEval: () => setEvalColapsado((value) => !value),
    toggleSup: () => setSupColapsado((value) => !value),
    bodyClassName,
  };
}

function etiquetaPanel(panel: "eval" | "sup", collapsed: boolean) {
  if (panel === "eval") {
    return collapsed ? "Ver evaluación" : "Ocultar evaluación";
  }
  return collapsed ? "Ver supervisión" : "Ocultar supervisión";
}

export function EvalDetalleHead({
  panel,
  title,
  subtitle,
  collapsed,
  onToggle,
}: {
  panel: "caso" | "eval" | "sup";
  title: string;
  subtitle: React.ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const colapsable = panel === "eval" || panel === "sup";
  const etiquetaAccion = colapsable ? etiquetaPanel(panel, Boolean(collapsed)) : "";

  return (
    <div
      className={`eval-detalle-head is-${panel}${collapsed ? " is-collapsed" : ""}`}
      data-tour={
        panel === "caso" ? "ficha-caso" : panel === "eval" ? "observacion-pregunta" : undefined
      }
    >
      <div className="eval-detalle-head-copy">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {colapsable && onToggle ? (
        <button
          type="button"
          className="eval-detalle-collapse"
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          {etiquetaAccion}
        </button>
      ) : null}
    </div>
  );
}
