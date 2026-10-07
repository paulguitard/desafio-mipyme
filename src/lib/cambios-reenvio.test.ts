import { describe, expect, it } from "vitest";
import { preguntasModificadasEnUltimoEnvio } from "@/lib/cambios-reenvio";

const lorem =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

const tEnvio = "2026-01-01T00:00:00.000Z";
const tObservacion = "2026-01-02T00:00:00.000Z";
const tReenvio = "2026-01-03T00:00:00.000Z";
const tObservacion2 = "2026-01-04T00:00:00.000Z";
const tReenvio2 = "2026-01-05T00:00:00.000Z";

function version(id: string, createdAt: string, valor = JSON.stringify(`<p>${lorem}</p>`)) {
  return { id, valor, archivos: "[]", createdAt };
}

describe("preguntas modificadas en el último envío", () => {
  it("no marca el primer envío", () => {
    expect(
      preguntasModificadasEnUltimoEnvio({
        respuestas: [
          {
            preguntaId: "p1",
            tipo: "texto_largo",
            versiones: [version("v1", tEnvio)],
          },
        ],
        asignaciones: [{ rondaActual: 1, revisiones: [{ ronda: 1, createdAt: tObservacion }] }],
      }),
    ).toEqual([]);
  });

  it("marca solo la pregunta que cambió al responder la observación", () => {
    expect(
      preguntasModificadasEnUltimoEnvio({
        respuestas: [
          {
            preguntaId: "p1",
            tipo: "texto_largo",
            versiones: [
              version("v2", tReenvio, JSON.stringify(`<p><mark>${lorem}</mark></p>`)),
              version("v1", tEnvio),
            ],
          },
          {
            preguntaId: "p2",
            tipo: "texto_largo",
            versiones: [version("v1", tEnvio)],
          },
        ],
        asignaciones: [{ rondaActual: 2, revisiones: [{ ronda: 1, createdAt: tObservacion }] }],
      }),
    ).toEqual(["p1"]);
  });

  it("ignora un reenvío que no cambió el texto", () => {
    const conSpan = JSON.stringify(`<p><span>${lorem}</span></p>`);
    expect(
      preguntasModificadasEnUltimoEnvio({
        respuestas: [
          {
            preguntaId: "p1",
            tipo: "texto_largo",
            versiones: [version("v2", tReenvio, conSpan), version("v1", tEnvio)],
          },
        ],
        asignaciones: [{ rondaActual: 2, revisiones: [{ ronda: 1, createdAt: tObservacion }] }],
      }),
    ).toEqual([]);
  });

  it("en la ronda siguiente solo deja la pregunta tocada en ese envío", () => {
    expect(
      preguntasModificadasEnUltimoEnvio({
        respuestas: [
          {
            preguntaId: "p1",
            tipo: "texto_corto",
            versiones: [
              version("v2", tReenvio, JSON.stringify("antes")),
              version("v1", tEnvio, JSON.stringify("origen")),
            ],
          },
          {
            preguntaId: "p2",
            tipo: "texto_corto",
            versiones: [
              version("v2", tReenvio2, JSON.stringify("ahora")),
              version("v1", tEnvio, JSON.stringify("origen")),
            ],
          },
        ],
        asignaciones: [
          {
            rondaActual: 3,
            revisiones: [
              { ronda: 1, createdAt: tObservacion },
              { ronda: 2, createdAt: tObservacion2 },
            ],
          },
        ],
      }),
    ).toEqual(["p2"]);
  });

  it("toma el corte de la observación respondida más reciente entre evaluadores", () => {
    expect(
      preguntasModificadasEnUltimoEnvio({
        respuestas: [
          {
            preguntaId: "p1",
            tipo: "texto_corto",
            versiones: [
              version("v2", tReenvio, JSON.stringify("medio")),
              version("v1", tEnvio, JSON.stringify("origen")),
            ],
          },
        ],
        asignaciones: [
          { rondaActual: 2, revisiones: [{ ronda: 1, createdAt: tObservacion }] },
          { rondaActual: 3, revisiones: [{ ronda: 2, createdAt: tObservacion2 }] },
        ],
      }),
    ).toEqual([]);
  });
});
