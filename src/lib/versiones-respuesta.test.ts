import { describe, expect, it } from "vitest";
import {
  respuestasEquivalentes,
  valoresRespuestaEquivalentes,
  versionesDistintas,
} from "@/lib/versiones-respuesta";

const lorem =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

describe("versiones de respuesta", () => {
  it("trata el span vacío del editor como el mismo texto", () => {
    const guardado = JSON.stringify(`<p><span>${lorem}</span></p>`);
    const reenviado = JSON.stringify(`<p>${lorem}</p>`);
    expect(valoresRespuestaEquivalentes("texto_largo", guardado, reenviado)).toBe(true);
    expect(
      respuestasEquivalentes({
        tipo: "texto_largo",
        valorA: guardado,
        archivosA: "[]",
        valorB: reenviado,
        archivosB: "[]",
      }),
    ).toBe(true);
  });

  it("conserva un cambio real, como un destacado", () => {
    const antes = JSON.stringify(`<p><span>${lorem}</span></p>`);
    const despues = JSON.stringify(`<p>${lorem.slice(0, 20)}<mark>${lorem.slice(20)}</mark></p>`);
    expect(valoresRespuestaEquivalentes("texto_largo", antes, despues)).toBe(false);
  });

  it("no ignora un span con estilo ni un archivo distinto", () => {
    const plano = JSON.stringify(`<p>${lorem}</p>`);
    const conTamano = JSON.stringify(`<p><span style="font-size: 1.25rem">${lorem}</span></p>`);
    expect(valoresRespuestaEquivalentes("texto_largo", plano, conTamano)).toBe(false);
    expect(
      respuestasEquivalentes({
        tipo: "texto_largo",
        valorA: plano,
        archivosA: "[]",
        valorB: plano,
        archivosB: '[{"id":"1"}]',
      }),
    ).toBe(false);
  });

  it("oculta del historial las versiones cuyo contenido no cambió", () => {
    const vieja = {
      id: "v1",
      valor: JSON.stringify(`<p><span>${lorem}</span></p>`),
      archivos: "[]",
    };
    const ruido = {
      id: "v2",
      valor: JSON.stringify(`<p>${lorem}</p>`),
      archivos: "[]",
    };
    const editada = {
      id: "v3",
      valor: JSON.stringify(`<p><mark>${lorem}</mark></p>`),
      archivos: "[]",
    };
    expect(versionesDistintas([ruido, vieja], "texto_largo").map((item) => item.id)).toEqual(["v1"]);
    expect(versionesDistintas([editada, vieja], "texto_largo").map((item) => item.id)).toEqual([
      "v3",
      "v1",
    ]);
  });
});
