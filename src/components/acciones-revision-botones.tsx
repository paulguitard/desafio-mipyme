"use client";

import { SelectorVeredicto } from "@/components/selector-veredicto";
import { useAccionesRevision } from "@/components/acciones-revision-context";
import { textoIntencionEvaluador } from "@/lib/intencion-evaluador";

export function BotonesEvaluadorRevision({ disabled }: { disabled: boolean }) {
  const ctx = useAccionesRevision();
  if (!ctx) return null;
  return (
    <div className="hilo-editor-acciones">
      <button
        className="btn btn-sm btn-gold"
        data-tour="enviar-supervisor"
        type="button"
        disabled={disabled}
        onClick={() => ctx.abrirConfirmacion("enviar-observaciones-supervisor")}
      >
        Pedir cambios al participante
      </button>
      <button
        className="btn btn-sm btn-primary"
        data-tour="finalizar-evaluacion"
        type="button"
        disabled={disabled}
        onClick={() => ctx.abrirConfirmacion("finalizar-evaluacion")}
      >
        Finalizar evaluación
      </button>
    </div>
  );
}

export function BotonEnviarAlEvaluador({ disabled }: { disabled: boolean }) {
  const ctx = useAccionesRevision();
  if (!ctx) return null;
  return (
    <div className="hilo-editor-acciones">
      <button
        className="btn btn-sm btn-gold"
        data-tour="enviar-evaluador"
        type="button"
        disabled={disabled}
        onClick={() => ctx.abrirConfirmacion("enviar-observaciones-evaluador")}
      >
        Enviar al evaluador
      </button>
    </div>
  );
}

export function AccionesPanelRevision() {
  const ctx = useAccionesRevision();
  if (!ctx || ctx.esGeneral) return null;

  if (!ctx.esSupervisor) {
    return (
      <div className="hilo-panel-acciones">
        <BotonesEvaluadorRevision disabled={ctx.disabled} />
      </div>
    );
  }

  return (
    <div className="hilo-panel-acciones">
      <p className="hilo-editor-intencion">{textoIntencionEvaluador(ctx.intencionPendiente)}</p>
      <SelectorVeredicto
        veredicto={ctx.veredictoPanel}
        onChange={(valor) => {
          ctx.setVeredictoPanel(valor);
          if (valor === "OK") ctx.abrirConfirmacion("proceder");
        }}
      />
      {ctx.veredictoPanel === "OBSERVACION" ? (
        <BotonEnviarAlEvaluador disabled={ctx.disabled} />
      ) : null}
    </div>
  );
}
