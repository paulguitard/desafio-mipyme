"use client";

import { useState } from "react";
import { marcarVistaPieza } from "@/actions/postulaciones";
import { BotonAtras } from "@/components/boton-atras";
import { PiezaContenidoVista } from "@/components/pieza-contenido-vista";
import type { PiezaContenidoVista as Pieza } from "@/lib/contenido";

export function VisorContenidoParticipante({
  postulacionId,
  titulo,
  piezas,
}: {
  postulacionId: string;
  titulo: string;
  piezas: Pieza[];
}) {
  const [marcadas, setMarcadas] = useState(() => new Set(piezas.filter((p) => p.marcada).map((p) => p.id)));

  async function onAbrirMedio(piezaId: string) {
    setMarcadas((prev) => {
      const next = new Set(prev);
      next.add(piezaId);
      return next;
    });
    await marcarVistaPieza(postulacionId, piezaId);
  }

  return (
    <div className="page-workspace mx-auto grid h-full min-h-0 w-full max-w-4xl grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden">
      <div className="shrink-0 bg-background">
        <div className="flex items-start gap-2">
          <BotonAtras href="/participante" />
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-3xl font-extrabold text-navy">{titulo}</h1>
            <p className="text-muted">Clickea sobre los elementos para ver el contenido</p>
          </div>
        </div>
      </div>
      <div className="page-scroll min-h-0 space-y-6 overflow-y-auto overscroll-contain pr-1 pb-8">
        {piezas.length === 0 ? (
          <p className="text-muted">Esta mentoría aún no tiene contenido.</p>
        ) : (
          piezas.map((pieza) => (
            <PiezaContenidoVista
              key={pieza.id}
              pieza={{ ...pieza, marcada: marcadas.has(pieza.id) }}
              onAbrirMedio={onAbrirMedio}
            />
          ))
        )}
      </div>
    </div>
  );
}
