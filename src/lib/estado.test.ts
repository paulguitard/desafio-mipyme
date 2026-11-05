import { describe, expect, it } from "vitest";
import { casoPuedeFinalizarseAdmin, derivarEstadoPostulacion } from "@/lib/estado";

describe("casoPuedeFinalizarseAdmin", () => {
  it("permite cerrar cuando hay evaluaciones abiertas", () => {
    expect(casoPuedeFinalizarseAdmin([{ estado: "CON_OBSERVACIONES" }])).toBe(true);
    expect(
      casoPuedeFinalizarseAdmin([{ estado: "FINALIZADA" }, { estado: "EN_REVISION" }]),
    ).toBe(true);
  });

  it("no permite cerrar si no hay evaluaciones o ya están finalizadas", () => {
    expect(casoPuedeFinalizarseAdmin([])).toBe(false);
    expect(casoPuedeFinalizarseAdmin([{ estado: "FINALIZADA" }])).toBe(false);
  });
});

describe("derivarEstadoPostulacion tras finalizar admin", () => {
  it("deja la postulación finalizada cuando todas las asignaciones se cierran", () => {
    expect(
      derivarEstadoPostulacion({
        enviadaAt: new Date("2026-01-01"),
        asignaciones: [{ estado: "FINALIZADA" }, { estado: "FINALIZADA" }],
      }),
    ).toBe("FINALIZADA");
  });
});
