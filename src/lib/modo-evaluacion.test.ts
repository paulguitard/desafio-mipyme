import { describe, expect, it } from "vitest";
import {
  modoEvaluacionAlCrear,
  parseModoEvaluacion,
  puedeAsignarModoEvaluacion,
} from "@/lib/modo-evaluacion";

describe("modoEvaluacionAlCrear", () => {
  it("fuerza GENERAL si el tipo por pregunta está desactivado", () => {
    expect(modoEvaluacionAlCrear("POR_PREGUNTA", false)).toBe("GENERAL");
    expect(modoEvaluacionAlCrear("", false)).toBe("GENERAL");
  });

  it("respeta el valor si el tipo por pregunta está activo", () => {
    expect(modoEvaluacionAlCrear("POR_PREGUNTA", true)).toBe("POR_PREGUNTA");
    expect(modoEvaluacionAlCrear("GENERAL", true)).toBe("GENERAL");
  });
});

describe("puedeAsignarModoEvaluacion", () => {
  it("no deja pasar a POR_PREGUNTA si está desactivado, salvo que el formulario ya lo sea", () => {
    expect(puedeAsignarModoEvaluacion("POR_PREGUNTA", false)).toBe(false);
    expect(puedeAsignarModoEvaluacion("POR_PREGUNTA", false, "GENERAL")).toBe(false);
    expect(puedeAsignarModoEvaluacion("POR_PREGUNTA", false, "POR_PREGUNTA")).toBe(true);
    expect(puedeAsignarModoEvaluacion("GENERAL", false)).toBe(true);
    expect(puedeAsignarModoEvaluacion("POR_PREGUNTA", true)).toBe(true);
  });
});

describe("parseModoEvaluacion", () => {
  it("cae a POR_PREGUNTA si el valor no es válido", () => {
    expect(parseModoEvaluacion("")).toBe("POR_PREGUNTA");
    expect(parseModoEvaluacion("GENERAL")).toBe("GENERAL");
  });
});
