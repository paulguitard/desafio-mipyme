"use client";

import { useState, type ReactNode } from "react";

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

export function EvalDetalleCelda({
  panel,
  children,
}: {
  panel: "caso" | "eval" | "sup";
  children: ReactNode;
}) {
  return <div className={`eval-detalle-cell is-${panel}`}>{children}</div>;
}

export function EvalDetalleColumnas({
  casoTitle,
  casoSubtitle,
  caso,
  evalTitle,
  evalSubtitle,
  evaluacion,
  supTitle,
  supSubtitle,
  supervision,
  sinSupervision = false,
  bloqueado = false,
  className,
}: {
  casoTitle: string;
  casoSubtitle?: ReactNode;
  caso: ReactNode;
  evalTitle: string;
  evalSubtitle?: ReactNode;
  evaluacion: ReactNode;
  supTitle?: string;
  supSubtitle?: ReactNode;
  supervision?: ReactNode;
  sinSupervision?: boolean;
  bloqueado?: boolean;
  className?: string;
}) {
  const paneles = useEvalPanelesColapsables();

  return (
    <div
      className={[
        "eval-detalle-body is-columnas",
        sinSupervision ? "is-sin-sup" : "",
        paneles.bodyClassName,
        bloqueado ? "is-bloqueado" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="eval-detalle-col is-caso">
        <EvalDetalleHead panel="caso" title={casoTitle} subtitle={casoSubtitle} />
        <div className="eval-detalle-col-scroll">{caso}</div>
      </div>
      <div className={`eval-detalle-col is-eval${paneles.evalColapsado ? " is-collapsed" : ""}`}>
        <EvalDetalleHead
          panel="eval"
          title={evalTitle}
          subtitle={evalSubtitle}
          collapsed={paneles.evalColapsado}
          onToggle={paneles.toggleEval}
        />
        <div className="eval-detalle-col-scroll">{evaluacion}</div>
      </div>
      {sinSupervision ? null : (
        <div className={`eval-detalle-col is-sup${paneles.supColapsado ? " is-collapsed" : ""}`}>
          <EvalDetalleHead
            panel="sup"
            title={supTitle ?? "Supervisión"}
            subtitle={supSubtitle}
            collapsed={paneles.supColapsado}
            onToggle={paneles.toggleSup}
          />
          <div className="eval-detalle-col-scroll">{supervision}</div>
        </div>
      )}
    </div>
  );
}
