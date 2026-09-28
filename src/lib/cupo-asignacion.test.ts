import { describe, expect, it } from "vitest";
import { cupoAlcanzado, esEvaluacionObservada, mensajeCupoPersona } from "@/lib/cupo-asignacion";

describe("cupoAlcanzado", () => {
  it("0 es sin límite", () => {
    expect(cupoAlcanzado(0, 99)).toBe(false);
  });

  it("bloquea al llegar al máximo", () => {
    expect(cupoAlcanzado(2, 2)).toBe(true);
    expect(cupoAlcanzado(2, 1)).toBe(false);
  });
});

describe("esEvaluacionObservada", () => {
  it("marca los estados de observación", () => {
    expect(esEvaluacionObservada("CON_OBSERVACIONES")).toBe(true);
    expect(esEvaluacionObservada("REPARADA")).toBe(true);
    expect(esEvaluacionObservada("DEVUELTA_SUPERVISOR")).toBe(true);
    expect(esEvaluacionObservada("PENDIENTE")).toBe(false);
    expect(esEvaluacionObservada("FINALIZADA")).toBe(false);
  });
});

describe("mensajeCupoPersona", () => {
  it("usa singular y plural", () => {
    expect(mensajeCupoPersona("evaluador", 1, "Ana")).toContain("1 evaluación");
    expect(mensajeCupoPersona("evaluador", 3, "Ana")).toContain("3 evaluaciones");
  });
});
