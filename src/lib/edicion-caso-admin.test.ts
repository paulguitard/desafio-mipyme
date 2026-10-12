import { describe, expect, it } from "vitest";
import { planVersionEdicionAdmin } from "@/lib/edicion-caso-admin";

describe("planVersionEdicionAdmin", () => {
  it("omite cuando el contenido no cambió", () => {
    expect(
      planVersionEdicionAdmin({ contenidoIgual: true, cantidadVersiones: 2 }),
    ).toEqual({ accion: "omitir" });
  });

  it("solo actualiza la respuesta si nunca hubo versiones", () => {
    expect(
      planVersionEdicionAdmin({ contenidoIgual: false, cantidadVersiones: 0 }),
    ).toEqual({ accion: "solo_respuesta" });
  });

  it("reescribe la versión vigente cuando hay historial y cambió el contenido", () => {
    expect(
      planVersionEdicionAdmin({ contenidoIgual: false, cantidadVersiones: 3 }),
    ).toEqual({ accion: "reescribir_vigente" });
  });
});
