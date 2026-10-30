import { describe, expect, it } from "vitest";
import {
  estadoTrasPublicarEvaluacion,
  flagsRevisionDesdeCheckboxes,
  modoRevision,
  modoRevisionDeConvocatoria,
  puedeGuardarBorradorEvaluacion,
  publicaDirectoAlParticipante,
  supervisorActuaComoEvaluador,
  validarCambioRoles,
} from "@/lib/modo-revision";

describe("modoRevision", () => {
  it("clasifica las combinaciones de flags", () => {
    expect(modoRevision({ evaluadoresHabilitados: true, supervisoresHabilitados: true })).toBe("ambos");
    expect(modoRevision({ evaluadoresHabilitados: true, supervisoresHabilitados: false })).toBe(
      "solo_evaluadores",
    );
    expect(modoRevision({ evaluadoresHabilitados: false, supervisoresHabilitados: true })).toBe(
      "solo_supervisores",
    );
    expect(modoRevision({ evaluadoresHabilitados: false, supervisoresHabilitados: false })).toBe(
      "ninguno",
    );
  });

  it("trata contenido como sin revisión", () => {
    expect(
      modoRevisionDeConvocatoria({
        tipo: "CONTENIDO",
        evaluadoresHabilitados: true,
        supervisoresHabilitados: true,
      }),
    ).toBe("ninguno");
  });

  it("trata carga de información como sin revisión aunque los flags estén activos", () => {
    expect(
      modoRevisionDeConvocatoria({
        tipo: "CARGA_INFORMACION",
        evaluadoresHabilitados: true,
        supervisoresHabilitados: true,
      }),
    ).toBe("ninguno");
  });

  it("publica directo cuando falta un rol", () => {
    expect(publicaDirectoAlParticipante("ambos")).toBe(false);
    expect(publicaDirectoAlParticipante("solo_evaluadores")).toBe(true);
    expect(publicaDirectoAlParticipante("solo_supervisores")).toBe(true);
    expect(supervisorActuaComoEvaluador("solo_supervisores")).toBe(true);
    expect(puedeGuardarBorradorEvaluacion("SUPERVISOR", "solo_supervisores")).toBe(true);
    expect(puedeGuardarBorradorEvaluacion("SUPERVISOR", "ambos")).toBe(false);
    expect(puedeGuardarBorradorEvaluacion("EVALUADOR", "solo_supervisores")).toBe(false);
    expect(puedeGuardarBorradorEvaluacion("EVALUADOR", "ambos")).toBe(true);
    expect(supervisorActuaComoEvaluador("ambos")).toBe(false);
  });

  it("elige el estado correcto al publicar", () => {
    expect(estadoTrasPublicarEvaluacion("ambos", "OBSERVACIONES")).toBe("EN_SUPERVISION");
    expect(estadoTrasPublicarEvaluacion("ambos", "FINALIZAR")).toBe("EN_SUPERVISION");
    expect(estadoTrasPublicarEvaluacion("solo_evaluadores", "OBSERVACIONES")).toBe(
      "CON_OBSERVACIONES",
    );
    expect(estadoTrasPublicarEvaluacion("solo_supervisores", "FINALIZAR")).toBe("FINALIZADA");
  });
});

describe("flagsRevisionDesdeCheckboxes", () => {
  it("lee checkboxes ausentes como desmarcados", () => {
    const data = new FormData();
    data.set("evaluadoresHabilitados", "on");
    expect(flagsRevisionDesdeCheckboxes(data)).toEqual({
      evaluadoresHabilitados: true,
      supervisoresHabilitados: false,
    });
  });
});

describe("validarCambioRoles", () => {
  const ambos = { evaluadoresHabilitados: true, supervisoresHabilitados: true };
  const soloEval = { evaluadoresHabilitados: true, supervisoresHabilitados: false };

  it("rechaza apagar ambos roles", () => {
    const result = validarCambioRoles({
      actual: ambos,
      siguiente: { evaluadoresHabilitados: false, supervisoresHabilitados: false },
      conteos: { asignacionesEvaluador: 0, asignacionesSupervisor: 0 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("al menos");
  });

  it("permite cambiar si no hay asignaciones", () => {
    expect(
      validarCambioRoles({
        actual: ambos,
        siguiente: soloEval,
        conteos: { asignacionesEvaluador: 0, asignacionesSupervisor: 0 },
      }),
    ).toEqual({ ok: true });
  });

  it("bloquea el cambio si hay asignaciones", () => {
    const result = validarCambioRoles({
      actual: ambos,
      siguiente: soloEval,
      conteos: { asignacionesEvaluador: 2, asignacionesSupervisor: 1 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("2 asignaciones de evaluador");
      expect(result.error).toContain("1 asignación de supervisor");
    }
  });

  it("no bloquea si los flags no cambian", () => {
    expect(
      validarCambioRoles({
        actual: ambos,
        siguiente: ambos,
        conteos: { asignacionesEvaluador: 5, asignacionesSupervisor: 3 },
      }),
    ).toEqual({ ok: true });
  });
});
