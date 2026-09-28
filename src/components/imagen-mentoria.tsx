"use client";

import { useRef, type MouseEvent, type PointerEvent } from "react";
import type { PosicionImagen } from "@/lib/convocatoria";
import { objectPositionCss } from "@/lib/convocatoria";

export function ImagenMentoriaCover({
  src,
  pos,
  className,
  alt = "",
  priority = false,
}: {
  src: string;
  pos: PosicionImagen;
  className?: string;
  alt?: string;
  priority?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ objectPosition: objectPositionCss(pos) }}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}

function clampPct(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function ImagenMentoriaEncuadre({
  src,
  pos,
  onChange,
}: {
  src: string;
  pos: PosicionImagen;
  onChange: (pos: PosicionImagen) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  function startDrag(clientX: number, clientY: number) {
    const current = posRef.current;
    drag.current = { x: clientX, y: clientY, posX: current.x, posY: current.y };
  }

  function moveDrag(clientX: number, clientY: number) {
    if (!drag.current || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dx = clientX - drag.current.x;
    const dy = clientY - drag.current.y;
    onChange({
      x: clampPct(drag.current.posX - (dx / rect.width) * 100),
      y: clampPct(drag.current.posY - (dy / rect.height) * 100),
    });
  }

  function endDrag() {
    drag.current = null;
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    startDrag(event.clientX, event.clientY);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    moveDrag(event.clientX, event.clientY);
  }

  function onMouseDown(event: MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    startDrag(event.clientX, event.clientY);
    const onMove = (moveEvent: globalThis.MouseEvent) => {
      moveDrag(moveEvent.clientX, moveEvent.clientY);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      endDrag();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div className="space-y-2">
      <div
        ref={frameRef}
        className="relative h-40 w-full cursor-grab overflow-hidden rounded-xl select-none active:cursor-grabbing"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onMouseDown={onMouseDown}
        role="slider"
        aria-label="Encuadre de la imagen"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos.y)}
      >
        <ImagenMentoriaCover
          src={src}
          pos={pos}
          alt="Encuadre"
          className="pointer-events-none h-full w-full object-cover"
        />
      </div>
      <p className="text-muted">Arrastra la imagen para elegir qué parte se verá en la tarjeta.</p>
    </div>
  );
}
