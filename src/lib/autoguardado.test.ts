import { describe, expect, it } from "vitest";
import {
  AUTOGUARDADO_INTERVALO_MS,
  decisionTickReloj,
  decisionTrasGuardado,
  debeIniciarReloj,
  debePersistirCampoRevision,
} from "@/lib/autoguardado";

describe("reloj de autoguardado", () => {
  it("usa un intervalo de 3 minutos", () => {
    expect(AUTOGUARDADO_INTERVALO_MS).toBe(180_000);
  });

  it("arranca el reloj solo con el primer cambio", () => {
    expect(debeIniciarReloj(false)).toBe(true);
    expect(debeIniciarReloj(true)).toBe(false);
  });

  it("en cada tick guarda si hay cambios y no hay petición en curso", () => {
    expect(decisionTickReloj({ sucio: true, enVuelo: false })).toEqual({
      guardar: true,
      detener: false,
    });
    expect(decisionTickReloj({ sucio: true, enVuelo: true })).toEqual({
      guardar: false,
      detener: false,
    });
    expect(decisionTickReloj({ sucio: false, enVuelo: false })).toEqual({
      guardar: false,
      detener: true,
    });
  });

  it("tras guardar mantiene el reloj si hubo cambios durante la petición", () => {
    expect(
      decisionTrasGuardado({ huboCambiosDuranteVuelo: true, timerActivo: true }),
    ).toEqual({ sucio: true, mantenerTimer: true });
    expect(
      decisionTrasGuardado({ huboCambiosDuranteVuelo: false, timerActivo: true }),
    ).toEqual({ sucio: false, mantenerTimer: false });
  });
});

describe("persistencia de revisión en borrador", () => {
  it("guarda comentario o nota aunque falte el veredicto", () => {
    expect(
      debePersistirCampoRevision({
        veredicto: "",
        comentario: "<p>hola</p>",
        nota: null,
        permitirSinVeredicto: true,
      }),
    ).toBe(true);
    expect(
      debePersistirCampoRevision({
        veredicto: "",
        comentario: "",
        nota: 4,
        permitirSinVeredicto: true,
      }),
    ).toBe(true);
  });

  it("no crea fila vacía sin veredicto, comentario ni nota", () => {
    expect(
      debePersistirCampoRevision({
        veredicto: "",
        comentario: "",
        nota: null,
        permitirSinVeredicto: true,
      }),
    ).toBe(false);
  });

  it("sin permitirSinVeredicto exige OK u OBSERVACION", () => {
    expect(
      debePersistirCampoRevision({
        veredicto: "",
        comentario: "<p>hola</p>",
        nota: 3,
        permitirSinVeredicto: false,
      }),
    ).toBe(false);
    expect(
      debePersistirCampoRevision({
        veredicto: "OK",
        comentario: "",
        nota: null,
        permitirSinVeredicto: false,
      }),
    ).toBe(true);
  });
});
