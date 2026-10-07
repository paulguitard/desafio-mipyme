import { describe, expect, it } from "vitest";
import {
  MENSAJE_COMENTARIO_VEREDICTO,
  MENSAJE_SELECCION_VEREDICTO,
  mensajeVeredictosIncompletos,
} from "@/lib/veredicto-seleccion";

describe("mensajeVeredictosIncompletos", () => {
  it("pide seleccionar una opción si el veredicto está vacío", () => {
    expect(mensajeVeredictosIncompletos([{ veredicto: "", comentario: "" }])).toBe(
      MENSAJE_SELECCION_VEREDICTO,
    );
  });

  it("pide el comentario si se eligió comentar observaciones sin texto", () => {
    expect(
      mensajeVeredictosIncompletos([{ veredicto: "OBSERVACION", comentario: "   " }]),
    ).toBe(MENSAJE_COMENTARIO_VEREDICTO);
  });

  it("junta ambos avisos si hay preguntas en distinto estado", () => {
    expect(
      mensajeVeredictosIncompletos([
        { veredicto: "", comentario: "" },
        { veredicto: "OBSERVACION", comentario: "" },
        { veredicto: "OK", comentario: "" },
      ]),
    ).toBe(`${MENSAJE_SELECCION_VEREDICTO} ${MENSAJE_COMENTARIO_VEREDICTO}`);
  });

  it("acepta sin observaciones o un comentario escrito", () => {
    expect(
      mensajeVeredictosIncompletos([
        { veredicto: "OK", comentario: "" },
        { veredicto: "OBSERVACION", comentario: "Falta el monto" },
      ]),
    ).toBeNull();
  });
});
