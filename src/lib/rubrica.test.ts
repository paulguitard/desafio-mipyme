import { describe, expect, it } from "vitest";
import {
  etiquetaNivelRubrica,
  formatearNotaRubrica,
  notaPonderadaRubrica,
  parseEscalaRubrica,
  parseExplicacionesRubrica,
  promedioNotasRubrica,
  sumaPesosRubrica,
  validarRubrica,
} from "@/lib/rubrica";

const nivel = (titulo: string, detalle: string) => ({ titulo, detalle });

const criterio = (peso: number, extras?: Partial<Parameters<typeof validarRubrica>[0]["criterios"][0]>) => ({
  nombre: "Claridad",
  preguntaGuia: "¿Se entiende el pitch?",
  peso,
  explicaciones: {
    "1": nivel("Débil", "No cubre lo básico."),
    "2": nivel("Regular", "Cubre poco."),
    "3": nivel("Bueno", "Cubre lo esperado."),
    "4": nivel("Muy bueno", "Supera lo esperado."),
    "5": nivel("Excelente", "Destaca claramente."),
  },
  ...extras,
});

describe("parseEscalaRubrica", () => {
  it("ordena y descarta duplicados", () => {
    expect(parseEscalaRubrica([5, 1, 3, 3, 2, 4])).toEqual([1, 2, 3, 4, 5]);
  });

  it("cae a 1-5 si hay menos de dos valores", () => {
    expect(parseEscalaRubrica([3])).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("validarRubrica", () => {
  it("exige suma 100, nombre, pregunta guía y explicaciones", () => {
    expect(
      validarRubrica({
        escala: [1, 2, 3, 4, 5],
        criterios: [criterio(60), criterio(40, { nombre: "Impacto", preguntaGuia: "¿Convence?" })],
      }),
    ).toBeNull();
    expect(
      validarRubrica({
        escala: [1, 2, 3, 4, 5],
        criterios: [criterio(50), criterio(40, { nombre: "Impacto", preguntaGuia: "¿Convence?" })],
      }),
    ).toMatch(/suman 90%/);
    expect(
      validarRubrica({
        escala: [1, 2, 3, 4, 5],
        criterios: [criterio(100, { nombre: "" })],
      }),
    ).toMatch(/nombre/);
    expect(
      validarRubrica({
        escala: [1, 2, 3, 4, 5],
        criterios: [criterio(100, { explicaciones: { "1": nivel("a", "a"), "2": nivel("b", "b"), "3": nivel("c", "c"), "4": nivel("d", "d") } })],
      }),
    ).toMatch(/nota 5/);
    expect(
      validarRubrica({
        escala: [1, 2, 3, 4, 5],
        criterios: [
          criterio(100, {
            explicaciones: {
              "1": nivel("", "detalle"),
              "2": nivel("Regular", "d"),
              "3": nivel("Bueno", "d"),
              "4": nivel("Muy bueno", "d"),
              "5": nivel("Excelente", "d"),
            },
          }),
        ],
      }),
    ).toMatch(/título de la nota 1/);
  });
});

describe("parseExplicacionesRubrica", () => {
  it("acepta el formato viejo de solo texto como detalle", () => {
    expect(parseExplicacionesRubrica({ "1": "Débil" })).toEqual({
      "1": { titulo: "", detalle: "Débil" },
    });
  });

  it("lee título y detalle", () => {
    expect(parseExplicacionesRubrica({ "1": { titulo: "Débil", detalle: "No cubre." } })).toEqual({
      "1": { titulo: "Débil", detalle: "No cubre." },
    });
  });
});

describe("etiquetaNivelRubrica", () => {
  it("antepone el número al título", () => {
    expect(etiquetaNivelRubrica(2, { titulo: "Regular", detalle: "" })).toBe("2 · Regular");
    expect(etiquetaNivelRubrica(2, { titulo: "", detalle: "x" })).toBe("Nota 2");
  });
});

describe("notaPonderadaRubrica", () => {
  it("pondera por porcentaje", () => {
    expect(
      notaPonderadaRubrica([
        { peso: 50, nota: 4 },
        { peso: 50, nota: 2 },
      ]),
    ).toBe(3);
    expect(
      notaPonderadaRubrica([
        { peso: 70, nota: 5 },
        { peso: 30, nota: 1 },
      ]),
    ).toBeCloseTo(3.8);
  });

  it("devuelve null si falta una nota", () => {
    expect(notaPonderadaRubrica([{ peso: 100, nota: null }])).toBeNull();
  });
});

describe("promedioNotasRubrica", () => {
  it("solo aparece cuando todos finalizaron", () => {
    expect(promedioNotasRubrica({ notas: [3.6, 4.2], todosFinalizaron: false })).toBeNull();
    expect(promedioNotasRubrica({ notas: [3.6, 4.2], todosFinalizaron: true })).toBeCloseTo(3.9);
    expect(promedioNotasRubrica({ notas: [4], todosFinalizaron: true })).toBe(4);
  });
});

describe("formatearNotaRubrica", () => {
  it("usa un decimal con coma", () => {
    expect(formatearNotaRubrica(3.64)).toBe("3,6");
    expect(formatearNotaRubrica(4)).toBe("4,0");
  });
});

describe("sumaPesosRubrica", () => {
  it("suma enteros", () => {
    expect(sumaPesosRubrica([{ peso: 40 }, { peso: 60 }])).toBe(100);
  });
});
