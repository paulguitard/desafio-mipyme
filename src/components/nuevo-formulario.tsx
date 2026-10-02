"use client";

import { useState } from "react";
import { BotonAtras } from "@/components/boton-atras";
import { FormularioBuilder } from "@/components/formulario-builder";
import { FormularioContenidoBuilder } from "@/components/formulario-contenido-builder";
import { TIPO_FORMULARIO_LABEL, type TipoFormulario } from "@/lib/tipo-formulario";

export function NuevoFormulario({
  permitirEvaluacionPorPregunta,
}: {
  permitirEvaluacionPorPregunta: boolean;
}) {
  const [tipo, setTipo] = useState<TipoFormulario | null>(null);

  if (!tipo) {
    return (
      <div className="page-workspace mx-auto max-w-3xl space-y-6 overflow-y-auto p-4">
        <div className="flex items-center gap-2">
          <BotonAtras href="/admin/formularios" />
          <h1 className="text-3xl font-extrabold text-navy">Nuevo formulario</h1>
        </div>
        <p className="text-muted">Elige el tipo. Después no se puede cambiar.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <button className="card p-6 text-left" type="button" onClick={() => setTipo("FEEDBACK")}>
            <p className="text-xl font-semibold">{TIPO_FORMULARIO_LABEL.FEEDBACK}</p>
            <p className="text-muted">Preguntas que el participante responde y se evalúan.</p>
          </button>
          <button className="card p-6 text-left" type="button" onClick={() => setTipo("CONTENIDO")}>
            <p className="text-xl font-semibold">{TIPO_FORMULARIO_LABEL.CONTENIDO}</p>
            <p className="text-muted">Casillas con fotos, videos o archivos para ver, sin responder.</p>
          </button>
        </div>
      </div>
    );
  }

  if (tipo === "CONTENIDO") {
    return <FormularioContenidoBuilder modo="nuevo" />;
  }

  return (
    <FormularioBuilder modo="nuevo" permitirEvaluacionPorPregunta={permitirEvaluacionPorPregunta} />
  );
}
