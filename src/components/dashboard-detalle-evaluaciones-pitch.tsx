"use client";

import { TextoLargoVista } from "@/components/texto-largo-vista";
import { VideoEmbed } from "@/components/video-embed";
import { htmlParaVistaComentario } from "@/lib/comentario-observacion";
import type { CasoEvaluacionPitch, CriterioPitchColumna } from "@/lib/dashboard-evaluaciones-pitch";
import { textoNotaPitch } from "@/lib/dashboard-evaluaciones-pitch";

export function DashboardDetalleEvaluacionesPitch({
  caso,
  criterios,
}: {
  caso: CasoEvaluacionPitch | null;
  criterios: CriterioPitchColumna[];
}) {
  return (
    <aside className="flex h-full min-h-0 flex-col gap-4 overflow-hidden pt-1">
      <div className="shrink-0 space-y-3 bg-[var(--background)]">
        {caso ? (
          <div className="px-1">
            <h2 className="text-base font-extrabold text-navy">{caso.nombreCaso}</h2>
            <p className="text-sm text-navy">{caso.participanteNombre}</p>
          </div>
        ) : null}
        <div className="space-y-1">
          {caso?.videoUrl ? (
            <p className="px-1">
              <a
                className="break-all text-sm text-accent underline"
                href={caso.videoUrl}
                target="_blank"
                rel="noreferrer"
              >
                {caso.videoUrl}
              </a>
            </p>
          ) : null}
          <div className="dashboard-pitch-video card overflow-hidden p-0">
            {caso?.videoUrl ? (
              <VideoEmbed url={caso.videoUrl} />
            ) : (
              <div className="flex aspect-video items-center justify-center bg-navy-soft/70 px-6 text-center">
                <p className="text-sm font-semibold text-navy">
                  {caso ? "Este caso no tiene video" : "Elige un caso a la derecha para ver"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {caso ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          <div className="space-y-4 pb-8">
          {criterios.map((criterio) => (
            <section key={criterio.id} className="card space-y-3 p-5">
              <h3 className="flex items-baseline justify-between gap-3 text-base font-extrabold text-navy">
                <span>
                  {criterio.nombre}{" "}
                  <span className="font-semibold tabular-nums">
                    {`(${textoNotaPitch(caso.promedioPorCriterio[criterio.id])})`}
                  </span>
                </span>
                <span className="text-sm font-semibold text-muted">Peso {criterio.peso}%</span>
              </h3>
              <ul className="space-y-1">
                {caso.evaluadores.map((evaluador) => (
                  <li key={evaluador.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-navy">{evaluador.nombre}</span>
                    <span className="tabular-nums text-muted">
                      {textoNotaPitch(evaluador.notasPorCriterio[criterio.id])}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section className="card space-y-3 p-5">
            <h3 className="text-base font-extrabold text-navy">Ponderación final</h3>
            <ul className="space-y-1">
              {caso.evaluadores.map((evaluador) => (
                <li key={evaluador.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-navy">{evaluador.nombre}</span>
                  <span className="tabular-nums text-muted">{textoNotaPitch(evaluador.ponderacion)}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm font-extrabold tabular-nums text-navy">
              Promedio: {textoNotaPitch(caso.ponderacionPromedio)}
            </p>
          </section>

          <section className="card space-y-4 p-5">
            <h3 className="text-base font-extrabold text-navy">Comentarios</h3>
            {caso.evaluadores.length === 0 ? (
              <p className="text-sm text-muted">Sin comentarios.</p>
            ) : (
              caso.evaluadores.map((evaluador) => (
                <article key={evaluador.id} className="rounded-xl bg-navy-soft/70 p-4">
                  <h4 className="mb-2 text-sm font-extrabold text-navy">{evaluador.nombre}</h4>
                  {evaluador.comentario.trim() ? (
                    <TextoLargoVista html={htmlParaVistaComentario(evaluador.comentario)} />
                  ) : (
                    <p className="text-sm text-muted">Sin comentario.</p>
                  )}
                </article>
              ))
            )}
          </section>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
