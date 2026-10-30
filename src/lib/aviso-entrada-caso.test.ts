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

  it("en rúbrica no habla de observaciones ni de Modificada", () => {
    const aviso = avisoEntradaEvaluador("PENDIENTE", { esRubrica: true, publicaDirecto: true });
    const texto = [aviso.title, ...aviso.parrafos, ...(aviso.pasos ?? [])].join(" ");
    expect(texto).toContain("rúbrica");
    expect(texto).toContain("no verá estas notas");
    expect(texto).toContain("no podrá modificar");
    expect(texto).not.toMatch(/por ahora/i);
    expect(texto).not.toMatch(/Modificada/);
    expect(texto).not.toMatch(/observaciones/i);
    expect(texto).not.toMatch(/Pedir cambios/i);
  });

  it("en rúbrica finalizada no pide abrir Modificada", () => {
    const aviso = avisoEntradaEvaluador("FINALIZADA", { esRubrica: true });
    const texto = [aviso.title, ...aviso.parrafos, ...(aviso.pasos ?? [])].join(" ");
    expect(aviso.title).toBe("Evaluación finalizada");
    expect(texto).not.toMatch(/Modificada/);
    expect(texto).not.toMatch(/observaciones/i);
  });
});

describe("avisoEntradaSupervisor", () => {
  it("distingue finalizar de observaciones", () => {
    expect(avisoEntradaSupervisor("EN_SUPERVISION", "FINALIZAR").parrafos[0]).toContain(
      "pidió finalizar",
    );
    expect(avisoEntradaSupervisor("EN_SUPERVISION", "OBSERVACIONES").parrafos[0]).toContain(
      "pidió cambios al participante",
    );
    expect(avisoEntradaSupervisor("EN_SUPERVISION", "FINALIZAR").pasos?.join(" ")).toContain(
      "Aprobar aplica",
    );
    expect(avisoEntradaSupervisor("EN_SUPERVISION", "OBSERVACIONES").pasos?.join(" ")).toContain(
      "Pedir cambios al evaluador",
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

  it("pide completar la información en una carga editable", () => {
    const aviso = avisoEntradaParticipante({
      estado: "BORRADOR",
      esCorreccion: false,
      canEdit: true,
      mentoriaAbierta: true,
      descripcionMentoria: "Entrega los documentos de la asesoría.",
      procesoTerminaAlEnviar: true,
    });
    expect(aviso.title).toBe("Completa la información");
    expect(aviso.parrafos).toEqual(["Entrega los documentos de la asesoría."]);
  });

  it("explica que la carga de información queda bloqueada al enviar", () => {
    const aviso = avisoEntradaParticipante({
      estado: "ENVIADA",
      esCorreccion: false,
      canEdit: false,
      mentoriaAbierta: true,
      procesoTerminaAlEnviar: true,
    });
    expect(aviso.title).toBe("Información enviada");
    expect(aviso.parrafos[0]).toContain("ya no puedes editarla");
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

  it("en rúbrica no promete observaciones ni Modificada", () => {
    const enviado = avisoEntradaParticipante({
      estado: "EN_EVALUACION",
      esCorreccion: false,
      canEdit: false,
      mentoriaAbierta: true,
      esRubrica: true,
    });
    expect(enviado.title).toBe("Caso enviado");
    expect(enviado.parrafos[0]).toContain("No podrás modificarlo");
    expect(enviado.parrafos.join(" ")).not.toMatch(/observaciones/i);
    expect(enviado.pasos).toBeUndefined();

    const finalizado = avisoEntradaParticipante({
      estado: "FINALIZADA",
      esCorreccion: false,
      canEdit: false,
      mentoriaAbierta: false,
      esRubrica: true,
    });
    expect(finalizado.title).toBe("Tu caso fue aprobado");
    expect([...(finalizado.pasos ?? [])].join(" ")).not.toMatch(/Modificada|Evaluación/);

    const cerrada = avisoEntradaParticipante({
      estado: "EN_EVALUACION",
      esCorreccion: false,
      canEdit: false,
      mentoriaAbierta: false,
      esRubrica: true,
    });
    expect(cerrada.title).toBe("Asesoría cerrada");
    expect(cerrada.pasos).toBeUndefined();
  });
});
