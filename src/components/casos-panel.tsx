"use client";

import { useMemo, useState, type ReactNode } from "react";
import { BadgeAsignacion } from "@/components/badges";
import { Modal } from "@/components/modal";
import {
  agruparFiltrosPorBanda,
  BANDA_MOVIL_LABEL_EVALUADOR,
  conteosCasos,
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
  const inicial = filtros.some((f) => f.id === filtroInicial) ? filtroInicial : "todas";
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
    const actual = filtros.find((item) => item.id === activoId);
    if (!actual || actual.banda === "todas") return labelsBandaMovil.todas;
    if (actual.banda === "cerrados") return labelsBandaMovil.cerrados;
    return actual.label;
  }

  function elegirFiltro(id: string) {
    setActivoId(id);
    aplicarFiltroEnUrl(id);
  }

  function elegirFiltroMovil(id: string) {
    elegirFiltro(id);
    setModalFiltro(false);
    setBandaAbierta(null);
  }

  return (
    <div className="casos-panel page-workspace grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden">
      <div className="casos-panel-head shrink-0 space-y-4 bg-background">
        <h1 className="text-3xl font-extrabold text-navy">{titulo}</h1>
        <div data-tour={tourFiltros}>
          <div className="casos-filtros casos-filtros-desktop" role="tablist" aria-label="Filtros de casos">
          {bandasFiltro.map((banda, indice) => (
            <div key={banda.id} className="casos-filtros-slot">
              {indice > 0 ? <span className="casos-filtros-sep" aria-hidden="true" /> : null}
              <div className={`casos-filtros-banda${banda.id === "todas" ? " is-todas" : ""}`}>
                <p className="casos-filtros-banda-label" aria-hidden={banda.label ? undefined : true}>
                  {banda.label || "\u00a0"}
                </p>
                <div
                  className={`casos-filtros-banda-chips${banda.filtros.length > 1 ? " is-apilada" : ""}`}
                >
                  {banda.filtros.map((item) => {
                    const n = counts[item.id] ?? 0;
                    const activo = item.id === activoId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={activo}
                        onClick={() => elegirFiltro(item.id)}
                        className={`casos-filtro${activo ? " is-activo" : ""}`}
                      >
                        <span>{item.label}</span>
                        <span className="casos-filtro-n">{n}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
          </div>
          <div className="casos-filtros-movil">
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
                  setBandaAbierta(
                    actual && bandaDesplegable(actual.banda) ? actual.banda : null,
                  );
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
                  const activa = banda.filtros.some((item) => item.id === activoId);
                  return (
                    <div
                      key={banda.id}
                      className={`casos-filtro-cat${abierta ? " is-open" : ""}${activa ? " is-activa" : ""}`}
                    >
                      <button
                        type="button"
                        className={`casos-filtro casos-filtro-cat-btn${activa && !desplegable ? " is-activo" : ""}${
                          activa && desplegable ? " is-cat-activa" : ""
                        }`}
                        aria-expanded={desplegable ? abierta : undefined}
                        onClick={() => {
                          if (desplegable) {
                            setBandaAbierta(abierta ? null : banda.id);
                            return;
                          }
                          elegirFiltroMovil(banda.filtros[0]?.id ?? "todas");
                        }}
                      >
                        <span>{labelsBandaMovil[banda.id]}</span>
                        {desplegable ? (
                          <span className="casos-filtro-chevron" aria-hidden="true">
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
                                onClick={() => elegirFiltroMovil(item.id)}
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
        {!hayTarjetas ? (
          <p className="text-muted">
            {activoId === "todas" ? emptyLabel : "No hay casos en este estado."}
          </p>
        ) : (
          bandasLista.map((banda) => (
            <section key={banda.id} className="casos-banda" aria-label={banda.label || undefined}>
              {banda.label && activoId === "todas" ? (
                <h2 className="casos-banda-titulo">{banda.label}</h2>
              ) : null}
              {banda.filtros.map((grupo) => (
                <section key={grupo.id} className="casos-grupo" aria-labelledby={`grupo-${grupo.id}`}>
                  <header className="casos-grupo-cabecera">
                    <h3 id={`grupo-${grupo.id}`}>{grupo.label}</h3>
                    <span className="casos-grupo-n">{grupo.items.length}</span>
                  </header>
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
                                    {asignacion.estado === "EN_SUPERVISION" && asignacion.intencion ? (
                                      <span className="caso-fila-intencion">
                                        {asignacion.intencion === "FINALIZAR" ? "Finalización" : "Observaciones"}
                                      </span>
                                    ) : null}
                                  </li>
                                ))
                              )}
                            </ul>
                          ) : undefined
                        }
                      />
                    ))}
                  </div>
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
