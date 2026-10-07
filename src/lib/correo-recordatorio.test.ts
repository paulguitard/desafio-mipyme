import { describe, expect, it } from "vitest";
import {
  asignacionesPendientesEvaluador,
  cantidadesPendientesEvaluadores,
  cantidadesPendientesSupervisores,
  recordatorioEvaluadorCaso,
  recordatorioParticipante,
  recordatorioSupervisorCaso,
} from "@/lib/correo-recordatorio";

const base = {
  emprendedorNombre: "A",
  emprendedorEmail: "a@b.c",
  nombreCaso: "Caso",
  respuestas: [] as { preguntaId: string; valor: string }[],
};

describe("recordatorioParticipante", () => {
  it("reminds when the case is still empty", () => {
    expect(
      recordatorioParticipante(
        { ...base, estado: "BORRADOR", enviadaAt: null, asignaciones: [] },
        [],
      ),
    ).toEqual({ habilitado: true, tipo: "PARTICIPANTE_RECORDATORIO_PENDIENTE" });
  });

  it("reminds a partial first draft the same way as an empty one", () => {
    expect(
      recordatorioParticipante(
        {
          ...base,
          estado: "BORRADOR",
          enviadaAt: null,
          asignaciones: [],
          respuestas: [{ preguntaId: "p1", valor: "algo" }],
        },
        [
          { id: "p1", enunciado: "Nombre", obligatoria: true },
          { id: "p2", enunciado: "Detalle", obligatoria: true },
        ],
      ),
    ).toEqual({ habilitado: true, tipo: "PARTICIPANTE_RECORDATORIO_PENDIENTE" });
  });

  it("reminds to submit when required answers are complete", () => {
    expect(
      recordatorioParticipante(
        {
          ...base,
          estado: "BORRADOR",
          enviadaAt: null,
          asignaciones: [],
          respuestas: [{ preguntaId: "p1", valor: "listo" }],
        },
        [{ id: "p1", enunciado: "Nombre", obligatoria: true }],
      ),
    ).toEqual({ habilitado: true, tipo: "PARTICIPANTE_RECORDATORIO_COMPLETA" });
  });

  it("reminds when observations are open", () => {
    expect(
      recordatorioParticipante(
        {
          ...base,
          estado: "ENVIADA",
          enviadaAt: "2026-01-01",
          asignaciones: [{ evaluadorId: "e", estado: "CON_OBSERVACIONES" }],
        },
        [],
      ),
    ).toEqual({ habilitado: true, tipo: "PARTICIPANTE_RECORDATORIO_OBSERVACIONES" });
  });

  it("disables after the case was submitted", () => {
    expect(
      recordatorioParticipante(
        {
          ...base,
          estado: "EN_EVALUACION",
          enviadaAt: "2026-01-01",
          asignaciones: [{ evaluadorId: "e", estado: "REPARADA" }],
        },
        [],
      ),
    ).toEqual({ habilitado: false, motivo: "El caso ya está en evaluación." });
  });

  it("disables when every evaluation is finished", () => {
    expect(
      recordatorioParticipante(
        {
          ...base,
          estado: "FINALIZADA",
          enviadaAt: "2026-01-01",
          asignaciones: [{ evaluadorId: "e", estado: "FINALIZADA" }],
        },
        [],
      ),
    ).toEqual({
      habilitado: false,
      motivo: "Las evaluaciones de este caso ya están finalizadas.",
    });
  });
});

describe("recordatorio evaluador y supervisor del caso", () => {
  it("keeps evaluator assignments that still have the ball", () => {
    const asignaciones = [
      { id: "a1", evaluadorId: "e1", estado: "PENDIENTE" },
      { id: "a2", evaluadorId: "e2", estado: "FINALIZADA" },
      { id: "a3", evaluadorId: "e3", estado: "REPARADA" },
    ];
    expect(asignacionesPendientesEvaluador(asignaciones).map((item) => item.id)).toEqual([
      "a1",
      "a3",
    ]);
    expect(recordatorioEvaluadorCaso(asignaciones).habilitado).toBe(true);
  });

  it("disables the evaluator reminder without pending work", () => {
    expect(recordatorioEvaluadorCaso([])).toEqual({
      habilitado: false,
      motivo: "No hay evaluador asignado.",
    });
    expect(
      recordatorioEvaluadorCaso([{ id: "a1", evaluadorId: "e1", estado: "EN_SUPERVISION" }]),
    ).toEqual({
      habilitado: false,
      motivo: "Ningún evaluador tiene este caso pendiente.",
    });
  });

  it("enables the supervisor reminder only in EN_SUPERVISION", () => {
    expect(recordatorioSupervisorCaso([{ estado: "EN_SUPERVISION" }], { supervisorId: "s" })).toEqual(
      { habilitado: true },
    );
    expect(recordatorioSupervisorCaso([{ estado: "PENDIENTE" }], { supervisorId: "s" })).toEqual({
      habilitado: false,
      motivo: "Este caso no está pendiente de supervisión.",
    });
    expect(recordatorioSupervisorCaso([{ estado: "EN_SUPERVISION" }], null)).toEqual({
      habilitado: false,
      motivo: "Sin supervisor asignado.",
    });
  });
});

describe("cantidades resumidas", () => {
  it("counts pending cases per evaluator and supervisor", () => {
    const postulaciones = [
      {
        asignaciones: [
          { evaluadorId: "e1", estado: "PENDIENTE" },
          { evaluadorId: "e2", estado: "FINALIZADA" },
        ],
        supervision: { supervisorId: "s1" },
      },
      {
        asignaciones: [{ evaluadorId: "e1", estado: "REPARADA" }],
        supervision: null,
      },
      {
        asignaciones: [{ evaluadorId: "e1", estado: "EN_SUPERVISION" }],
        supervision: { supervisorId: "s1" },
      },
    ];
    expect(Object.fromEntries(cantidadesPendientesEvaluadores(postulaciones))).toEqual({ e1: 2 });
    expect(Object.fromEntries(cantidadesPendientesSupervisores(postulaciones))).toEqual({ s1: 1 });
  });
});
