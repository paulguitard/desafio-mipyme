"use client";

import type { RefObject } from "react";
import type { DetalleFichaAdmin } from "@/lib/convocatoria-admin-data";
import { CASO_PDF_DOC_WIDTH } from "@/lib/caso-pdf";
import { etiquetaNombreCaso } from "@/lib/nombre-caso";
import { PreguntaCampo } from "@/components/pregunta-campo";

export function CasoPdfDocumento({
  data,
  rootRef,
}: {
  data: DetalleFichaAdmin;
  rootRef: RefObject<HTMLDivElement | null>;
}) {
  const nombreCaso = etiquetaNombreCaso(data.nombreCaso);
  return (
    <div
      ref={rootRef}
      className="caso-pdf-documento"
      style={{ width: CASO_PDF_DOC_WIDTH }}
      aria-hidden
    >
      <header className="caso-pdf-header">
        <div className="caso-pdf-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/aiep-header.png" alt="AIEP, Universidad Andrés Bello" className="caso-pdf-logo" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/entel.png" alt="Fondo 55+ Entel" className="caso-pdf-logo is-entel" />
        </div>
        <div className="caso-pdf-meta">
          <p className="caso-pdf-asesoria">{data.convocatoriaTitulo}</p>
          <p className="caso-pdf-caso">{nombreCaso}</p>
          <p className="caso-pdf-participante">{data.emprendedorNombre}</p>
        </div>
      </header>
      <div className="caso-pdf-cuerpo">
        {data.preguntas.map((pregunta) => {
          const respuesta = data.respuestas.find((item) => item.preguntaId === pregunta.id);
          return (
            <div key={pregunta.id} className="caso-pdf-tarjeta" data-caso-pdf-tarjeta="">
              <PreguntaCampo
                pregunta={pregunta}
                respuesta={respuesta ?? null}
                disabled
                ocultarAdjuntos
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
