import { describe, expect, it } from "vitest";
import {
  convocatoriaAbiertaParaPostular,
  convocatoriaDisponibleParaNuevosCasos,
  parseFechaForm,
  toDatetimeLocalValue,
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

describe("fechas de asesoría en hora de Chile", () => {
  it("interpreta datetime-local como America/Santiago en verano (UTC-3)", () => {
    const date = parseFechaForm("2026-10-02T07:23");
    expect(date?.toISOString()).toBe("2026-10-02T10:23:00.000Z");
    expect(toDatetimeLocalValue(date)).toBe("2026-10-02T07:23");
  });

  it("interpreta datetime-local como America/Santiago en invierno (UTC-4)", () => {
    const date = parseFechaForm("2026-06-15T07:23");
    expect(date?.toISOString()).toBe("2026-06-15T11:23:00.000Z");
    expect(toDatetimeLocalValue(date)).toBe("2026-06-15T07:23");
  });

  it("no desplaza la hora al roundtrip ISO → input → ISO", () => {
    const original = "2026-11-08T17:59";
    const saved = parseFechaForm(original);
    const shown = toDatetimeLocalValue(saved);
    const savedAgain = parseFechaForm(shown);
    expect(shown).toBe(original);
    expect(savedAgain?.toISOString()).toBe(saved?.toISOString());
  });
});
