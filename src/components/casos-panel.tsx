"use client";

import { useMemo, useState, type ReactNode } from "react";
import { BadgeAsignacion } from "@/components/badges";
import {
  agruparFiltrosPorBanda,
  conteosCasos,
  gruposVisibles,
  itemsDeGrupo,
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
}: {
  titulo: string;
  filtros: FiltroCaso[];
  filtroInicial: string;
  casos: CasoPanelVista[];
  tourFiltros: string;
  tourLista: string;
  emptyLabel: string;
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

  function elegirFiltro(id: string) {
    setActivoId(id);
    aplicarFiltroEnUrl(id);
  }

  return (
    <div className="page-workspace grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden">
      <div className="shrink-0 space-y-4 bg-background">
        <h1 className="text-3xl font-extrabold text-navy">{titulo}</h1>
        <div className="casos-filtros" data-tour={tourFiltros} role="tablist" aria-label="Filtros de casos">
          {bandasFiltro.map((banda, indice) => (
            <div key={banda.id} className="casos-filtros-slot">
              {indice > 0 ? <span className="casos-filtros-sep" aria-hidden="true" /> : null}
              <div className={`casos-filtros-banda${banda.id === "todas" ? " is-todas" : ""}`}>
                {banda.label ? <p className="casos-filtros-banda-label">{banda.label}</p> : null}
                <div className="casos-filtros-banda-chips">
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
