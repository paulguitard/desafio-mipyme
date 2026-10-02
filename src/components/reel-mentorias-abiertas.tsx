"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { iniciarPostulacionForm } from "@/actions/postulaciones";
import { ImagenMentoriaCover } from "@/components/imagen-mentoria";
import { Modal } from "@/components/modal";
import type { PosicionImagen } from "@/lib/convocatoria";
import { TIPO_FORMULARIO_LABEL, type TipoFormulario } from "@/lib/tipo-formulario";

export type MentoriaAbiertaVista = {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: TipoFormulario;
  imagenUrl: string | null;
  imagenPos: PosicionImagen;
  cierre: string;
  restantes: string;
  yaTieneCaso: boolean;
};

function offsetRelativo(index: number, activo: number, total: number) {
  let d = index - activo;
  const mitad = total / 2;
  if (d > mitad) d -= total;
  if (d < -mitad) d += total;
  return d;
}

function claseSlide(offset: number, wrapping: boolean) {
  const salto = wrapping ? " is-wrap" : "";
  if (offset === 0) return `reel-mentoria-slide is-center${salto}`;
  if (offset === -1) return `reel-mentoria-slide is-left${salto}`;
  if (offset === 1) return `reel-mentoria-slide is-right${salto}`;
  if (offset < 0) return `reel-mentoria-slide is-far-left${salto}`;
  return `reel-mentoria-slide is-far-right${salto}`;
}

function Chevron({ dir }: { dir: "izq" | "der" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden="true">
      <path
        d={dir === "izq" ? "M15 6 9 12l6 6" : "M9 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconoVerDetalles() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.25" stroke="currentColor" strokeWidth="2.1" />
      <path d="M15.2 15.2 20 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function IconoCalendario() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 2h2v2h6V2h2v2h3v18H4V4h3zm12 8H5v10h14zm-9 3h2v2H10zm4 0h2v2h-2zm-8 0h2v2H6zm0 4h2v2H6zm4 0h2v2h-2zm4 0h2v2h-2z"
      />
    </svg>
  );
}

function IconoReloj() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20m0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16m.75 3v5.19l3.53 2.04-.75 1.3L11.25 13V7z"
      />
    </svg>
  );
}

function AccionPostular({
  item,
  enfocada,
}: {
  item: MentoriaAbiertaVista;
  enfocada: boolean;
}) {
  let control: ReactNode;
  if (item.yaTieneCaso) {
    control = (
      <button className="btn btn-postular-bloqueado" type="button" disabled>
        <span className="reel-postular-texto-largo">Ya tienes un caso en esta asesoría</span>
        <span className="reel-postular-texto-corto">Ya tienes un caso</span>
      </button>
    );
  } else if (!enfocada) {
    control = (
      <span className="btn btn-primary reel-postular-fuera" aria-hidden="true">
        Participar
      </span>
    );
  } else {
    control = (
      <form action={iniciarPostulacionForm} onClick={(event) => event.stopPropagation()}>
        <input type="hidden" name="convocatoriaId" value={item.id} />
        <button className="btn btn-primary" type="submit">
          Participar
        </button>
      </form>
    );
  }

  return <div className="reel-mentoria-accion">{control}</div>;
}

function FotoMentoria({
  item,
  priority,
}: {
  item: MentoriaAbiertaVista;
  priority?: boolean;
}) {
  if (item.imagenUrl) {
    return (
      <ImagenMentoriaCover
        src={item.imagenUrl}
        pos={item.imagenPos}
        alt=""
        className="reel-mentoria-foto"
        priority={priority}
      />
    );
  }
  return <div className="reel-mentoria-foto reel-mentoria-foto-vacia">Sin imagen</div>;
}

function TarjetaMentoria({
  item,
  enfocada,
  seleccionable,
  onElegir,
  onVerDetalles,
  priority,
}: {
  item: MentoriaAbiertaVista;
  enfocada: boolean;
  seleccionable: boolean;
  onElegir: () => void;
  onVerDetalles: () => void;
  priority?: boolean;
}) {
  return (
    <article
      className="card space-y-2.5 p-5"
      aria-hidden={!enfocada}
      onClick={seleccionable ? onElegir : undefined}
    >
      <div className="reel-mentoria-foto-wrap">
        <FotoMentoria item={item} priority={priority} />
        <span className="reel-mentoria-tipo">{TIPO_FORMULARIO_LABEL[item.tipo]}</span>
        <button
          className="reel-mentoria-ver-mas"
          type="button"
          aria-label={`Ver detalles de ${item.titulo}`}
          title="Ver detalles"
          onClick={(event) => {
            event.stopPropagation();
            onVerDetalles();
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <span>Ver detalles</span>
          <IconoVerDetalles />
        </button>
      </div>
      <h2 className="text-xl font-bold text-navy">{item.titulo}</h2>
      <div className="reel-mentoria-pie">
        <AccionPostular item={item} enfocada={enfocada} />
        <div className="reel-mentoria-meta">
          {item.cierre ? (
            <p className="reel-mentoria-cierre flex items-center justify-end gap-2 text-sm text-muted">
              <span className="inline-flex text-navy">
                <IconoCalendario />
              </span>
              {item.cierre}
            </p>
          ) : null}
          {item.restantes ? (
            <p className="reel-mentoria-restantes inline-flex items-center gap-2 rounded-full bg-navy-soft px-3 py-1 text-sm font-bold text-navy">
              <span className="inline-flex">
                <IconoReloj />
              </span>
              {item.restantes}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ModalDetalleMentoria({
  item,
  onClose,
}: {
  item: MentoriaAbiertaVista | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={Boolean(item)}
      title={item?.titulo ?? "Asesoría"}
      onClose={onClose}
      className="modal-mentoria-detalle"
    >
      {item ? (
        <div className="mentoria-detalle">
          <div className="mentoria-detalle-hero">
            {item.imagenUrl ? (
              <ImagenMentoriaCover
                src={item.imagenUrl}
                pos={item.imagenPos}
                alt=""
                className="mentoria-detalle-foto"
              />
            ) : (
              <div className="mentoria-detalle-foto mentoria-detalle-foto-vacia">Sin imagen</div>
            )}
          </div>
          <div className="mentoria-detalle-chips">
            {item.cierre ? (
              <p className="mentoria-detalle-chip">
                <span className="text-navy">
                  <IconoCalendario />
                </span>
                {item.cierre}
              </p>
            ) : null}
            {item.restantes ? (
              <p className="mentoria-detalle-chip is-emphasis">
                <span>
                  <IconoReloj />
                </span>
                {item.restantes}
              </p>
            ) : null}
            {item.yaTieneCaso ? (
              <p className="mentoria-detalle-chip is-estado">Ya tienes un caso en esta asesoría</p>
            ) : null}
          </div>
          <div className="mentoria-detalle-cuerpo">
            <h3 className="mentoria-detalle-subtitulo">Descripción</h3>
            <div className="mentoria-detalle-desc-scroll">
              {item.descripcion ? (
                <p className="mentoria-detalle-desc">{item.descripcion}</p>
              ) : (
                <p className="text-muted">Esta asesoría no tiene descripción.</p>
              )}
            </div>
          </div>
          <div className="mentoria-detalle-acciones">
            <AccionPostular item={item} enfocada />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

export function ReelMentoriasAbiertas({ items }: { items: MentoriaAbiertaVista[] }) {
  const [activo, setActivo] = useState(0);
  const [detalle, setDetalle] = useState<MentoriaAbiertaVista | null>(null);
  const gesto = useRef<number | null>(null);
  const offsetsPrevios = useRef(new Map<string, number>());
  const total = items.length;

  const irA = useCallback(
    (index: number) => {
      if (total === 0) return;
      setActivo(((index % total) + total) % total);
    },
    [total],
  );

  const anterior = useCallback(() => irA(activo - 1), [activo, irA]);
  const siguiente = useCallback(() => irA(activo + 1), [activo, irA]);

  useEffect(() => {
    if (total < 2 || detalle) return;
    function onKey(event: KeyboardEvent) {
      const destino = event.target as HTMLElement | null;
      if (destino && (destino.tagName === "INPUT" || destino.tagName === "TEXTAREA" || destino.isContentEditable)) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        anterior();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        siguiente();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total, anterior, siguiente, detalle]);

  if (total === 0) {
    return <p className="text-muted">No hay asesorías abiertas en este momento.</p>;
  }

  return (
    <div className="reel-mentorias" aria-roledescription="carrusel" aria-label="Asesorías abiertas">
      {total > 1 ? (
        <button
          className="reel-mentorias-nav is-prev"
          type="button"
          onClick={anterior}
          aria-label="Asesoría anterior"
        >
          <Chevron dir="izq" />
        </button>
      ) : null}

      <div
        className="reel-mentorias-stage"
        onPointerDown={(event) => {
          if (total < 2) return;
          gesto.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (gesto.current == null) return;
          const delta = event.clientX - gesto.current;
          gesto.current = null;
          if (delta > 48) anterior();
          else if (delta < -48) siguiente();
        }}
        onPointerCancel={() => {
          gesto.current = null;
        }}
      >
        {items.map((item, index) => {
          const offset = offsetRelativo(index, activo, total);
          const previo = offsetsPrevios.current.get(item.id);
          const wrapping = previo != null && Math.abs(offset - previo) > 1;
          offsetsPrevios.current.set(item.id, offset);
          const visible = offset === -1 || offset === 0 || offset === 1;
          return (
            <div key={item.id} className={claseSlide(offset, wrapping)}>
              <TarjetaMentoria
                item={item}
                enfocada={offset === 0}
                seleccionable={visible && offset !== 0}
                onElegir={() => irA(index)}
                onVerDetalles={() => setDetalle(item)}
                priority={visible}
              />
            </div>
          );
        })}
        <div className="reel-mentorias-sizer" aria-hidden="true">
          <TarjetaMentoria
            item={items[activo]}
            enfocada
            seleccionable={false}
            onElegir={() => undefined}
            onVerDetalles={() => undefined}
            priority={false}
          />
        </div>
      </div>

      {total > 1 ? (
        <button
          className="reel-mentorias-nav is-next"
          type="button"
          onClick={siguiente}
          aria-label="Asesoría siguiente"
        >
          <Chevron dir="der" />
        </button>
      ) : null}

      {total > 1 ? (
        <div className="reel-mentorias-dots">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`reel-mentorias-dot${index === activo ? " is-active" : ""}`}
              aria-label={`Ver ${item.titulo}`}
              aria-current={index === activo ? "true" : undefined}
              onClick={() => irA(index)}
            />
          ))}
        </div>
      ) : null}

      <ModalDetalleMentoria item={detalle} onClose={() => setDetalle(null)} />
    </div>
  );
}
