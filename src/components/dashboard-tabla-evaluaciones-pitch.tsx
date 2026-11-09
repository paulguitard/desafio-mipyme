"use client";

import { useMemo, useState, type ReactNode } from "react";
import type {
  CasoEvaluacionPitch,
  ColumnaOrdenPitch,
  CriterioPitchColumna,
  DireccionOrdenPitch,
} from "@/lib/dashboard-evaluaciones-pitch";
import {
  compararCasosPitch,
  etiquetaEvaluadoresPitch,
  filasExcelLinksVideosPitch,
  pasaFiltroEvaluadorPitch,
  pasaFiltroRangoNotaPitch,
  textoNotaPitch,
  type RangoNotaPitch,
} from "@/lib/dashboard-evaluaciones-pitch";
import { pasaFiltroTexto } from "@/lib/perfiles-asesorias";
import { workbookXlsx } from "@/lib/xlsx-workbook";

const control =
  "dashboard-pitch-toolbar-control min-w-0 rounded-md border border-border bg-[var(--card)] text-xs font-normal text-foreground outline-none";

type PanelTabla = "filtrar" | "ordenar" | null;

function EncabezadoOrden({
  columna,
  actual,
  direccion,
  onOrdenar,
  children,
}: {
  columna: ColumnaOrdenPitch;
  actual: ColumnaOrdenPitch | null;
  direccion: DireccionOrdenPitch;
  onOrdenar: (columna: ColumnaOrdenPitch) => void;
  children: ReactNode;
}) {
  const activa = actual === columna;
  return (
    <button
      className="inline-flex max-w-full items-baseline gap-1 text-left text-xs font-semibold text-navy hover:underline"
      type="button"
      onClick={() => onOrdenar(columna)}
    >
      <span className="min-w-0 break-words">{children}</span>
      {activa ? <span aria-hidden="true">{direccion === "asc" ? "↑" : "↓"}</span> : null}
    </button>
  );
}

const rangoVacio: RangoNotaPitch = { min: "", max: "" };

function FiltroRangoNota({
  etiqueta,
  valor,
  onChange,
}: {
  etiqueta: string;
  valor: RangoNotaPitch;
  onChange: (valor: RangoNotaPitch) => void;
}) {
  return (
    <label className="flex shrink-0 flex-col gap-0.5 text-[10px] font-semibold leading-none text-navy">
      {etiqueta}
      <span className="flex items-center gap-0.5 font-normal text-muted">
        <input
          className={`${control} w-11 shrink-0`}
          value={valor.min}
          onChange={(event) => onChange({ ...valor, min: event.target.value })}
          placeholder="Mín"
          inputMode="decimal"
          aria-label={`${etiqueta} desde`}
        />
        <span aria-hidden="true">–</span>
        <input
          className={`${control} w-11 shrink-0`}
          value={valor.max}
          onChange={(event) => onChange({ ...valor, max: event.target.value })}
          placeholder="Máx"
          inputMode="decimal"
          aria-label={`${etiqueta} hasta`}
        />
      </span>
    </label>
  );
}

function BotonBarra({
  activo,
  children,
  onClick,
}: {
  activo: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`btn dashboard-pitch-barra-btn ${activo ? "btn-navy" : "btn-secondary"}`}
      type="button"
      aria-pressed={activo}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function DashboardTablaEvaluacionesPitch({
  criterios,
  casos,
  seleccionadoId,
  onVerDetalles,
}: {
  criterios: CriterioPitchColumna[];
  casos: CasoEvaluacionPitch[];
  seleccionadoId: string | null;
  onVerDetalles: (postulacionId: string) => void;
}) {
  const [panel, setPanel] = useState<PanelTabla>(null);
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroCaso, setFiltroCaso] = useState("");
  const [filtroNotaCampo, setFiltroNotaCampo] = useState("ponderacion");
  const [filtroNotaRango, setFiltroNotaRango] = useState<RangoNotaPitch>(rangoVacio);
  const [filtroEvaluador, setFiltroEvaluador] = useState("");
  const [columnaOrden, setColumnaOrden] = useState<ColumnaOrdenPitch | null>(null);
  const [direccion, setDireccion] = useState<DireccionOrdenPitch>("asc");

  const evaluadores = useMemo(() => {
    const nombres = new Set<string>();
    for (const caso of casos) {
      for (const evaluador of caso.evaluadores) {
        const nombre = evaluador.nombre.trim();
        if (nombre) nombres.add(nombre);
      }
    }
    return [...nombres].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [casos]);

  function togglePanel(siguiente: Exclude<PanelTabla, null>) {
    setPanel((actual) => (actual === siguiente ? null : siguiente));
  }

  function descargarLinksVideos() {
    const bytes = workbookXlsx("Videos pitch", filasExcelLinksVideosPitch(casos));
    const blob = new Blob([new Uint8Array(bytes)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "links-videos-pitch.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }

  function ordenar(columna: ColumnaOrdenPitch) {
    if (columnaOrden === columna) {
      setDireccion((actual) => (actual === "asc" ? "desc" : "asc"));
      return;
    }
    setColumnaOrden(columna);
    setDireccion("asc");
  }

  const visibles = useMemo(() => {
    const filtrados = casos.filter(
      (caso) =>
        pasaFiltroTexto(caso.participanteNombre, filtroNombre) &&
        pasaFiltroTexto(caso.nombreCaso, filtroCaso) &&
        pasaFiltroRangoNotaPitch(
          filtroNotaCampo === "ponderacion"
            ? caso.ponderacionPromedio
            : caso.promedioPorCriterio[filtroNotaCampo],
          filtroNotaRango.min,
          filtroNotaRango.max,
        ) &&
        pasaFiltroEvaluadorPitch(caso, filtroEvaluador),
    );
    if (!columnaOrden) return filtrados;
    return [...filtrados].sort((a, b) => compararCasosPitch(a, b, columnaOrden, direccion));
  }, [
    casos,
    filtroNombre,
    filtroCaso,
    filtroNotaCampo,
    filtroNotaRango,
    filtroEvaluador,
    criterios,
    columnaOrden,
    direccion,
  ]);
  const colSpan = 4 + criterios.length;

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="dashboard-pitch-toolbar flex shrink-0 flex-nowrap items-end gap-2 overflow-x-auto px-0.5">
        <div className="flex min-w-0 shrink-0 items-center gap-1.5">
          <BotonBarra activo={panel === "filtrar"} onClick={() => togglePanel("filtrar")}>
            Filtrar
          </BotonBarra>
          <BotonBarra activo={panel === "ordenar"} onClick={() => togglePanel("ordenar")}>
            Ordenar
          </BotonBarra>
        </div>
        {panel === "ordenar" ? (
          <div className="flex shrink-0 flex-nowrap items-center gap-2 text-xs text-muted">
            <label className="flex items-center gap-2">
              Columna
              <select
                className={control}
                value={columnaOrden ?? ""}
                onChange={(event) => {
                  const valor = event.target.value;
                  if (!valor) {
                    setColumnaOrden(null);
                    return;
                  }
                  setColumnaOrden(valor as ColumnaOrdenPitch);
                }}
                aria-label="Ordenar por columna"
              >
                <option value="">Sin orden</option>
                <option value="nombre">Nombre</option>
                <option value="caso">Caso</option>
                {criterios.map((criterio) => (
                  <option key={criterio.id} value={`criterio:${criterio.id}`}>
                    {criterio.nombre}
                  </option>
                ))}
                <option value="ponderacion">Ponderación</option>
                <option value="evaluadores">Evaluadores</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              Dirección
              <select
                className={control}
                value={direccion}
                disabled={!columnaOrden}
                onChange={(event) => setDireccion(event.target.value as DireccionOrdenPitch)}
                aria-label="Dirección de orden"
              >
                <option value="asc">Ascendente</option>
                <option value="desc">Descendente</option>
              </select>
            </label>
          </div>
        ) : null}
        {panel === "filtrar" ? (
          <div className="flex min-w-0 flex-nowrap items-end gap-1.5">
            <label className="flex shrink-0 flex-col gap-0.5 text-[10px] font-semibold leading-none text-navy">
              Nombre
              <input
                className={`${control} w-28`}
                value={filtroNombre}
                onChange={(event) => setFiltroNombre(event.target.value)}
                aria-label="Filtrar por nombre"
              />
            </label>
            <label className="flex shrink-0 flex-col gap-0.5 text-[10px] font-semibold leading-none text-navy">
              Caso
              <input
                className={`${control} w-28`}
                value={filtroCaso}
                onChange={(event) => setFiltroCaso(event.target.value)}
                aria-label="Filtrar por caso"
              />
            </label>
            <label className="flex shrink-0 flex-col gap-0.5 text-[10px] font-semibold leading-none text-navy">
              Rúbrica
              <select
                className={`${control} w-40`}
                value={filtroNotaCampo}
                onChange={(event) => setFiltroNotaCampo(event.target.value)}
                aria-label="Categoría de rúbrica a filtrar"
              >
                {criterios.map((criterio) => (
                  <option key={criterio.id} value={criterio.id}>
                    {criterio.nombre}
                  </option>
                ))}
                <option value="ponderacion">Ponderación final</option>
              </select>
            </label>
            <FiltroRangoNota etiqueta="Rango" valor={filtroNotaRango} onChange={setFiltroNotaRango} />
            <label className="flex shrink-0 flex-col gap-0.5 text-[10px] font-semibold leading-none text-navy">
              Evaluador
              <select
                className={`${control} w-36`}
                value={filtroEvaluador}
                onChange={(event) => setFiltroEvaluador(event.target.value)}
                aria-label="Filtrar por evaluador"
              >
                <option value="">Todos</option>
                {evaluadores.map((nombre) => (
                  <option key={nombre} value={nombre}>
                    {nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
        <button
          className="btn btn-secondary dashboard-pitch-barra-btn ml-auto shrink-0"
          type="button"
          onClick={descargarLinksVideos}
        >
          Descargar links de videos
        </button>
      </div>
      <section className="card flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <table className="dashboard-pitch-tabla w-full table-fixed text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100">
            <tr className="border-b border-border">
              <th className="w-[16%] px-2 py-1.5 align-bottom" aria-sort={columnaOrden === "nombre" ? (direccion === "asc" ? "ascending" : "descending") : "none"}>
                <EncabezadoOrden columna="nombre" actual={columnaOrden} direccion={direccion} onOrdenar={ordenar}>
                  Nombre
                </EncabezadoOrden>
              </th>
              <th className="w-[16%] px-2 py-1.5 align-bottom">
                <EncabezadoOrden columna="caso" actual={columnaOrden} direccion={direccion} onOrdenar={ordenar}>
                  Caso
                </EncabezadoOrden>
              </th>
              {criterios.map((criterio) => (
                <th
                  key={criterio.id}
                  className="w-[8%] px-1.5 py-1.5 align-bottom"
                  title={`${criterio.nombre} · ${criterio.peso}%`}
                >
                  <EncabezadoOrden
                    columna={`criterio:${criterio.id}`}
                    actual={columnaOrden}
                    direccion={direccion}
                    onOrdenar={ordenar}
                  >
                    {criterio.nombre}
                  </EncabezadoOrden>
                </th>
              ))}
              <th className="w-[9%] px-1.5 py-1.5 align-bottom">
                <EncabezadoOrden
                  columna="ponderacion"
                  actual={columnaOrden}
                  direccion={direccion}
                  onOrdenar={ordenar}
                >
                  Ponderación
                </EncabezadoOrden>
              </th>
              <th className="w-[9%] px-1.5 py-1.5 align-bottom">
                <EncabezadoOrden
                  columna="evaluadores"
                  actual={columnaOrden}
                  direccion={direccion}
                  onOrdenar={ordenar}
                >
                  Evaluadores
                </EncabezadoOrden>
              </th>
              <th className="w-[10%] px-1.5 py-1.5 align-bottom text-xs font-semibold">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-muted" colSpan={colSpan}>
                  No hay casos enviados en este filtro.
                </td>
              </tr>
            ) : null}
            {visibles.map((caso) => (
              <tr
                key={caso.postulacionId}
                className={`border-b border-border ${
                  seleccionadoId === caso.postulacionId ? "dashboard-pitch-fila-seleccionada" : ""
                }`}
              >
                <td className="break-words px-2 py-2">{caso.participanteNombre}</td>
                <td className="break-words px-2 py-2">{caso.nombreCaso}</td>
                {criterios.map((criterio) => (
                  <td key={criterio.id} className="px-1.5 py-2 tabular-nums">
                    {textoNotaPitch(caso.promedioPorCriterio[criterio.id])}
                  </td>
                ))}
                <td className="px-1.5 py-2 tabular-nums">{textoNotaPitch(caso.ponderacionPromedio)}</td>
                <td className="px-1.5 py-2">{etiquetaEvaluadoresPitch(caso)}</td>
                <td className="px-1.5 py-2">
                  <button
                    className="btn btn-sm btn-secondary px-2 whitespace-nowrap"
                    type="button"
                    onClick={() => onVerDetalles(caso.postulacionId)}
                  >
                    Ver detalles
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
    </div>
  );
}
