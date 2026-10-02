import { describe, expect, it } from "vitest";
import {
  convocatoriaAbiertaParaPostular,
  convocatoriaDisponibleParaNuevosCasos,
} from "./convocatoria";

const abierta = {
  estado: "ABIERTA",
  fechaInicio: new Date("2020-01-01T00:00:00"),
  fechaCierre: new Date("2099-01-01T00:00:00"),
};

describe("convocatoriaDisponibleParaNuevosCasos", () => {
  it("sigue abierta si visible no viene o es true", () => {
    expect(convocatoriaDisponibleParaNuevosCasos(abierta)).toBe(true);
    expect(convocatoriaDisponibleParaNuevosCasos({ ...abierta, visible: true })).toBe(true);
  });

  it("no admite casos nuevos ni reel si está oculta, aunque siga ABIERTA", () => {
    expect(convocatoriaDisponibleParaNuevosCasos({ ...abierta, visible: false })).toBe(false);
    expect(convocatoriaAbiertaParaPostular({ ...abierta, visible: false } as typeof abierta)).toBe(
      true,
    );
  });
});
