"use client";

import { useMemo, useState, type ReactNode } from "react";
import { BadgeAsignacion } from "@/components/badges";
import { Modal } from "@/components/modal";
import {
  agruparFiltrosPorBanda,
  BANDA_MOVIL_LABEL_EVALUADOR,
  conteosCasos,
  esIdBandaFiltro,
  gruposVisibles,
  itemsDeGrupo,
  type BandaPelota,
  type CasoPanelVista,
  type FiltroCaso,
} from "@/lib/casos-panel";

function aplicarFiltroEnUrl(id: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("filtro", id);
  window.history.replaceState(window.history.state, "", url);
}

export function CasosPanel({
  titulo,
  filtros,
  filtroInicial,
  casos,
  tourFiltros,
  tourLista,
  emptyLabel,
  labelsBandaMovil = BANDA_MOVIL_LABEL_EVALUADOR,
}: {
  titulo: string;
  filtros: FiltroCaso[];
  filtroInicial: string;
  casos: CasoPanelVista[];
  tourFiltros: string;
  tourLista: string;
  emptyLabel: string;
  labelsBandaMovil?: Record<BandaPelota, string>;
}) {
  const inicial =
    filtros.some((f) => f.id === filtroInicial) || esIdBandaFiltro(filtroInicial, filtros)
      ? filtroInicial
      : "tu-turno";
  const [activoId, setActivoId] = useState(inicial);
  const counts = useMemo(() => conteosCasos(casos, filtros), [casos, filtros]);
  const grupos = useMemo(
    () => gruposVisibles(filtros, activoId, (filtroId) => itemsDeGrupo(casos, filtroId)),
    [activoId, casos, filtros],
  );
  const hayTarjetas = grupos.some((g) => g.items.length > 0);
  const bandasFiltro = agruparFiltrosPorBanda(filtros);
  const bandasLista = agruparFiltrosPorBanda(grupos);
  const [modalFiltro, setModalFiltro] = useState(false);
  const [bandaAbierta, setBandaAbierta] = useState<BandaPelota | null>(null);

  function bandaDesplegable(id: BandaPelota) {
    return id !== "todas" && id !== "cerrados";
  }

  function conteoBanda(banda: (typeof bandasFiltro)[number]) {
    return banda.filtros.reduce((suma, item) => suma + (counts[item.id] ?? 0), 0);
  }

  function etiquetaFiltroActivo() {
    if (activoId === "todas") return labelsBandaMovil.todas;
    if (activoId === "cerrados") return labelsBandaMovil.cerrados;
    if (esIdBandaFiltro(activoId, filtros)) {
      return labelsBandaMovil[activoId as BandaPelota];
    }
    const actual = filtros.find((item) => item.id === activoId);
    if (!actual) return labelsBandaMovil["tu-turno"];
    if (actual.banda === "todas") return labelsBandaMovil.todas;
    if (actual.banda === "cerrados") return labelsBandaMovil.cerrados;
    return actual.label;
  }

  function elegirFiltro(id: string) {
    setActivoId(id);
    aplicarFiltroEnUrl(id);
  }

  function elegirFiltroDesdeModal(id: string) {
    elegirFiltro(id);
    setModalFiltro(false);
    setBandaAbierta(null);
  }

  return (
    <div className="casos-panel page-workspace grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
      <div className="casos-panel-head shrink-0 space-y-4 bg-background">
        <h1 className="text-3xl font-extrabold text-navy">{titulo}</h1>
        <div data-tour={tourFiltros}>
          <div className="casos-filtros-barra">
            <p className="casos-filtros-se-muestran">Se muestran:</p>
            <div className="casos-filtro-activo-row">
              <p className="casos-filtro is-activo" aria-current="true">
                <span>{etiquetaFiltroActivo()}</span>
                <span className="casos-filtro-n">{counts[activoId] ?? 0}</span>
              </p>
              <button
                className="btn btn-sm btn-secondary casos-filtro-abrir"
                type="button"
                onClick={() => {
                  const actual = filtros.find((item) => item.id === activoId);
                  const banda =
                    actual?.banda ??
                    (esIdBandaFiltro(activoId, filtros) ? (activoId as BandaPelota) : null);
                  setBandaAbierta(banda && bandaDesplegable(banda) ? banda : null);
                  setModalFiltro(true);
                }}
              >
                Filtrar
              </button>
            </div>
            <Modal
              open={modalFiltro}
              title="Filtrar"
              compact
              className="modal-filtros-casos"
              onClose={() => {
                setModalFiltro(false);
                setBandaAbierta(null);
              }}
            >
              <div className="casos-filtros-modal" role="tablist" aria-label="Elegir filtro">
                {bandasFiltro.map((banda) => {
                  const desplegable = bandaDesplegable(banda.id);
                  const abierta = bandaAbierta === banda.id;
                  const activaHija = banda.filtros.some((item) => item.id === activoId);
                  const activaBanda = activoId === banda.id;
                  const activa = activaHija || activaBanda;
                  return (
                    <div
                      key={banda.id}
                      className={`casos-filtro-cat${abierta ? " is-open" : ""}${activa ? " is-activa" : ""}`}
                    >
                      <button
                        type="button"
                        className={`casos-filtro casos-filtro-cat-btn${
                          activaBanda || (activa && !desplegable) ? " is-activo" : ""
                        }${activaHija && desplegable && !activaBanda ? " is-cat-activa" : ""}`}
                        aria-expanded={desplegable ? abierta : undefined}
                        onClick={() => {
                          if (desplegable) {
                            elegirFiltroDesdeModal(banda.id);
                            return;
                          }
                          elegirFiltroDesdeModal(banda.filtros[0]?.id ?? "todas");
                        }}
                      >
                        <span>{labelsBandaMovil[banda.id]}</span>
                        {desplegable ? (
                          <span
                            className="casos-filtro-chevron"
                            aria-hidden="true"
                            onClick={(evento) => {
                              evento.stopPropagation();
                              setBandaAbierta(abierta ? null : banda.id);
                            }}
                          >
                            <svg viewBox="0 0 16 16" width="14" height="14">
                              <path
                                fill="currentColor"
                                d="M4.47 5.97a.75.75 0 0 1 1.06 0L8 8.44l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 0-1.06Z"
                              />
                            </svg>
                          </span>
                        ) : null}
                        <span className="casos-filtro-n">{conteoBanda(banda)}</span>
                      </button>
                      {desplegable && abierta ? (
                        <div className="casos-filtro-sub">
                          {banda.filtros.map((item) => {
                            const n = counts[item.id] ?? 0;
                            const activo = item.id === activoId;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                role="tab"
                                aria-selected={activo}
                                onClick={() => elegirFiltroDesdeModal(item.id)}
                                className={`casos-filtro${activo ? " is-activo" : ""}`}
                              >
                                <span>{item.label}</span>
                                <span className="casos-filtro-n">{n}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Modal>
          </div>
        </div>
      </div>
      <div className="page-scroll min-h-0 overflow-y-auto space-y-7 pr-1" data-tour={tourLista}>
        {!hayTarjetas && activoId === "todas" ? (
          <p className="text-muted">{emptyLabel}</p>
        ) : !hayTarjetas && esIdBandaFiltro(activoId, filtros) ? (
          <p className="text-muted">No hay casos en este estado.</p>
        ) : (
          bandasLista.map((banda) => (
            <section key={banda.id} className="casos-banda" aria-label={banda.label || undefined}>
              {banda.label && activoId === "todas" ? (
                <h2 className="casos-banda-titulo">{banda.label}</h2>
              ) : null}
              {banda.filtros.map((grupo) => (
                <section key={grupo.id} className="casos-grupo" aria-labelledby={`grupo-${grupo.id}`}>
                  <header className="casos-grupo-head">
                    <div className="casos-grupo-cabecera">
                      <h3 id={`grupo-${grupo.id}`}>{grupo.label}</h3>
                      <span className="casos-grupo-n">{grupo.items.length}</span>
                    </div>
                    {grupo.descripcion ? (
                      <p className="casos-grupo-ayuda">{grupo.descripcion}</p>
                    ) : null}
                  </header>
                  {grupo.items.length === 0 ? (
                    <p className="text-muted">No hay casos en este estado.</p>
                  ) : (
                    <div className="casos-lista">
                      {grupo.items.map((item) => (
                        <CasoFila
                          key={item.id}
                          href={item.href}
                          nombre={item.nombre}
                          detalle={item.detalle}
                          badge={
                            item.extra ? undefined : (
                              <BadgeAsignacion estado={item.estado} etiqueta={item.etiqueta} />
                            )
                          }
                          extra={
                            item.extra ? (
                              <ul className="caso-fila-evals">
                                {item.extra.length === 0 ? (
                                  <li className="text-sm text-muted">Sin evaluadores asignados</li>
                                ) : (
                                  item.extra.map((asignacion, extraIdx) => (
                                    <li key={`${item.id}-${extraIdx}-${asignacion.nombre}`}>
                                      <span>{asignacion.nombre}</span>
                                      <BadgeAsignacion estado={asignacion.estado} etiqueta={asignacion.etiqueta} />
                                    </li>
                                  ))
                                )}
                              </ul>
                            ) : undefined
                          }
                        />
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}

export function CasoFila({
  href,
  nombre,
  detalle,
  extra,
  badge,
}: {
  href: string;
  nombre: string;
  detalle: string;
  extra?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <a href={href} className={`card card-link caso-fila${badge ? "" : " caso-fila-sin-badge"}`}>
      <div className="caso-fila-textos">
        <h3 className="caso-fila-nombre">{nombre}</h3>
        <p className="caso-fila-mentoria">{detalle}</p>
        {extra}
      </div>
      {badge}
      <svg className="caso-fila-flecha" viewBox="0 0 16 16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M5.47 2.97a.75.75 0 0 1 1.06 0l5 5a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 1 1-1.06-1.06L9.94 8 5.47 3.53a.75.75 0 0 1 0-1.06Z"
        />
      </svg>
    </a>
  );
}
