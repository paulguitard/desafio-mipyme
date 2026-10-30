"use client";

import {
  criterioRubricaVacio,
  ESCALA_RUBRICA_1_A_4,
  ESCALA_RUBRICA_1_A_5,
  nivelRubrica,
  parseEscalaRubrica,
  sumaPesosRubrica,
  type CriterioRubricaDatos,
  type ExplicacionesRubrica,
  type RubricaDatos,
} from "@/lib/rubrica";

const btnIcono =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-navy hover:bg-slate-50 disabled:opacity-40";

function IconoSubir() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
      <path fill="currentColor" d="M10 4.5 4.5 10h3.5v5.5h4V10h3.5L10 4.5Z" />
    </svg>
  );
}

function IconoBajar() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
      <path fill="currentColor" d="M10 15.5 15.5 10h-3.5V4.5h-4V10H4.5L10 15.5Z" />
    </svg>
  );
}

function IconoEliminar() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 4.5h6l.5 1H16v1.5H4V5.5h2.5L7 4.5Zm1 4v6h1.5v-6H8Zm3.5 0v6H13v-6h-1.5ZM6.5 16.5h7c.8 0 1.5-.7 1.5-1.5V7H5v8c0 .8.7 1.5 1.5 1.5Z"
      />
    </svg>
  );
}

function mismaEscala(a: number[], b: readonly number[]) {
  return a.length === b.length && a.every((valor, i) => valor === b[i]);
}

function adaptarExplicaciones(prev: ExplicacionesRubrica, escala: number[]): ExplicacionesRubrica {
  return Object.fromEntries(
    escala.map((valor) => [String(valor), nivelRubrica(prev, valor)]),
  );
}

export function RubricaEditor({
  value,
  estructuraBloqueada,
  onChange,
}: {
  value: RubricaDatos;
  estructuraBloqueada: boolean;
  onChange: (siguiente: RubricaDatos) => void;
}) {
  const escala = parseEscalaRubrica(value.escala);
  const suma = sumaPesosRubrica(value.criterios);
  const sumaOk = suma === 100;

  function setEscala(siguiente: number[]) {
    if (estructuraBloqueada) return;
    const parsed = parseEscalaRubrica(siguiente);
    onChange({
      escala: parsed,
      criterios: value.criterios.map((criterio) => ({
        ...criterio,
        explicaciones: adaptarExplicaciones(criterio.explicaciones, parsed),
      })),
    });
  }

  function actualizarCriterio(id: string, parche: Partial<CriterioRubricaDatos>) {
    onChange({
      ...value,
      criterios: value.criterios.map((criterio) =>
        criterio.id === id ? { ...criterio, ...parche } : criterio,
      ),
    });
  }

  function agregarCriterio() {
    if (estructuraBloqueada) return;
    onChange({
      ...value,
      criterios: [
        ...value.criterios,
        criterioRubricaVacio(value.criterios.length + 1, escala),
      ],
    });
  }

  function mover(id: string, direccion: "up" | "down") {
    if (estructuraBloqueada) return;
    const index = value.criterios.findIndex((item) => item.id === id);
    const swap = direccion === "up" ? index - 1 : index + 1;
    if (index < 0 || swap < 0 || swap >= value.criterios.length) return;
    const criterios = [...value.criterios];
    [criterios[index], criterios[swap]] = [criterios[swap], criterios[index]];
    onChange({
      ...value,
      criterios: criterios.map((item, i) => ({ ...item, orden: i + 1 })),
    });
  }

  function eliminar(id: string) {
    if (estructuraBloqueada) return;
    onChange({
      ...value,
      criterios: value.criterios
        .filter((item) => item.id !== id)
        .map((item, i) => ({ ...item, orden: i + 1 })),
    });
  }

  return (
    <section className="rubrica-editor space-y-4 rounded-2xl border border-border bg-white p-4">
      <div>
        <h2 className="text-xl font-bold text-navy">Rúbrica de evaluación</h2>
        <p className="text-sm text-muted">
          El participante responde el caso. Esta rúbrica es el instrumento de los evaluadores.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-navy">Escala de notas</p>
        <div className="flex flex-wrap gap-2">
          <button
            className={`btn btn-sm ${mismaEscala(escala, ESCALA_RUBRICA_1_A_4) ? "btn-primary" : "btn-secondary"}`}
            type="button"
            disabled={estructuraBloqueada}
            onClick={() => setEscala([...ESCALA_RUBRICA_1_A_4])}
          >
            1 a 4
          </button>
          <button
            className={`btn btn-sm ${mismaEscala(escala, ESCALA_RUBRICA_1_A_5) ? "btn-primary" : "btn-secondary"}`}
            type="button"
            disabled={estructuraBloqueada}
            onClick={() => setEscala([...ESCALA_RUBRICA_1_A_5])}
          >
            1 a 5
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="field min-w-32">
            <span>Desde</span>
            <input
              className="input w-24"
              type="number"
              min={1}
              max={19}
              disabled={estructuraBloqueada}
              value={escala[0] ?? 1}
              onChange={(event) => {
                const min = Math.max(1, Number(event.target.value) || 1);
                const max = escala[escala.length - 1] ?? min + 1;
                const siguiente = [];
                for (let n = min; n <= Math.max(min + 1, max); n += 1) siguiente.push(n);
                setEscala(siguiente);
              }}
            />
          </label>
          <label className="field min-w-32">
            <span>Hasta</span>
            <input
              className="input w-24"
              type="number"
              min={2}
              max={20}
              disabled={estructuraBloqueada}
              value={escala[escala.length - 1] ?? 5}
              onChange={(event) => {
                const max = Math.max(2, Number(event.target.value) || 2);
                const min = escala[0] ?? 1;
                const desde = Math.min(min, max - 1);
                const siguiente = [];
                for (let n = desde; n <= max; n += 1) siguiente.push(n);
                setEscala(siguiente);
              }}
            />
          </label>
          <p className="text-sm text-muted">Notas: {escala.join(", ")}</p>
        </div>
        {estructuraBloqueada ? (
          <p className="text-sm text-muted">
            Ya hay evaluaciones con esta rúbrica. La escala, los pesos y el orden de los criterios
            quedan fijos. Puedes corregir los textos.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-sm font-semibold ${sumaOk ? "text-navy" : "text-danger"}`}>
          Pesos: {suma}% de 100%
        </p>
        <button
          className="btn btn-sm btn-secondary"
          type="button"
          disabled={estructuraBloqueada}
          onClick={agregarCriterio}
        >
          Agregar criterio
        </button>
      </div>

      <div className="space-y-4">
        {value.criterios.length === 0 ? (
          <p className="text-sm text-muted">Aún no hay criterios.</p>
        ) : null}
        {value.criterios.map((criterio, index) => (
          <article key={criterio.id} className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-semibold text-navy">Criterio {index + 1}</p>
              <div className="flex gap-1">
                <button
                  className={btnIcono}
                  type="button"
                  aria-label="Subir"
                  disabled={estructuraBloqueada || index === 0}
                  onClick={() => mover(criterio.id, "up")}
                >
                  <IconoSubir />
                </button>
                <button
                  className={btnIcono}
                  type="button"
                  aria-label="Bajar"
                  disabled={estructuraBloqueada || index === value.criterios.length - 1}
                  onClick={() => mover(criterio.id, "down")}
                >
                  <IconoBajar />
                </button>
                <button
                  className={btnIcono}
                  type="button"
                  aria-label="Eliminar"
                  disabled={estructuraBloqueada}
                  onClick={() => eliminar(criterio.id)}
                >
                  <IconoEliminar />
                </button>
              </div>
            </div>
            <label className="field">
              <span>Nombre</span>
              <input
                className="input"
                value={criterio.nombre}
                onChange={(event) => actualizarCriterio(criterio.id, { nombre: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Pregunta guía</span>
              <input
                className="input"
                value={criterio.preguntaGuia}
                onChange={(event) =>
                  actualizarCriterio(criterio.id, { preguntaGuia: event.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Detalle adicional</span>
              <textarea
                className="input"
                rows={2}
                value={criterio.detalle}
                onChange={(event) => actualizarCriterio(criterio.id, { detalle: event.target.value })}
              />
            </label>
            <label className="field max-w-40">
              <span>Peso relativo (%)</span>
              <input
                className="input"
                type="number"
                min={1}
                max={100}
                disabled={estructuraBloqueada}
                value={criterio.peso || ""}
                onChange={(event) =>
                  actualizarCriterio(criterio.id, { peso: Math.floor(Number(event.target.value) || 0) })
                }
              />
            </label>
            <div className="space-y-3">
              <p className="text-sm font-semibold">Qué conlleva cada nota</p>
              {escala.map((valor) => {
                const nivel = nivelRubrica(criterio.explicaciones, valor);
                return (
                  <div key={valor} className="space-y-2 rounded-xl border border-border p-3">
                    <p className="font-semibold text-navy">Nota {valor}</p>
                    <label className="field">
                      <span>Título</span>
                      <input
                        className="input"
                        value={nivel.titulo}
                        placeholder="Ej. Insuficiente"
                        onChange={(event) =>
                          actualizarCriterio(criterio.id, {
                            explicaciones: {
                              ...criterio.explicaciones,
                              [String(valor)]: { ...nivel, titulo: event.target.value },
                            },
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Qué conlleva</span>
                      <textarea
                        className="input"
                        rows={2}
                        value={nivel.detalle}
                        onChange={(event) =>
                          actualizarCriterio(criterio.id, {
                            explicaciones: {
                              ...criterio.explicaciones,
                              [String(valor)]: { ...nivel, detalle: event.target.value },
                            },
                          })
                        }
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
