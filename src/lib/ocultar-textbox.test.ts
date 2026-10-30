import { describe, expect, it } from "vitest";
import { conOcultarTextbox, parseOcultarTextbox, validarValorRespuesta } from "@/lib/preguntas";

describe("ocultar textbox", () => {
  it("lee el flag en el JSON de opciones", () => {
    expect(parseOcultarTextbox("[]")).toBe(false);
    expect(parseOcultarTextbox(JSON.stringify({ ocultarTextbox: true }))).toBe(true);
    expect(parseOcultarTextbox(JSON.stringify({ maxCaracteres: 20, ocultarTextbox: true }))).toBe(
      true,
    );
  });

  it("agrega y quita el flag sin perder el resto de la config", () => {
    const conLimite = JSON.stringify({ maxCaracteres: 20, clave: "nombre_caso" });
    const conFlag = conOcultarTextbox(conLimite, true);
    expect(parseOcultarTextbox(conFlag)).toBe(true);
    expect(JSON.parse(conFlag)).toMatchObject({ maxCaracteres: 20, clave: "nombre_caso" });
    expect(JSON.parse(conOcultarTextbox(conFlag, false))).toEqual({
      maxCaracteres: 20,
      clave: "nombre_caso",
    });
  });

  it("envuelve un listado de opciones", () => {
    const conFlag = conOcultarTextbox(JSON.stringify(["A", "B"]), true);
    expect(JSON.parse(conFlag)).toEqual({ opciones: ["A", "B"], ocultarTextbox: true });
    expect(conOcultarTextbox(conFlag, false)).toBe(JSON.stringify(["A", "B"]));
  });

  it("no exige texto si el textbox está oculto", () => {
    expect(
      validarValorRespuesta({
        tipo: "texto_corto",
        opciones: JSON.stringify({ ocultarTextbox: true }),
        valor: "",
        obligatoria: true,
      }),
    ).toBeNull();
  });
});
