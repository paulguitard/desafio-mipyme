import { describe, expect, it } from "vitest";
import { filasExcelLinks } from "@/lib/excel-links";

const base = {
  emprendedorNombre: "Ana Pérez",
  emprendedorEmail: "ana@aiep.cl",
  nombreCaso: "Clínica Acorpus",
  respuestas: [] as { preguntaId: string; valor: string }[],
};

describe("filasExcelLinks", () => {
  it("incluye el estado de la respuesta del caso", () => {
    const filas = filasExcelLinks(
      [
        {
          ...base,
          estado: "EN_EVALUACION",
          enviadaAt: "2026-01-01",
          tokenPublico: "abcdefghijklmnopqrstuvwx",
          asignaciones: [{ evaluadorId: "e", estado: "REPARADA" }],
        },
        {
          ...base,
          emprendedorNombre: "Luis",
          nombreCaso: "",
          estado: "FINALIZADA",
          enviadaAt: "2026-01-01",
          tokenPublico: null,
          asignaciones: [{ evaluadorId: "e", estado: "FINALIZADA" }],
        },
      ],
      "https://ejemplo.cl",
      [],
    );

    expect(filas[0]).toEqual(["Nombre del caso", "Participante", "Correo", "Estado", "Link"]);
    expect(filas[1]).toEqual([
      "Clínica Acorpus",
      "Ana Pérez",
      "ana@aiep.cl",
      "Esperando evaluación",
      "https://ejemplo.cl/ficha/abcdefghijklmnopqrstuvwx",
    ]);
    expect(filas[2]?.[0]).toBe("Sin nombre");
    expect(filas[2]?.[3]).toBe("Completa");
    expect(filas[2]?.[4]).toBe("");
  });
});
