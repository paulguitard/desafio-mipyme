import { describe, expect, it } from "vitest";
import { armarHiloRevision, tituloRonda } from "@/lib/hilo-revision";

const hiloCerrado = {
  revisiones: [
    {
      id: "ev1",
      ronda: 1,
      ciclo: 1,
      veredicto: "OBSERVACION",
      comentario: "primera",
      nota: 3,
      createdAt: "2026-09-01T00:00:00.000Z",
    },
    {
      id: "ev2",
      ronda: 1,
      ciclo: 2,
      veredicto: "OBSERVACION",
      comentario: "corregida",
      nota: 5,
      createdAt: "2026-09-02T00:00:00.000Z",
    },
  ],
  supervisiones: [
    {
      id: "sup1",
      ronda: 1,
      ciclo: 1,
      veredicto: "OBSERVACION",
      comentario: "ajusta el número",
      createdAt: "2026-09-01T12:00:00.000Z",
    },
    {
      id: "sup2",
      ronda: 1,
      ciclo: 2,
      veredicto: "OK",
      comentario: "",
      createdAt: "2026-09-02T12:00:00.000Z",
    },
  ],
  asignacion: { estado: "CON_OBSERVACIONES", rondaActual: 1, cicloSupervision: 2 },
};

describe("titulo de ronda", () => {
  it("usa ordinal hasta la décima y después el número", () => {
    expect(tituloRonda(1)).toBe("Primera evaluación");
    expect(tituloRonda(2)).toBe("Segunda evaluación");
    expect(tituloRonda(10)).toBe("Décima evaluación");
    expect(tituloRonda(11)).toBe("Evaluación 11");
  });
});

describe("hilo de revisión", () => {
  it("pone lo nuevo arriba y el supervisor del ciclo encima del evaluador", () => {
    const tarjetas = armarHiloRevision({ ...hiloCerrado, audiencia: "equipo" });
    expect(tarjetas.map((tarjeta) => tarjeta.titulo)).toEqual(["Primera evaluación"]);
    expect(tarjetas[0]?.mensajes.map((item) => item.id)).toEqual(["sup2", "ev2", "sup1", "ev1"]);
    expect(tarjetas[0]?.mensajes.find((item) => item.id === "ev2")?.esVersionFinal).toBe(true);
    expect(tarjetas[0]?.mensajes.find((item) => item.id === "ev1")?.esVersionFinal).toBe(false);
  });

  it("no muestra el borrador del evaluador hasta que lo envía", () => {
    const tarjetas = armarHiloRevision({
      revisiones: [
        {
          id: "borrador",
          ronda: 1,
          ciclo: 1,
          veredicto: "OBSERVACION",
          comentario: "aún no",
          createdAt: "2026-09-01T00:00:00.000Z",
        },
      ],
      asignacion: { estado: "EN_REVISION", rondaActual: 1, cicloSupervision: 1 },
      audiencia: "equipo",
    });
    expect(tarjetas).toEqual([
      { ronda: 1, titulo: "Primera evaluación", mensajes: [] },
    ]);
  });

  it("muestra la evaluación enviada y oculta la supervisión guardada sin enviar", () => {
    const tarjetas = armarHiloRevision({
      revisiones: [
        {
          id: "ev",
          ronda: 1,
          ciclo: 1,
          veredicto: "OBSERVACION",
          comentario: "enviada",
          createdAt: "2026-09-01T00:00:00.000Z",
        },
      ],
      supervisiones: [
        {
          id: "sup-borrador",
          ronda: 1,
          ciclo: 1,
          veredicto: "OBSERVACION",
          comentario: "borrador",
          createdAt: "2026-09-01T01:00:00.000Z",
        },
      ],
      asignacion: { estado: "EN_SUPERVISION", rondaActual: 1, cicloSupervision: 1 },
      audiencia: "equipo",
    });
    expect(tarjetas[0]?.mensajes.map((item) => item.id)).toEqual(["ev"]);
    expect(tarjetas[0]?.mensajes[0]?.esVersionFinal).toBe(false);
  });

  it("al devolver, el comentario del supervisor queda en la misma ronda", () => {
    const tarjetas = armarHiloRevision({
      revisiones: [
        {
          id: "ev",
          ronda: 1,
          ciclo: 1,
          veredicto: "OBSERVACION",
          comentario: "enviada",
          createdAt: "2026-09-01T00:00:00.000Z",
        },
      ],
      supervisiones: [
        {
          id: "sup",
          ronda: 1,
          ciclo: 1,
          veredicto: "OBSERVACION",
          comentario: "corrige",
          createdAt: "2026-09-01T01:00:00.000Z",
        },
      ],
      asignacion: { estado: "DEVUELTA_SUPERVISOR", rondaActual: 1, cicloSupervision: 2 },
      audiencia: "equipo",
    });
    expect(tarjetas[0]?.mensajes.map((item) => `${item.rol}:${item.id}`)).toEqual([
      "supervisor:sup",
      "evaluador:ev",
    ]);
  });

  it("ordena la ronda nueva arriba y marca solo la versión liberada", () => {
    const tarjetas = armarHiloRevision({
      revisiones: [
        ...hiloCerrado.revisiones,
        {
          id: "ev-r2",
          ronda: 2,
          ciclo: 2,
          veredicto: "OK",
          comentario: "",
          createdAt: "2026-09-03T00:00:00.000Z",
        },
      ],
      supervisiones: hiloCerrado.supervisiones,
      asignacion: { estado: "EN_SUPERVISION", rondaActual: 2, cicloSupervision: 2 },
      audiencia: "equipo",
    });
    expect(tarjetas.map((tarjeta) => tarjeta.ronda)).toEqual([2, 1]);
    expect(tarjetas[0]?.mensajes.map((item) => item.id)).toEqual(["ev-r2"]);
    expect(tarjetas[0]?.mensajes[0]?.esVersionFinal).toBe(false);
    expect(tarjetas[1]?.mensajes.find((item) => item.id === "ev2")?.esVersionFinal).toBe(true);
  });

  it("al participante le deja solo el globo final de cada ronda liberada, sin ticker", () => {
    const tarjetas = armarHiloRevision({
      revisiones: [
        ...hiloCerrado.revisiones,
        {
          id: "ev-r2",
          ronda: 2,
          ciclo: 2,
          veredicto: "OBSERVACION",
          comentario: "en curso",
          createdAt: "2026-09-03T00:00:00.000Z",
        },
      ],
      supervisiones: hiloCerrado.supervisiones,
      asignacion: { estado: "EN_REVISION", rondaActual: 2, cicloSupervision: 2 },
      audiencia: "participante",
    });
    expect(tarjetas.map((tarjeta) => tarjeta.titulo)).toEqual(["Primera evaluación"]);
    expect(tarjetas[0]?.mensajes).toEqual([
      expect.objectContaining({
        id: "ev2",
        rol: "evaluador",
        esVersionFinal: false,
      }),
    ]);
  });
});
