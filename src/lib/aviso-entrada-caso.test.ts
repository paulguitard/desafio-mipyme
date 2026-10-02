import { describe, expect, it } from "vitest";
import {
  avisoEntradaEvaluador,
  avisoEntradaParticipante,
  avisoEntradaSupervisor,
} from "./aviso-entrada-caso";

describe("avisoEntradaEvaluador", () => {
  it("pide revisar el historial cuando el participante ya corrigió", () => {
    const aviso = avisoEntradaEvaluador("REPARADA");
    expect(aviso.title).toBe("El participante ya corrigió");
    expect(aviso.parrafos[0]).toContain("historial de cada pregunta");
  });
});

describe("avisoEntradaSupervisor", () => {
  it("distingue finalizar de observaciones", () => {
    expect(avisoEntradaSupervisor("EN_SUPERVISION", "FINALIZAR").parrafos[0]).toContain(
      "pidió finalizar",
    );
    expect(avisoEntradaSupervisor("EN_SUPERVISION", "OBSERVACIONES").parrafos[0]).toContain(
      "envió observaciones",
    );
  });
});

describe("avisoEntradaParticipante", () => {
  it("explica las observaciones a corregir", () => {
    const aviso = avisoEntradaParticipante({
      estado: "CON_OBSERVACIONES",
      esCorreccion: true,
      canEdit: true,
      mentoriaAbierta: true,
    });
    expect(aviso.title).toContain("observaciones");
    expect(aviso.parrafos[0]).toContain("evaluador");
  });

  it("usa la descripción de la mentoría al completar el caso", () => {
    const aviso = avisoEntradaParticipante({
      estado: "BORRADOR",
      esCorreccion: false,
      canEdit: true,
      mentoriaAbierta: true,
      descripcionMentoria: "Texto de la ficha de la mentoría.",
    });
    expect(aviso.title).toBe("Completa tu caso");
    expect(aviso.parrafos).toEqual(["Texto de la ficha de la mentoría."]);
    expect(aviso.claseModal).toBe("modal-aviso-completa-caso");
  });
});
