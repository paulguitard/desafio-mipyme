import { describe, expect, it } from "vitest";
import {
  avisoEntradaEvaluador,
  avisoEntradaParticipante,
  avisoEntradaSupervisor,
  reabrirAvisoEntrada,
} from "./aviso-entrada-caso";

describe("reabrirAvisoEntrada", () => {
  it("no reabre si el caso sigue en la misma ruta después de enviar", () => {
    expect(
      reabrirAvisoEntrada("/evaluador/supervision/1", "/evaluador/supervision/1"),
    ).toBe(false);
  });

  it("reabre al entrar a otra ruta", () => {
    expect(reabrirAvisoEntrada("/evaluador/evaluaciones/2", "/evaluador/evaluaciones/1")).toBe(
      true,
    );
  });
});

describe("avisoEntradaEvaluador", () => {
  it("pide revisar el historial cuando el participante ya corrigió", () => {
    const aviso = avisoEntradaEvaluador("REPARADA");
    expect(aviso.title).toBe("El participante ya corrigió");
    expect(aviso.parrafos[0]).toContain("qué cambió");
    expect(aviso.pasos?.join(" ")).toContain("Modificada");
  });

  it("explica dónde leer las observaciones del supervisor", () => {
    const aviso = avisoEntradaEvaluador("DEVUELTA_SUPERVISOR");
    expect(aviso.parrafos[0]).toContain("observaciones del supervisor");
    expect(aviso.pasos?.join(" ")).toContain("Evaluación y Supervisión");
  });

  it.each([
    "PENDIENTE",
    "EN_REVISION",
    "EN_SUPERVISION",
    "DEVUELTA_SUPERVISOR",
    "CON_OBSERVACIONES",
    "REPARADA",
    "FINALIZADA",
  ])("tiene título y texto en %s", (estado) => {
    const aviso = avisoEntradaEvaluador(estado);
    expect(aviso.title.trim().length).toBeGreaterThan(0);
    expect(aviso.parrafos.every((parrafo) => parrafo.trim().length > 0)).toBe(true);
  });
});

describe("avisoEntradaSupervisor", () => {
  it("distingue finalizar de observaciones", () => {
    expect(avisoEntradaSupervisor("EN_SUPERVISION", "FINALIZAR").parrafos[0]).toContain(
      "pidió cerrar",
    );
    expect(avisoEntradaSupervisor("EN_SUPERVISION", "OBSERVACIONES").parrafos[0]).toContain(
      "envió observaciones",
    );
    expect(avisoEntradaSupervisor("EN_SUPERVISION", "FINALIZAR").pasos?.join(" ")).toContain(
      "Proceder cierra",
    );
    expect(avisoEntradaSupervisor("EN_SUPERVISION", "OBSERVACIONES").pasos?.join(" ")).toContain(
      "llegan al participante",
    );
  });

  it.each(["EN_SUPERVISION", "DEVUELTA_SUPERVISOR", "FINALIZADA", "PENDIENTE"])(
    "tiene título y texto en %s",
    (estado) => {
      const aviso = avisoEntradaSupervisor(estado, "OBSERVACIONES");
      expect(aviso.title.trim().length).toBeGreaterThan(0);
      expect(aviso.parrafos.every((parrafo) => parrafo.trim().length > 0)).toBe(true);
    },
  );
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
    expect(aviso.pasos?.join(" ")).toContain("Tu caso");
    expect(aviso.pasos?.join(" ")).toContain("Enviar correcciones");
  });

  it("usa la descripción de la asesoría al completar el caso", () => {
    const aviso = avisoEntradaParticipante({
      estado: "BORRADOR",
      esCorreccion: false,
      canEdit: true,
      mentoriaAbierta: true,
      descripcionMentoria: "Texto de la ficha de la asesoría.",
    });
    expect(aviso.title).toBe("Completa tu caso");
    expect(aviso.parrafos).toEqual(["Texto de la ficha de la asesoría."]);
    expect(aviso.claseModal).toBe("modal-aviso-completa-caso");
  });

  it.each(["BORRADOR", "ENVIADA", "EN_EVALUACION", "REPARADA_POR_EL_EMPRENDEDOR"] as const)(
    "explica el paso cuando el caso está %s",
    (estado) => {
      const aviso = avisoEntradaParticipante({
        estado,
        esCorreccion: false,
        canEdit: estado === "BORRADOR",
        mentoriaAbierta: true,
        descripcionMentoria: "Descripción de la asesoría.",
      });
      expect(aviso.title.trim().length).toBeGreaterThan(0);
      expect(aviso.parrafos.length).toBeGreaterThan(0);
    },
  );

  it("explica los paneles después de enviar correcciones", () => {
    const aviso = avisoEntradaParticipante({
      estado: "REPARADA_POR_EL_EMPRENDEDOR",
      esCorreccion: false,
      canEdit: false,
      mentoriaAbierta: true,
      conEvaluacionVisible: true,
    });
    expect(aviso.title).toBe("Ya enviaste tus correcciones");
    expect(aviso.parrafos[0]).toContain("evaluador");
    expect(aviso.pasos?.join(" ")).toContain("Evaluación");
    expect(aviso.pasos?.join(" ")).toContain("Modificada");
  });

  it("felicita cuando el caso quedó aprobado y finalizado", () => {
    const aviso = avisoEntradaParticipante({
      estado: "FINALIZADA",
      esCorreccion: false,
      canEdit: false,
      mentoriaAbierta: false,
    });
    expect(aviso.title).toBe("Tu caso fue aprobado");
    expect(aviso.parrafos[0]).toContain("Felicidades");
    expect(aviso.parrafos[0]).toContain("siguientes pasos");
  });
});
