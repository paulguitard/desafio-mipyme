import { BrandMark } from "@/components/brand-mark";
import { DashboardTablaParticipantes } from "@/components/dashboard-tabla-participantes";
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

export function DashboardParticipantes({ filas }: { filas: FilaDashboardParticipante[] }) {
  const resumen: ResumenDashboardParticipantes = resumenDashboardPublico(filas);

  return (
    <div className="dashboard-participantes-page">
      <header className="shrink-0 border-b border-white/10 bg-navy px-4 py-3 text-white sm:px-6">
        <div className="flex items-center gap-4">
          <BrandMark inverted compact href="/" />
          <h1 className="border-l border-white/20 pl-4 font-sans text-base font-normal leading-tight sm:text-lg">
            Desafío MiPyme
          </h1>
        </div>
      </header>

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
    </div>
  );
}
