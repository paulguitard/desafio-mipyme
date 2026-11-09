"use client";

import { FormEvent, useState } from "react";
import { desbloquearEvaluacionesPitch } from "@/actions/dashboard-participantes";
import { BrandMark } from "@/components/brand-mark";
import { DashboardEvaluacionesPitch } from "@/components/dashboard-evaluaciones-pitch";
import { DashboardTablaParticipantes } from "@/components/dashboard-tabla-participantes";
import type { EvaluacionesPitchPayload } from "@/lib/dashboard-evaluaciones-pitch";
import type { FilaDashboardParticipante, ResumenDashboardParticipantes } from "@/lib/perfiles-asesorias";
import { barrasTdPorSeccion, resumenDashboardPublico } from "@/lib/perfiles-asesorias";

function SeccionTd({
  titulo,
  items,
  total,
}: {
  titulo: string;
  items: { etiqueta: string; cantidad: number }[];
  total: number;
}) {
  const suma = items.reduce((acc, item) => acc + item.cantidad, 0);
  const base = Math.max(1, total);
  return (
    <section className="rounded-xl bg-navy-soft/70 p-4">
      <h3 className="mb-4 flex items-baseline justify-between gap-3">
        <span className="text-sm font-extrabold text-navy">{titulo}</span>
        <span className="text-sm font-semibold tabular-nums text-muted">
          {suma} de {total}
        </span>
      </h3>
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.etiqueta}
            className="grid grid-cols-[minmax(7.5rem,11rem)_minmax(0,1fr)_2.5rem] items-center gap-3"
          >
            <span className="text-sm leading-snug text-navy">{item.etiqueta}</span>
            <div className="h-3 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-navy"
                style={{ width: `${(item.cantidad / base) * 100}%` }}
              />
            </div>
            <span className="text-right text-sm font-extrabold tabular-nums text-navy">{item.cantidad}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const ANILLO_SIZE = 148;
const ANILLO_GROSOR = 9;
const ANILLO_RADIO = (ANILLO_SIZE - ANILLO_GROSOR) / 2;
const ANILLO_CIRCUNFERENCIA = 2 * Math.PI * ANILLO_RADIO;

function AnilloTorta({
  segmentos,
  centro,
}: {
  segmentos: { etiqueta: string; cantidad: number; color: string }[];
  centro: string;
}) {
  const total = segmentos.reduce((suma, item) => suma + item.cantidad, 0);
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-36 w-36">
        <svg viewBox={`0 0 ${ANILLO_SIZE} ${ANILLO_SIZE}`} className="h-full w-full -rotate-90" aria-hidden="true">
          {total === 0 ? (
            <circle
              cx={ANILLO_SIZE / 2}
              cy={ANILLO_SIZE / 2}
              r={ANILLO_RADIO}
              fill="none"
              stroke="var(--navy-soft)"
              strokeWidth={ANILLO_GROSOR}
            />
          ) : (
            segmentos.map((item) => {
              const largo = (item.cantidad / total) * ANILLO_CIRCUNFERENCIA;
              const dashoffset = offset;
              offset -= largo;
              return (
                <circle
                  key={item.etiqueta}
                  cx={ANILLO_SIZE / 2}
                  cy={ANILLO_SIZE / 2}
                  r={ANILLO_RADIO}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={ANILLO_GROSOR}
                  strokeDasharray={`${largo} ${ANILLO_CIRCUNFERENCIA - largo}`}
                  strokeDashoffset={dashoffset}
                />
              );
            })
          )}
        </svg>
        <p className="absolute inset-0 flex items-center justify-center text-lg font-extrabold text-navy">
          {centro}
        </p>
      </div>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
        {segmentos.map((item) => (
          <li key={item.etiqueta} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
            <span className="text-navy">{item.etiqueta}</span>
            <span className="text-muted">{item.cantidad}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function botonVista(activa: boolean) {
  return activa
    ? "dashboard-vista-btn rounded-md bg-white px-3 py-1.5 text-navy"
    : "dashboard-vista-btn rounded-md px-3 py-1.5 text-white/80 hover:bg-white/10";
}

export function DashboardParticipantes({
  filas,
  token,
}: {
  filas: FilaDashboardParticipante[];
  token: string;
}) {
  const resumen: ResumenDashboardParticipantes = resumenDashboardPublico(filas);
  const [vista, setVista] = useState<"inicio" | "pitch">("inicio");
  const [payload, setPayload] = useState<EvaluacionesPitchPayload | null>(null);
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviarClave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setError("");
    const resultado = await desbloquearEvaluacionesPitch({ token, clave });
    setEnviando(false);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    setPayload(resultado.data);
    setClave("");
  }

  return (
    <div className="dashboard-participantes-page">
      <header className="shrink-0 border-b border-white/10 bg-navy px-4 py-3 text-white sm:px-6">
        <div className="flex flex-wrap items-center gap-4">
          <BrandMark inverted compact href="/" />
          <h1 className="border-l border-white/20 pl-4 font-sans text-base font-normal leading-tight sm:text-lg">
            Desafío MiPyme
          </h1>
          <nav className="ml-auto flex gap-1" aria-label="Vistas del dashboard">
            <button className={botonVista(vista === "inicio")} type="button" onClick={() => setVista("inicio")}>
              Inicio
            </button>
            <button className={botonVista(vista === "pitch")} type="button" onClick={() => setVista("pitch")}>
              Evaluaciones Pitch
            </button>
          </nav>
        </div>
      </header>

      {vista === "pitch" && payload ? <DashboardEvaluacionesPitch data={payload} /> : null}

      {vista === "pitch" && !payload ? (
        <main className="grid min-h-0 flex-1 place-items-center overflow-auto p-4">
          <form className="card w-full max-w-md space-y-4 p-6" onSubmit={enviarClave}>
            <h2 className="text-base font-extrabold text-navy">Evaluaciones Pitch</h2>
            <p className="text-sm text-muted">Ingresa la contraseña para ver las evaluaciones.</p>
            <label className="field" htmlFor="clave-evaluaciones-pitch">
              <span>Contraseña</span>
              <input
                className="input"
                id="clave-evaluaciones-pitch"
                type="password"
                value={clave}
                onChange={(event) => setClave(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            {error ? <p className="text-sm font-semibold text-red">{error}</p> : null}
            <button className="btn btn-navy" type="submit" disabled={enviando}>
              {enviando ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </main>
      ) : null}

      {vista === "inicio" ? (
        <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 md:grid-cols-2 md:p-4">
        <aside className="flex min-h-0 flex-col gap-6 overflow-auto pt-1">
          <h2 className="flex items-baseline gap-2 px-4 font-extrabold text-navy">
            <span className="text-3xl tabular-nums leading-none">{resumen.total}</span>
            <span className="text-lg">participantes</span>
          </h2>
          <div className="grid grid-cols-2 gap-5">
            <div className="card p-4">
              <h2 className="mb-3 text-base font-extrabold text-navy">Formalización empresa</h2>
              <AnilloTorta
                centro={`${resumen.formalizacionSi} de ${resumen.total}`}
                segmentos={[
                  { etiqueta: "Sí", cantidad: resumen.formalizacionSi, color: "var(--navy)" },
                  { etiqueta: "No", cantidad: resumen.formalizacionNo, color: "var(--navy-soft)" },
                ]}
              />
            </div>
            <div className="card p-4">
              <h2 className="mb-3 text-base font-extrabold text-navy">Video Pitch</h2>
              <AnilloTorta
                centro={`${resumen.videoPitchEnviado} de ${resumen.total}`}
                segmentos={[
                  { etiqueta: "Enviado", cantidad: resumen.videoPitchEnviado, color: "var(--red)" },
                  { etiqueta: "Pendiente", cantidad: resumen.videoPitchPendiente, color: "#f3c5cd" },
                ]}
              />
            </div>
          </div>
          <div className="card p-5">
            <h2 className="mb-4 text-base font-extrabold text-navy">Asesoría TD</h2>
            {resumen.total === 0 ? (
              <p className="text-sm text-muted">Todavía no hay participantes.</p>
            ) : (
              <div className="space-y-4">
                {barrasTdPorSeccion(resumen.asesoriaTd).map((seccion) => (
                  <SeccionTd
                    key={seccion.titulo}
                    titulo={seccion.titulo}
                    items={seccion.items}
                    total={resumen.total}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

          <DashboardTablaParticipantes filas={filas} />
        </main>
      ) : null}
    </div>
  );
}
