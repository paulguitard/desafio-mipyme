import { describe, expect, it } from "vitest";
import {
  coincideRevisionCiclo,
  historialEvaluacion,
  historialEvaluacionParticipante,
  ordenHistorialRevision,
  revisionesParaParticipante,
  revisionParaEditar,
  revisionVigente,
  textoEsperaRevision,
  ultimasVersionesPorRonda,
} from "@/lib/revision-ciclo";

const items = [
  { id: "a", ronda: 1, ciclo: 1, veredicto: "OBSERVACION", comentario: "vieja" },
  { id: "b", ronda: 1, ciclo: 2, veredicto: "OK", comentario: "" },
];

describe("revision de ciclo", () => {
  it("solo considera vigente la evaluación del ciclo actual", () => {
    expect(revisionVigente(items, 1, 2)?.id).toBe("b");
    expect(revisionVigente(items, 1, 1)?.id).toBe("a");
    expect(revisionVigente(items, 1, 3)).toBeUndefined();
    expect(coincideRevisionCiclo({ ronda: 1, ciclo: 2 }, 1, 2)).toBe(true);
    expect(coincideRevisionCiclo({ ronda: 1, ciclo: 1 }, 1, 2)).toBe(false);
  });

  it("rellena el formulario del ciclo nuevo con la versión anterior de la ronda", () => {
    expect(revisionParaEditar(items, 1, 3)?.id).toBe("b");
    expect(revisionParaEditar(items, 1, 2)?.id).toBe("b");
  });

  it("etiqueta el historial como las supervisiones, por ronda y ciclo", () => {
    const historial = historialEvaluacion(
      items.map((item) => ({ ...item, createdAt: "2026-09-22T00:00:00.000Z" })),
    );
    expect(historial.map((item) => item.etiqueta)).toEqual([
      "Evaluación (ronda 1 · ciclo 1)",
      "Evaluación (ronda 1 · ciclo 2)",
    ]);
    expect([...historial].sort(ordenHistorialRevision).map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("explica la espera de evaluación o supervisión con el nombre", () => {
    expect(textoEsperaRevision("evaluacion", "Evaluador")).toBe("Esperando evaluación de Evaluador");
    expect(textoEsperaRevision("supervision", "Supervisor")).toBe(
      "Esperando supervisión de Supervisor",
    );
    expect(textoEsperaRevision("evaluacion")).toBe("Esperando evaluación");
  });

  it("deja al participante solo la última versión de cada ciclo evaluación-supervisión", () => {
    const historial = [
      { id: "r1c1", ronda: 1, ciclo: 1 },
      { id: "r1c2", ronda: 1, ciclo: 2 },
      { id: "r2c1", ronda: 2, ciclo: 1 },
      { id: "r2c2", ronda: 2, ciclo: 2 },
    ];
    expect(ultimasVersionesPorRonda(historial).map((item) => item.id)).toEqual(["r1c2", "r2c2"]);
    expect(
      revisionesParaParticipante(historial, { estado: "EN_SUPERVISION", rondaActual: 2 }).map(
        (item) => item.id,
      ),
    ).toEqual(["r1c2"]);
    expect(
      revisionesParaParticipante(historial, { estado: "CON_OBSERVACIONES", rondaActual: 2 }).map(
        (item) => item.id,
      ),
    ).toEqual(["r1c2", "r2c2"]);
    expect(
      revisionesParaParticipante(
        historial.filter((item) => item.ronda === 1),
        { estado: "REPARADA", rondaActual: 2 },
      ).map((item) => item.id),
    ).toEqual(["r1c2"]);
    expect(
      historialEvaluacionParticipante(
        [
          {
            id: "r1c2",
            ronda: 1,
            ciclo: 2,
            veredicto: "OBSERVACION",
            comentario: "corrige",
            createdAt: "2026-09-22T00:00:00.000Z",
          },
        ],
      ).map((item) => item.etiqueta),
    ).toEqual(["Evaluación (ronda 1)"]);
  });
});
