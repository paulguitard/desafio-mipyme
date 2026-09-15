"use client";

import { useMemo, useState } from "react";
import {
  CUENTAS_PRESUPUESTO,
  formatearPesosCLP,
  parseConfigGantt,
  parseConfigObjetivos,
  parseConfigPresupuesto,
  parseValorGantt,
  parseValorObjetivos,
  parseValorPresupuesto,
  sumaCuentaPresupuesto,
  topeItemCuenta,
  type ActividadGantt,
  type IndicadorObjetivo,
  type ConfigPresupuesto,
  type ItemPresupuesto,
  type ObjetivoEspecifico,
  type ValorGantt,
  type ValorObjetivos,
  type ValorPresupuesto,
} from "@/lib/preguntas";


function actividadVacia(): ActividadGantt {
  return { nombre: "", descripcion: "", fechaInicio: "", fechaCierre: "" };
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0);
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function formatMonthShort(date: Date): string {
  const raw = date.toLocaleDateString("es-CL", { month: "short" }).replace(/\./g, "").trim();
  const letters = raw.replace(/[^a-záéíóúñA-ZÁÉÍÓÚÑ]/g, "").slice(0, 3);
  if (!letters) return "";
  return letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase();
}

function formatDayNumber(date: Date): string {
  return String(date.getDate());
}

function formatBarEndpoint(date: Date, withMonth: boolean): string {
  const day = formatDayNumber(date);
  if (!withMonth) return day;
  const letter = formatMonthShort(date).charAt(0);
  return letter ? `${day} ${letter}` : day;
}

function formatBarRangeLabel(start: Date, end: Date): string {
  const sameMonth =
    start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  return `${formatBarEndpoint(start, !sameMonth)} - ${formatBarEndpoint(end, !sameMonth)}`;
}

type TimelineBand = { key: string; label: string; left: number; width: number; year: number };

type GanttTimeline = {
  rangeStart: Date;
  rangeEnd: Date;
  totalDays: number;
  months: TimelineBand[];
  years: TimelineBand[];
};

function yearBandsFromMonths(months: TimelineBand[]): TimelineBand[] {
  const years: TimelineBand[] = [];
  for (const month of months) {
    const last = years[years.length - 1];
    if (last && last.year === month.year) {
      last.width = month.left + month.width - last.left;
    } else {
      years.push({
        key: String(month.year),
        label: String(month.year),
        left: month.left,
        width: month.width,
        year: month.year,
      });
    }
  }
  return years;
}

function buildGanttTimeline(
  actividades: ActividadGantt[],
  config: { fechaMin?: string | null; fechaMax?: string | null },
): GanttTimeline | null {
  const dates: Date[] = [];
  for (const act of actividades) {
    const inicio = parseIsoDate(act.fechaInicio);
    const cierre = parseIsoDate(act.fechaCierre);
    if (inicio) dates.push(inicio);
    if (cierre) dates.push(cierre);
  }
  const configMin = parseIsoDate(config.fechaMin ?? "");
  const configMax = parseIsoDate(config.fechaMax ?? "");
  if (configMin) dates.push(configMin);
  if (configMax) dates.push(configMax);
  if (!dates.length) return null;

  let rangeStart = new Date(Math.min(...dates.map((d) => d.getTime())));
  let rangeEnd = new Date(Math.max(...dates.map((d) => d.getTime())));
  if (daysBetween(rangeStart, rangeEnd) < 6) {
    rangeEnd = addDays(rangeStart, 6);
  }
  // Padding visual a los costados
  rangeStart = addDays(rangeStart, -2);
  rangeEnd = addDays(rangeEnd, 2);

  const totalDays = Math.max(daysBetween(rangeStart, rangeEnd), 1);
  const months: TimelineBand[] = [];
  let cursor = startOfMonth(rangeStart);
  const endMonth = startOfMonth(rangeEnd);
  while (cursor <= endMonth) {
    const monthStart = cursor < rangeStart ? rangeStart : cursor;
    const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12, 0, 0);
    const monthEnd = nextMonth > rangeEnd ? rangeEnd : addDays(nextMonth, -1);
    const offset = Math.max(0, daysBetween(rangeStart, monthStart));
    const span = Math.max(1, daysBetween(monthStart, monthEnd) + 1);
    months.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      label: formatMonthShort(cursor),
      year: cursor.getFullYear(),
      left: (offset / totalDays) * 100,
      width: (span / totalDays) * 100,
    });
    cursor = nextMonth;
  }

  return {
    rangeStart,
    rangeEnd,
    totalDays,
    months,
    years: yearBandsFromMonths(months),
  };
}

function barPosition(
  act: ActividadGantt,
  timeline: GanttTimeline,
): { left: number; width: number; label: string } | null {
  const inicio = parseIsoDate(act.fechaInicio);
  const cierre = parseIsoDate(act.fechaCierre);
  if (!inicio || !cierre) return null;
  const start = inicio <= cierre ? inicio : cierre;
  const end = inicio <= cierre ? cierre : inicio;
  const offset = daysBetween(timeline.rangeStart, start);
  const span = Math.max(1, daysBetween(start, end) + 1);
  return {
    left: Math.max(0, Math.min(100, (offset / timeline.totalDays) * 100)),
    width: Math.max(1.2, Math.min(100, (span / timeline.totalDays) * 100)),
    label: formatBarRangeLabel(start, end),
  };
}

const GANTT_BAR_COLORS = [
  "var(--navy)",
  "var(--burgundy)",
  "#1a4a8a",
  "#8b2e42",
  "#23406e",
];

function itemVacio(): ItemPresupuesto {
  return { cuenta: "", nombre: "", descripcion: "", monto: null };
}

function indicadorVacio(): IndicadorObjetivo {
  return {
    nombre: "",
    descripcion: "",
    formaCalculo: "",
    valorEsperado: null,
    resultadoEsperado: "",
  };
}

function HiddenJson({ name, value }: { name: string; value: unknown }) {
  return <input type="hidden" name={name} value={JSON.stringify(value)} />;
}

function GanttMonths({ timeline }: { timeline: GanttTimeline | null }) {
  if (!timeline) {
    return <span className="gantt-month-placeholder">Cronograma</span>;
  }
  return (
    <div className="gantt-axis">
      <div className="gantt-years">
        {timeline.years.map((year) => (
          <span
            key={year.key}
            className="gantt-year"
            style={{ left: `${year.left}%`, width: `${year.width}%` }}
          >
            {year.label}
          </span>
        ))}
      </div>
      <div className="gantt-months">
        {timeline.months.map((month) => (
          <span
            key={month.key}
            className="gantt-month"
            style={{ left: `${month.left}%`, width: `${month.width}%` }}
          >
            {month.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function GanttTimelineTrack({
  act,
  index,
  timeline,
}: {
  act: ActividadGantt;
  index: number;
  timeline: GanttTimeline | null;
}) {
  const bar = timeline ? barPosition(act, timeline) : null;
  return (
    <div className="gantt-track">
      {timeline?.months.map((month) => (
        <span
          key={month.key}
          className="gantt-track-guide"
          style={{ left: `${month.left}%`, width: `${month.width}%` }}
        />
      ))}
      {bar ? (
        <div
          className="gantt-bar"
          style={{
            left: `${bar.left}%`,
            width: `${bar.width}%`,
            background: GANTT_BAR_COLORS[index % GANTT_BAR_COLORS.length],
          }}
          title={bar.label}
        >
          <span className="gantt-bar-label">{bar.label}</span>
        </div>
      ) : (
        <p className="gantt-track-empty">Sin fechas aún</p>
      )}
    </div>
  );
}

function IconoLapiz() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CampoGantt({
  name,
  opcionesRaw,
  valorInicial,
  readOnly,
}: {
  name: string;
  opcionesRaw: string;
  valorInicial?: unknown;
  readOnly?: boolean;
}) {
  const config = useMemo(() => parseConfigGantt(opcionesRaw), [opcionesRaw]);
  const inicial = parseValorGantt(valorInicial);
  const [actividades, setActividades] = useState<ActividadGantt[]>(inicial.actividades);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const valor: ValorGantt = { actividades };
  const max = config.maxActividades ?? 50;
  const rows = readOnly
    ? inicial.actividades.filter((a) => a.nombre || a.fechaInicio || a.fechaCierre)
    : actividades;
  const timeline = useMemo(() => buildGanttTimeline(rows, config), [rows, config]);
  const ocupado = editingIndex != null;

  function actualizar(index: number, patch: Partial<ActividadGantt>) {
    setActividades((actual) => actual.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  if (readOnly) {
    if (!rows.length) return <p className="text-muted">Sin actividades</p>;
    return (
      <div className="gantt-wrap">
        <div className="gantt-scroll">
          <table className="gantt-table">
            <thead>
              <tr>
                <th className="gantt-col-nombre">Actividad</th>
                <th className="gantt-col-desc">Descripción</th>
                <th className="gantt-col-timeline">
                  <GanttMonths timeline={timeline} />
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((act, index) => (
                <tr key={index}>
                  <td className="gantt-col-nombre">
                    <p className="gantt-nombre-text">{act.nombre || `Actividad ${index + 1}`}</p>
                  </td>
                  <td className="gantt-col-desc">
                    <p className="gantt-desc-text">{act.descripcion || "—"}</p>
                  </td>
                  <td className="gantt-col-timeline">
                    <GanttTimelineTrack act={act} index={index} timeline={timeline} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HiddenJson name={name} value={valor} />
      <div className="gantt-wrap">
        <div className="gantt-scroll">
          <table className="gantt-table">
            <thead>
              <tr>
                <th className="gantt-col-nombre">Actividad</th>
                <th className="gantt-col-desc">Descripción</th>
                <th className="gantt-col-timeline">
                  <GanttMonths timeline={timeline} />
                </th>
              </tr>
            </thead>
            <tbody>
              {actividades.length === 0 ? (
                <tr>
                  <td colSpan={3} className="gantt-empty-row">
                    Aún no hay actividades. Usa Agregar actividad para crear la primera fila.
                  </td>
                </tr>
              ) : null}
              {actividades.map((act, index) => {
                const editing = editingIndex === index;
                return (
                  <tr key={index} className={editing ? "is-editing" : undefined}>
                    <td className="gantt-col-nombre">
                      {editing ? (
                        <div className="gantt-edit-stack">
                          <input
                            className="input gantt-input"
                            placeholder={`Actividad ${index + 1}`}
                            aria-label={`Nombre actividad ${index + 1}`}
                            value={act.nombre}
                            onChange={(event) => actualizar(index, { nombre: event.target.value })}
                          />
                          <label className="gantt-date-field">
                            <span>Inicio</span>
                            <input
                              className="input gantt-input"
                              type="date"
                              min={config.fechaMin ?? undefined}
                              max={config.fechaMax ?? undefined}
                              value={act.fechaInicio}
                              onChange={(event) =>
                                actualizar(index, { fechaInicio: event.target.value })
                              }
                            />
                          </label>
                          <label className="gantt-date-field">
                            <span>Cierre</span>
                            <input
                              className="input gantt-input"
                              type="date"
                              min={config.fechaMin ?? undefined}
                              max={config.fechaMax ?? undefined}
                              value={act.fechaCierre}
                              onChange={(event) =>
                                actualizar(index, { fechaCierre: event.target.value })
                              }
                            />
                          </label>
                          <div className="gantt-edit-buttons">
                            <button
                              className="btn btn-sm btn-navy"
                              type="button"
                              onClick={() => setEditingIndex(null)}
                            >
                              Guardar
                            </button>
                            <button
                              className="btn btn-sm btn-ghost"
                              type="button"
                              onClick={() => {
                                setActividades((actual) => actual.filter((_, i) => i !== index));
                                setEditingIndex(null);
                              }}
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="gantt-nombre-row">
                          <button
                            className="gantt-icon-btn"
                            type="button"
                            disabled={ocupado}
                            aria-label={`Editar ${act.nombre || `actividad ${index + 1}`}`}
                            onClick={() => setEditingIndex(index)}
                          >
                            <IconoLapiz />
                          </button>
                          <p className="gantt-nombre-text">
                            {act.nombre || `Actividad ${index + 1}`}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="gantt-col-desc">
                      {editing ? (
                        <textarea
                          className="input gantt-input gantt-textarea"
                          rows={4}
                          placeholder="Descripción"
                          aria-label={`Descripción actividad ${index + 1}`}
                          value={act.descripcion}
                          onChange={(event) =>
                            actualizar(index, { descripcion: event.target.value })
                          }
                        />
                      ) : (
                        <p className="gantt-desc-text">{act.descripcion || "—"}</p>
                      )}
                    </td>
                    <td className="gantt-col-timeline">
                      <GanttTimelineTrack act={act} index={index} timeline={timeline} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <button
        className="btn btn-sm btn-secondary"
        type="button"
        disabled={ocupado || actividades.length >= max}
        onClick={() => {
          setActividades((actual) => [...actual, actividadVacia()]);
          setEditingIndex(actividades.length);
        }}
      >
        Agregar actividad
      </button>
    </div>
  );
}

function etiquetaCuenta(id: ItemPresupuesto["cuenta"]) {
  return CUENTAS_PRESUPUESTO.find((cuenta) => cuenta.id === id)?.label ?? "—";
}

function textoLimiteCuenta(limites: { montoMin?: number | null; montoMax?: number | null } | undefined) {
  if (!limites) return "Sin límite";
  const partes: string[] = [];
  if (limites.montoMin != null) partes.push(`mín. ${formatearPesosCLP(limites.montoMin)}`);
  if (limites.montoMax != null) partes.push(`máx. ${formatearPesosCLP(limites.montoMax)}`);
  return partes.length ? partes.join(" · ") : "Sin límite";
}

function TotalesPresupuesto({
  items,
  config,
}: {
  items: ItemPresupuesto[];
  config: ConfigPresupuesto;
}) {
  const total = items.reduce((sum, item) => sum + (item.monto ?? 0), 0);
  const totalSobre =
    (config.montoTotalMax != null && total > config.montoTotalMax) ||
    (config.montoTotalMin != null && total > 0 && total < config.montoTotalMin);
  return (
    <div className="presupuesto-totales">
      <table className="presupuesto-limites-resumen">
        <thead>
          <tr>
            <th>Cuenta</th>
            <th>Usado</th>
            <th>Límite de la cuenta</th>
          </tr>
        </thead>
        <tbody>
          {CUENTAS_PRESUPUESTO.map((cuenta) => {
            const suma = sumaCuentaPresupuesto(items, cuenta.id);
            const limites = config.limitesCuentas?.[cuenta.id];
            const sobreMax = limites?.montoMax != null && suma > limites.montoMax;
            const bajoMin = limites?.montoMin != null && suma > 0 && suma < limites.montoMin;
            return (
              <tr
                key={cuenta.id}
                className={sobreMax ? "is-over" : bajoMin ? "is-under" : undefined}
              >
                <th scope="row">{cuenta.label}</th>
                <td>{formatearPesosCLP(suma)}</td>
                <td>{textoLimiteCuenta(limites)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className={totalSobre ? "is-over" : undefined}>
            <th scope="row">Total</th>
            <td>{formatearPesosCLP(total)}</td>
            <td>
              {config.montoTotalMin != null || config.montoTotalMax != null
                ? textoLimiteCuenta({
                    montoMin: config.montoTotalMin,
                    montoMax: config.montoTotalMax,
                  })
                : "—"}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function TablaPresupuesto({
  filas,
  editable,
  ocupado,
  editingIndex,
  config,
  errorLimite,
  onEditar,
  onGuardar,
  onQuitar,
  onActualizar,
}: {
  filas: ItemPresupuesto[];
  editable: boolean;
  ocupado: boolean;
  editingIndex: number | null;
  config: ConfigPresupuesto;
  errorLimite?: string | null;
  onEditar: (index: number) => void;
  onGuardar: () => void;
  onQuitar: (index: number) => void;
  onActualizar: (index: number, patch: Partial<ItemPresupuesto>) => void;
}) {
  return (
    <div className="gantt-wrap">
      <div className="gantt-scroll">
        <table className="gantt-table presupuesto-table">
          <thead>
            <tr>
              <th className="presupuesto-col-nombre">Ítem</th>
              <th className="presupuesto-col-cuenta">Cuenta</th>
              <th className="presupuesto-col-desc">Descripción</th>
              <th className="presupuesto-col-monto">Monto</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td colSpan={4} className="gantt-empty-row">
                  {editable
                    ? "Aún no hay ítems. Usa Agregar ítem para crear la primera fila."
                    : "Sin ítems"}
                </td>
              </tr>
            ) : null}
            {filas.map((item, index) => {
              const editing = editable && editingIndex === index;
              const tope =
                editing && item.cuenta
                  ? topeItemCuenta(filas, index, item.cuenta, config)
                  : null;
              const maxCuenta = item.cuenta
                ? config.limitesCuentas?.[item.cuenta]?.montoMax
                : null;
              const sobreTope =
                tope != null && item.monto != null && item.monto > tope;
              return (
                <tr key={index} className={editing ? "is-editing" : undefined}>
                  <td className="presupuesto-col-nombre">
                    {editing ? (
                      <div className="gantt-edit-stack">
                        <input
                          className="input gantt-input"
                          placeholder={`Ítem ${index + 1}`}
                          aria-label={`Nombre ítem ${index + 1}`}
                          value={item.nombre}
                          onChange={(event) => onActualizar(index, { nombre: event.target.value })}
                        />
                        <div className="gantt-edit-buttons">
                          <button className="btn btn-sm btn-navy" type="button" onClick={onGuardar}>
                            Guardar
                          </button>
                          <button
                            className="btn btn-sm btn-ghost"
                            type="button"
                            onClick={() => onQuitar(index)}
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    ) : editable ? (
                      <div className="gantt-nombre-row">
                        <button
                          className="gantt-icon-btn"
                          type="button"
                          disabled={ocupado}
                          aria-label={`Editar ${item.nombre || `ítem ${index + 1}`}`}
                          onClick={() => onEditar(index)}
                        >
                          <IconoLapiz />
                        </button>
                        <p className="gantt-nombre-text">{item.nombre || `Ítem ${index + 1}`}</p>
                      </div>
                    ) : (
                      <p className="gantt-nombre-text">{item.nombre || `Ítem ${index + 1}`}</p>
                    )}
                  </td>
                  <td className="presupuesto-col-cuenta">
                    {editing ? (
                      <select
                        className="input gantt-input"
                        aria-label={`Cuenta ítem ${index + 1}`}
                        value={item.cuenta}
                        onChange={(event) =>
                          onActualizar(index, {
                            cuenta: event.target.value as ItemPresupuesto["cuenta"],
                          })
                        }
                      >
                        <option value="">Selecciona</option>
                        {CUENTAS_PRESUPUESTO.map((cuenta) => (
                          <option key={cuenta.id} value={cuenta.id}>
                            {cuenta.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="gantt-desc-text">{etiquetaCuenta(item.cuenta)}</p>
                    )}
                  </td>
                  <td className="presupuesto-col-desc">
                    {editing ? (
                      <textarea
                        className="input gantt-input gantt-textarea"
                        rows={3}
                        placeholder="Descripción"
                        aria-label={`Descripción ítem ${index + 1}`}
                        value={item.descripcion}
                        onChange={(event) =>
                          onActualizar(index, { descripcion: event.target.value })
                        }
                      />
                    ) : (
                      <p className="gantt-desc-text">{item.descripcion || "—"}</p>
                    )}
                  </td>
                  <td className="presupuesto-col-monto">
                    {editing ? (
                      <div className="presupuesto-monto-edit">
                        <div
                          className={
                            sobreTope
                              ? "presupuesto-monto-input is-invalid"
                              : "presupuesto-monto-input"
                          }
                        >
                          <span className="presupuesto-monto-prefix" aria-hidden>
                            $
                          </span>
                          <input
                            className="input gantt-input"
                            type="number"
                            min={0}
                            step={1}
                            inputMode="numeric"
                            placeholder="0"
                            aria-invalid={sobreTope}
                            aria-label={`Monto ítem ${index + 1}`}
                            value={item.monto ?? ""}
                            onChange={(event) => {
                              const raw = event.target.value;
                              const monto = raw === "" ? null : Math.round(Number(raw));
                              onActualizar(index, {
                                monto: Number.isFinite(monto as number) ? monto : null,
                              });
                            }}
                          />
                        </div>
                        {sobreTope && maxCuenta != null ? (
                          <p className="presupuesto-monto-hint is-error" role="alert">
                            Este monto supera el máximo de {etiquetaCuenta(item.cuenta)} (
                            {formatearPesosCLP(maxCuenta)}). En este ítem el tope es{" "}
                            {formatearPesosCLP(tope)}.
                          </p>
                        ) : tope != null && maxCuenta != null ? (
                          <p className="presupuesto-monto-hint">
                            Tope de la cuenta: {formatearPesosCLP(maxCuenta)}. En este ítem puedes
                            poner hasta {formatearPesosCLP(tope)}.
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="presupuesto-monto-text">{formatearPesosCLP(item.monto)}</p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {errorLimite ? <p className="presupuesto-error">{errorLimite}</p> : null}
      <TotalesPresupuesto items={filas} config={config} />
    </div>
  );
}

export function CampoPresupuesto({
  name,
  opcionesRaw,
  valorInicial,
  readOnly,
}: {
  name: string;
  opcionesRaw: string;
  valorInicial?: unknown;
  readOnly?: boolean;
}) {
  const config = useMemo(() => parseConfigPresupuesto(opcionesRaw), [opcionesRaw]);
  const inicial = parseValorPresupuesto(valorInicial);
  const [items, setItems] = useState<ItemPresupuesto[]>(inicial.items);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [errorLimite, setErrorLimite] = useState<string | null>(null);
  const valor: ValorPresupuesto = { items };
  const max = config.maxItems ?? 100;
  const ocupado = editingIndex != null;
  const rows = readOnly
    ? inicial.items.filter((item) => item.nombre || item.monto != null || item.cuenta)
    : items;

  function actualizar(index: number, patch: Partial<ItemPresupuesto>) {
    setErrorLimite(null);
    setItems((actual) => actual.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function intentarGuardar() {
    if (editingIndex == null) return;
    const item = items[editingIndex];
    if (!item) return;
    if (!item.cuenta) {
      setErrorLimite("Elige una cuenta para el ítem.");
      return;
    }
    const tope = topeItemCuenta(items, editingIndex, item.cuenta, config);
    const maxCuenta = config.limitesCuentas?.[item.cuenta]?.montoMax;
    if (tope != null && (item.monto ?? 0) > tope) {
      setErrorLimite(
        `El total de ${etiquetaCuenta(item.cuenta)} no puede superar ${formatearPesosCLP(maxCuenta)}.`,
      );
      return;
    }
    setErrorLimite(null);
    setEditingIndex(null);
  }

  const tabla = (
    <TablaPresupuesto
      filas={rows}
      editable={!readOnly}
      ocupado={ocupado}
      editingIndex={readOnly ? null : editingIndex}
      config={config}
      errorLimite={errorLimite}
      onEditar={(index) => {
        setErrorLimite(null);
        setEditingIndex(index);
      }}
      onGuardar={intentarGuardar}
      onQuitar={(index) => {
        setItems((actual) => actual.filter((_, i) => i !== index));
        setEditingIndex(null);
        setErrorLimite(null);
      }}
      onActualizar={actualizar}
    />
  );

  if (readOnly) {
    if (!rows.length) return <p className="text-muted">Sin ítems</p>;
    return tabla;
  }

  return (
    <div className="space-y-4">
      <HiddenJson name={name} value={valor} />
      {tabla}
      <button
        className="btn btn-sm btn-secondary"
        type="button"
        disabled={ocupado || items.length >= max}
        onClick={() => {
          setItems((actual) => [...actual, itemVacio()]);
          setEditingIndex(items.length);
        }}
      >
        Agregar ítem
      </button>
    </div>
  );
}

export function CampoObjetivosIndicadores({
  name,
  opcionesRaw,
  valorInicial,
  readOnly,
}: {
  name: string;
  opcionesRaw: string;
  valorInicial?: unknown;
  readOnly?: boolean;
}) {
  const config = useMemo(() => parseConfigObjetivos(opcionesRaw), [opcionesRaw]);
  const cantidad = config.cantidadObjetivosEspecificos;
  const minInd = config.minIndicadoresPorObjetivo ?? 1;
  const maxInd = config.maxIndicadoresPorObjetivo ?? 10;

  const inicial = parseValorObjetivos(valorInicial);
  const [objetivoGeneral, setObjetivoGeneral] = useState(inicial.objetivoGeneral);
  const [objetivos, setObjetivos] = useState<ObjetivoEspecifico[]>(() => {
    const base = [...inicial.objetivosEspecificos];
    while (base.length < cantidad) {
      base.push({
        enunciado: "",
        indicadores: Array.from({ length: minInd }, () => indicadorVacio()),
      });
    }
    return base.slice(0, cantidad).map((oe) => ({
      ...oe,
      indicadores:
        oe.indicadores.length > 0
          ? oe.indicadores
          : Array.from({ length: minInd }, () => indicadorVacio()),
    }));
  });

  const valor: ValorObjetivos = { objetivoGeneral, objetivosEspecificos: objetivos };

  if (readOnly) {
    if (!inicial.objetivoGeneral && !inicial.objetivosEspecificos.some((oe) => oe.enunciado)) {
      return <p className="text-muted">Sin objetivos</p>;
    }
    return (
      <div className="space-y-4 text-sm">
        <div>
          <p className="font-semibold text-navy">Objetivo general</p>
          <p className="mt-1 whitespace-pre-wrap">{inicial.objetivoGeneral || "—"}</p>
        </div>
        {inicial.objetivosEspecificos.map((oe, index) => (
          <div key={index} className="rounded-xl border border-border p-3">
            <p className="font-semibold text-navy">Objetivo específico {index + 1}</p>
            <p className="mt-1 whitespace-pre-wrap">{oe.enunciado || "—"}</p>
            <div className="mt-3 space-y-2">
              {oe.indicadores.map((ind, j) => (
                <div key={j} className="rounded-lg bg-slate-50 p-2">
                  <p className="font-medium">{ind.nombre || `Indicador ${j + 1}`}</p>
                  {ind.descripcion ? <p className="text-muted">{ind.descripcion}</p> : null}
                  <p>Cálculo: {ind.formaCalculo || "—"}</p>
                  <p>
                    Valor esperado: {ind.valorEsperado ?? "—"} · Resultado:{" "}
                    {ind.resultadoEsperado || "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HiddenJson name={name} value={valor} />
      <div className="field">
        <label>Objetivo general</label>
        <textarea
          className="input w-full"
          rows={3}
          value={objetivoGeneral}
          onChange={(event) => setObjetivoGeneral(event.target.value)}
        />
      </div>
      {objetivos.map((oe, index) => (
        <div key={index} className="space-y-3 rounded-xl border border-border p-4">
          <p className="font-semibold text-navy">Objetivo específico {index + 1}</p>
          <div className="field">
            <label>Enunciado</label>
            <textarea
              className="input w-full"
              rows={2}
              value={oe.enunciado}
              onChange={(event) => {
                const enunciado = event.target.value;
                setObjetivos((actual) =>
                  actual.map((row, i) => (i === index ? { ...row, enunciado } : row)),
                );
              }}
            />
          </div>
          {oe.indicadores.map((ind, j) => (
            <div key={j} className="space-y-2 rounded-lg border border-dashed border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Indicador {j + 1}</p>
                <button
                  className="btn btn-sm btn-ghost"
                  type="button"
                  disabled={oe.indicadores.length <= minInd}
                  onClick={() =>
                    setObjetivos((actual) =>
                      actual.map((row, i) =>
                        i === index
                          ? { ...row, indicadores: row.indicadores.filter((_, k) => k !== j) }
                          : row,
                      ),
                    )
                  }
                >
                  Quitar
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="field">
                  <label>Nombre</label>
                  <input
                    className="input w-full"
                    value={ind.nombre}
                    onChange={(event) => {
                      const nombre = event.target.value;
                      setObjetivos((actual) =>
                        actual.map((row, i) =>
                          i === index
                            ? {
                                ...row,
                                indicadores: row.indicadores.map((x, k) =>
                                  k === j ? { ...x, nombre } : x,
                                ),
                              }
                            : row,
                        ),
                      );
                    }}
                  />
                </div>
                <div className="field">
                  <label>Valor esperado</label>
                  <input
                    className="input w-full"
                    type="number"
                    step="any"
                    value={ind.valorEsperado ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value;
                      const valorEsperado = raw === "" ? null : Number(raw);
                      setObjetivos((actual) =>
                        actual.map((row, i) =>
                          i === index
                            ? {
                                ...row,
                                indicadores: row.indicadores.map((x, k) =>
                                  k === j
                                    ? {
                                        ...x,
                                        valorEsperado: Number.isFinite(valorEsperado as number)
                                          ? valorEsperado
                                          : null,
                                      }
                                    : x,
                                ),
                              }
                            : row,
                        ),
                      );
                    }}
                  />
                </div>
              </div>
              <div className="field">
                <label>Descripción</label>
                <input
                  className="input w-full"
                  value={ind.descripcion}
                  onChange={(event) => {
                    const descripcion = event.target.value;
                    setObjetivos((actual) =>
                      actual.map((row, i) =>
                        i === index
                          ? {
                              ...row,
                              indicadores: row.indicadores.map((x, k) =>
                                k === j ? { ...x, descripcion } : x,
                              ),
                            }
                          : row,
                      ),
                    );
                  }}
                />
              </div>
              <div className="field">
                <label>Forma de cálculo</label>
                <input
                  className="input w-full"
                  value={ind.formaCalculo}
                  onChange={(event) => {
                    const formaCalculo = event.target.value;
                    setObjetivos((actual) =>
                      actual.map((row, i) =>
                        i === index
                          ? {
                              ...row,
                              indicadores: row.indicadores.map((x, k) =>
                                k === j ? { ...x, formaCalculo } : x,
                              ),
                            }
                          : row,
                      ),
                    );
                  }}
                />
              </div>
              <div className="field">
                <label>Resultado esperado</label>
                <input
                  className="input w-full"
                  value={ind.resultadoEsperado}
                  onChange={(event) => {
                    const resultadoEsperado = event.target.value;
                    setObjetivos((actual) =>
                      actual.map((row, i) =>
                        i === index
                          ? {
                              ...row,
                              indicadores: row.indicadores.map((x, k) =>
                                k === j ? { ...x, resultadoEsperado } : x,
                              ),
                            }
                          : row,
                      ),
                    );
                  }}
                />
              </div>
            </div>
          ))}
          <button
            className="btn btn-sm btn-secondary"
            type="button"
            disabled={oe.indicadores.length >= maxInd}
            onClick={() =>
              setObjetivos((actual) =>
                actual.map((row, i) =>
                  i === index ? { ...row, indicadores: [...row.indicadores, indicadorVacio()] } : row,
                ),
              )
            }
          >
            Agregar indicador
          </button>
        </div>
      ))}
    </div>
  );
}
