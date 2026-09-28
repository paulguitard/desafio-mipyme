import { describe, expect, it } from "vitest";
import { normalizarCorreo, normalizarValorCampoCorreo } from "@/lib/correo";
import { esCorreoValido, formatearValorPregunta, validarValorRespuesta } from "@/lib/preguntas";

describe("normalizarCorreo", () => {
  it("pasa a minúsculas y recorta espacios", () => {
    expect(normalizarCorreo("  Ana.Perez@AIEP.CL  ")).toBe("ana.perez@aiep.cl");
  });
});

describe("respuestas tipo correo", () => {
  it("acepta mayúsculas y las trata como minúsculas", () => {
    expect(esCorreoValido("Ana@AIEP.CL")).toBe(true);
    expect(formatearValorPregunta("correo", "Ana@AIEP.CL")).toBe("ana@aiep.cl");
    expect(formatearValorPregunta("correo", ["B@X.CL", " "])).toBe("b@x.cl");
    expect(
      validarValorRespuesta({
        tipo: "correo",
        opciones: JSON.stringify({ cantidadCorreos: 1 }),
        valor: "Ana@AIEP.CL",
        obligatoria: true,
      }),
    ).toBeNull();
    expect(normalizarValorCampoCorreo(["Ana@X.CL", ""])).toEqual(["ana@x.cl", ""]);
  });
});
