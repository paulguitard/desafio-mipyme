"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { BotonesEvaluadorRevision } from "@/components/acciones-revision-botones";
import { useAccionesRevision } from "@/components/acciones-revision-context";
import { avisarCambioFormulario } from "@/lib/autoguardado";
import { htmlParaVistaComentario } from "@/lib/comentario-observacion";
import {
  campoNotaCriterio,
  etiquetaNivelRubrica,
  formatearNotaRubrica,
  nivelRubrica,
  notaPonderadaRubrica,
  promedioNotasRubrica,
  type CriterioRubricaDatos,
} from "@/lib/rubrica";

const EditorTextoLargo = dynamic(
  () => import("@/components/editor-texto-largo").then((mod) => mod.EditorTextoLargo),
);
const TextoLargoVista = dynamic(
  () => import("@/components/texto-largo-vista").then((mod) => mod.TextoLargoVista),
);

export type NotaCriterioVista = {
  criterioId: string;
  nota: number | null;
};

function CriterioRubricaCard({
  criterio,
  escala,
  nota,
  canEdit,
  onNota,
}: {
  criterio: CriterioRubricaDatos;
  escala: number[];
  nota: number | null;
  canEdit: boolean;
  onNota?: (nota: number) => void;
}) {
  const grupo = `rubrica-criterio-${criterio.id}`;
  return (
    <article className="card pregunta-lectura rubrica-criterio" data-rubrica-nota={nota ?? ""}>
      <div className="pregunta-lectura-enunciado">
        <div className="pregunta-encabezado">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="min-w-0 flex-1 text-xl font-semibold">{criterio.nombre}</h3>
            <span className="rubrica-peso">Peso {criterio.peso}%</span>
          </div>
          {criterio.preguntaGuia.trim() ? (
            <p className="pregunta-descripcion">{criterio.preguntaGuia}</p>
          ) : null}
          {criterio.detalle.trim() ? (
            <p className="rubrica-criterio-detalle">{criterio.detalle}</p>
          ) : null}
        </div>
      </div>
      <div className="pregunta-lectura-cuerpo">
        <input type="hidden" name={campoNotaCriterio(criterio.id)} value={nota ?? ""} />
        <ul className="rubrica-niveles" role={canEdit ? "radiogroup" : undefined} aria-label={criterio.nombre}>
          {escala.map((valor) => {
            const activo = nota === valor;
            const nivel = nivelRubrica(criterio.explicaciones, valor);
            const id = `${grupo}-${valor}`;
            return (
              <li key={valor}>
                <label
                  className={`rubrica-nivel${activo ? " is-activo" : ""}`}
                  htmlFor={id}
                >
                  <input
                    id={id}
                    className="rubrica-nivel-check"
                    type="checkbox"
                    checked={activo}
                    disabled={!canEdit}
                    onChange={() => onNota?.(valor)}
                  />
                  <span className="rubrica-nivel-etiqueta">{etiquetaNivelRubrica(valor, nivel)}</span>
                  {nivel.detalle ? (
                    <span className="rubrica-nivel-detalle">{nivel.detalle}</span>
                  ) : null}
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}

export function PanelRubricaEvaluador({
  escala,
  criterios,
  notasIniciales,
  comentarioInicial,
  canEdit,
}: {
  escala: number[];
  criterios: CriterioRubricaDatos[];
  notasIniciales: NotaCriterioVista[];
  comentarioInicial: string;
  canEdit: boolean;
}) {
  const acciones = useAccionesRevision();
  const [notas, setNotas] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(criterios.map((item) => [
      item.id,
      notasIniciales.find((nota) => nota.criterioId === item.id)?.nota ?? null,
    ])),
  );
  const [comentario, setComentario] = useState(() => htmlParaVistaComentario(comentarioInicial));
  const anclaRef = useRef<HTMLDivElement>(null);
  const primer = useRef(true);

  useEffect(() => {
    if (primer.current) {
      primer.current = false;
      return;
    }
    avisarCambioFormulario(anclaRef.current);
  }, [notas, comentario]);

  const ponderada = notaPonderadaRubrica(
    criterios.map((criterio) => ({ peso: criterio.peso, nota: notas[criterio.id] ?? null })),
  );

  return (
    <div ref={anclaRef} className="space-y-4">
      <input type="hidden" name="veredicto-general" value="OK" />
      {criterios.map((criterio) => (
        <CriterioRubricaCard
          key={criterio.id}
          criterio={criterio}
          escala={escala}
          nota={notas[criterio.id] ?? null}
          canEdit={canEdit}
          onNota={(nota) => setNotas((actual) => ({ ...actual, [criterio.id]: nota }))}
        />
      ))}
      <div className="card pregunta-lectura rubrica-cierre">
        <div className="pregunta-lectura-enunciado">
          <h3 className="text-xl font-semibold">
            Nota ponderada: {formatearNotaRubrica(ponderada) || "pendiente"}
          </h3>
        </div>
        <div className="pregunta-lectura-cuerpo space-y-3">
          {canEdit ? (
            <div className="field">
              <label htmlFor="comentario-general">Comentario (opcional)</label>
              <EditorTextoLargo
                name="comentario-general"
                defaultValue={comentario}
                destacados={false}
                tamano={false}
                alinear={false}
                onChange={setComentario}
              />
            </div>
          ) : comentario.trim() ? (
            <TextoLargoVista html={comentario} />
          ) : (
            <p className="text-sm text-muted">Sin comentario.</p>
          )}
          {canEdit ? <BotonesEvaluadorRevision disabled={Boolean(acciones?.disabled)} /> : null}
        </div>
      </div>
    </div>
  );
}

export function PanelRubricaLectura({
  escala,
  criterios,
  notas,
  comentario,
  evaluadorNombre,
}: {
  escala: number[];
  criterios: CriterioRubricaDatos[];
  notas: NotaCriterioVista[];
  comentario: string;
  evaluadorNombre: string;
}) {
  const mapa = Object.fromEntries(notas.map((item) => [item.criterioId, item.nota]));
  const ponderada = notaPonderadaRubrica(
    criterios.map((criterio) => ({ peso: criterio.peso, nota: mapa[criterio.id] ?? null })),
  );
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Evaluador: {evaluadorNombre}</p>
      {criterios.map((criterio) => (
        <CriterioRubricaCard
          key={criterio.id}
          criterio={criterio}
          escala={escala}
          nota={mapa[criterio.id] ?? null}
          canEdit={false}
        />
      ))}
      <div className="card pregunta-lectura rubrica-cierre">
        <div className="pregunta-lectura-enunciado">
          <h3 className="text-xl font-semibold">
            Nota ponderada: {formatearNotaRubrica(ponderada) || "pendiente"}
          </h3>
        </div>
        <div className="pregunta-lectura-cuerpo space-y-3">
          <p className="text-sm font-semibold">Comentario</p>
          {comentario.trim() ? (
            <TextoLargoVista html={htmlParaVistaComentario(comentario)} />
          ) : (
            <p className="text-sm text-muted">Sin comentario.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function PanelRubricaConsolidado({
  escala,
  criterios,
  evaluadores,
}: {
  escala: number[];
  criterios: CriterioRubricaDatos[];
  evaluadores: {
    id: string;
    nombre: string;
    estado: string;
    notas: NotaCriterioVista[];
    comentario: string;
  }[];
}) {
  const todosFinalizaron =
    evaluadores.length > 0 && evaluadores.every((item) => item.estado === "FINALIZADA");
  const notasFinales = evaluadores.map((evaluador) => {
    const mapa = Object.fromEntries(evaluador.notas.map((item) => [item.criterioId, item.nota]));
    return notaPonderadaRubrica(
      criterios.map((criterio) => ({ peso: criterio.peso, nota: mapa[criterio.id] ?? null })),
    );
  });
  const promedio = promedioNotasRubrica({ notas: notasFinales, todosFinalizaron });

  return (
    <div className="space-y-4">
      {criterios.map((criterio) => (
        <article key={criterio.id} className="card pregunta-lectura rubrica-criterio">
          <div className="pregunta-lectura-enunciado">
            <div className="pregunta-encabezado">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="min-w-0 flex-1 text-xl font-semibold">{criterio.nombre}</h3>
                <span className="rubrica-peso">Peso {criterio.peso}%</span>
              </div>
              {criterio.preguntaGuia.trim() ? (
                <p className="pregunta-descripcion">{criterio.preguntaGuia}</p>
              ) : null}
              {criterio.detalle.trim() ? (
                <p className="rubrica-criterio-detalle">{criterio.detalle}</p>
              ) : null}
            </div>
          </div>
          <div className="pregunta-lectura-cuerpo">
            <ul className="space-y-1">
              {evaluadores.map((evaluador) => {
                const nota = evaluador.notas.find((item) => item.criterioId === criterio.id)?.nota;
                const nivel =
                  nota == null ? null : nivelRubrica(criterio.explicaciones, nota);
                return (
                  <li key={evaluador.id} className="text-sm">
                    <strong>{evaluador.nombre}:</strong>{" "}
                    {nota == null ? "Pendiente" : etiquetaNivelRubrica(nota, nivel)}
                  </li>
                );
              })}
            </ul>
          </div>
        </article>
      ))}
      <div className="card space-y-3 p-4">
        <h3 className="font-bold text-navy">Nota final</h3>
        <ul className="space-y-1">
          {evaluadores.map((evaluador, index) => (
            <li key={evaluador.id} className="text-sm">
              <strong>{evaluador.nombre}:</strong>{" "}
              {formatearNotaRubrica(notasFinales[index]) || "Pendiente"}
            </li>
          ))}
        </ul>
        <p className="font-semibold text-navy">
          Promedio: {formatearNotaRubrica(promedio) || "Pendiente"}
        </p>
        <div className="space-y-3">
          <h4 className="font-semibold">Comentarios</h4>
          {evaluadores.map((evaluador) => (
            <div key={`${evaluador.id}-comentario`} className="space-y-1">
              <p className="text-sm font-semibold">{evaluador.nombre}</p>
              {evaluador.comentario.trim() ? (
                <TextoLargoVista html={htmlParaVistaComentario(evaluador.comentario)} />
              ) : (
                <p className="text-sm text-muted">Sin comentario.</p>
              )}
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted">Escala: {escala.join(", ")}</p>
    </div>
  );
}
