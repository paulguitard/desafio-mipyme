import { describe, expect, it } from "vitest";
import { sanitizeRichText } from "@/lib/html";
import { publicUploadUrl } from "@/lib/preguntas";
import { resolveVideoEmbed } from "@/lib/preguntas";
import { estadoAsignacionFicha, estadoRespuestaFicha, estadoSupervisionFicha, etiquetaEstadoAsignacionFicha, etiquetaEstadoSupervisionFicha, porcentajeEntero, resumenNumerosAsesoria } from "@/lib/convocatoria-evaluacion-filtros";

describe("sanitizeRichText", () => {
  it("strips scripts and event handlers", () => {
    const html = `<p onclick="alert(1)">ok</p><script>alert(1)</script>`;
    const clean = sanitizeRichText(html);
    expect(clean).not.toMatch(/script/i);
    expect(clean).not.toMatch(/onclick/i);
    expect(clean).toMatch(/ok/);
  });
});

describe("publicUploadUrl", () => {
  it("ignores stored public URLs", () => {
    expect(
      publicUploadUrl({
        id: "1",
        originalName: "x.webp",
        mimeType: "image/webp",
        kind: "image",
        relativePath: "folder/id",
        url: "https://example.com/public.webp",
      }),
    ).toBe("/api/archivos/folder/id");
  });

  it("uses the Cloudinary public_id when only url is stored", () => {
    expect(
      publicUploadUrl({
        id: "1",
        originalName: "x.webp",
        mimeType: "image/webp",
        kind: "image",
        relativePath: "",
        url: "https://res.cloudinary.com/demo/image/upload/v1/desafio-mipyme/foto.webp",
      }),
    ).toBe("/api/archivos/desafio-mipyme/foto");
  });
});

describe("resolveVideoEmbed", () => {
  it("rejects javascript URLs", () => {
    expect(resolveVideoEmbed("javascript:alert(1)")).toBeNull();
  });
});

describe("estadoRespuestaFicha", () => {
  const base = {
    emprendedorNombre: "A",
    emprendedorEmail: "a@b.c",
    nombreCaso: "Caso",
    respuestas: [],
  };

  it("marks observaciones when the participant has the ball", () => {
    expect(
      estadoRespuestaFicha(
        {
          ...base,
          estado: "ENVIADA",
          enviadaAt: "2026-01-01",
          asignaciones: [{ evaluadorId: "e", estado: "CON_OBSERVACIONES" }],
        },
        [],
      ),
    ).toBe("observaciones");
  });

  it("marks esperando evaluacion after submit while review is open", () => {
    expect(
      estadoRespuestaFicha(
        {
          ...base,
          estado: "EN_EVALUACION",
          enviadaAt: "2026-01-01",
          asignaciones: [{ evaluadorId: "e", estado: "REPARADA" }],
        },
        [],
      ),
    ).toBe("esperando-evaluacion");
  });

  it("marks completa when every evaluation is finished", () => {
    expect(
      estadoRespuestaFicha(
        {
          ...base,
          estado: "FINALIZADA",
          enviadaAt: "2026-01-01",
          asignaciones: [{ evaluadorId: "e", estado: "FINALIZADA" }],
        },
        [],
      ),
    ).toBe("completa");
  });

  it("keeps an untouched first draft as pendiente", () => {
    expect(
      estadoRespuestaFicha(
        { ...base, estado: "BORRADOR", enviadaAt: null, asignaciones: [] },
        [{ id: "p1", enunciado: "Nombre", obligatoria: true }],
      ),
    ).toBe("pendiente");
  });

  it("marks a first draft with answers as borrador", () => {
    expect(
      estadoRespuestaFicha(
        {
          ...base,
          estado: "BORRADOR",
          enviadaAt: null,
          asignaciones: [],
          respuestas: [{ preguntaId: "p1", valor: "Mi caso" }],
        },
        [
          { id: "p1", enunciado: "Nombre", obligatoria: true },
          { id: "p2", enunciado: "Detalle", obligatoria: true },
        ],
      ),
    ).toBe("borrador");
  });

  it("marks a filled first draft as borrador until an evaluation exists", () => {
    expect(
      estadoRespuestaFicha(
        {
          ...base,
          estado: "BORRADOR",
          enviadaAt: null,
          asignaciones: [],
          respuestas: [{ preguntaId: "p1", valor: "listo" }],
        },
        [{ id: "p1", enunciado: "Nombre", obligatoria: true }],
      ),
    ).toBe("borrador");
  });

  it("does not use borrador once an evaluation exists, even if the form still has answers", () => {
    expect(
      estadoRespuestaFicha(
        {
          ...base,
          estado: "BORRADOR",
          enviadaAt: null,
          asignaciones: [{ evaluadorId: "e", estado: "REPARADA" }],
          respuestas: [{ preguntaId: "p1", valor: "Mi caso" }],
        },
        [
          { id: "p1", enunciado: "Nombre", obligatoria: true },
          { id: "p2", enunciado: "Detalle", obligatoria: true },
        ],
      ),
    ).toBe("pendiente");
  });

  it("keeps a submitted case out of borrador", () => {
    expect(
      estadoRespuestaFicha(
        {
          ...base,
          estado: "ENVIADA",
          enviadaAt: "2026-01-01",
          asignaciones: [{ evaluadorId: "e", estado: "REPARADA" }],
          respuestas: [{ preguntaId: "p1", valor: "Mi caso" }],
        },
        [
          { id: "p1", enunciado: "Nombre", obligatoria: true },
          { id: "p2", enunciado: "Detalle", obligatoria: true },
        ],
      ),
    ).toBe("esperando-evaluacion");
  });
});

describe("resumenNumerosAsesoria", () => {
  it("counts responses by status and assignment", () => {
    const resumen = resumenNumerosAsesoria(
      [
        {
          estado: "BORRADOR",
          enviadaAt: null,
          emprendedorNombre: "A",
          emprendedorEmail: "a@b.c",
          nombreCaso: "1",
          respuestas: [],
          asignaciones: [],
        },
        {
          estado: "EN_EVALUACION",
          enviadaAt: "2026-01-01",
          emprendedorNombre: "B",
          emprendedorEmail: "b@b.c",
          nombreCaso: "2",
          respuestas: [],
          asignaciones: [{ evaluadorId: "e", estado: "REPARADA" }],
          supervision: { supervisorId: "s" },
        },
        {
          estado: "FINALIZADA",
          enviadaAt: "2026-01-01",
          emprendedorNombre: "C",
          emprendedorEmail: "c@b.c",
          nombreCaso: "3",
          respuestas: [],
          asignaciones: [{ evaluadorId: "e", estado: "FINALIZADA" }],
        },
      ],
      [],
    );
    expect(resumen.total).toBe(3);
    expect(resumen.porEstado.pendiente).toBe(1);
    expect(resumen.porEstado["esperando-evaluacion"]).toBe(1);
    expect(resumen.porEstado.completa).toBe(1);
    expect(resumen.conEvaluador).toBe(2);
    expect(resumen.sinEvaluador).toBe(1);
    expect(resumen.conSupervisor).toBe(1);
    expect(resumen.sinSupervisor).toBe(2);
    expect(porcentajeEntero(1, 3)).toBe(33);
    expect(porcentajeEntero(0, 0)).toBeNull();
  });
});

describe("estadoAsignacionFicha", () => {
  it("maps each assignment to who has the ball", () => {
    expect(estadoAsignacionFicha("PENDIENTE")).toBe("pendiente");
    expect(estadoAsignacionFicha("EN_REVISION")).toBe("pendiente");
    expect(estadoAsignacionFicha("REPARADA")).toBe("pendiente");
    expect(estadoAsignacionFicha("DEVUELTA_SUPERVISOR")).toBe("pendiente");
    expect(estadoAsignacionFicha("EN_SUPERVISION")).toBe("esperando-supervision");
    expect(estadoAsignacionFicha("CON_OBSERVACIONES")).toBe("esperando-respuesta");
    expect(estadoAsignacionFicha("FINALIZADA")).toBe("finalizada");
    expect(etiquetaEstadoAsignacionFicha("esperando-respuesta")).toBe("Esperando respuesta");
    expect(etiquetaEstadoAsignacionFicha("esperando-supervision")).toBe("Esperando supervisión");
    expect(etiquetaEstadoSupervisionFicha("esperando-evaluacion")).toBe("Esperando evaluación");
  });
});

describe("estadoSupervisionFicha", () => {
  it("waits for the participant together with the evaluator", () => {
    expect(estadoSupervisionFicha([{ estado: "CON_OBSERVACIONES" }])).toBe("esperando-respuesta");
  });

  it("waits for the evaluator after the participant resubmits", () => {
    expect(estadoSupervisionFicha([{ estado: "REPARADA" }])).toBe("esperando-evaluacion");
  });

  it("is pendiente only while the supervisor has the ball", () => {
    expect(estadoSupervisionFicha([{ estado: "EN_SUPERVISION" }])).toBe("pendiente");
  });

  it("waits for evaluation if another evaluator still has the ball", () => {
    expect(
      estadoSupervisionFicha([{ estado: "CON_OBSERVACIONES" }, { estado: "EN_REVISION" }]),
    ).toBe("esperando-evaluacion");
  });

  it("prefers pendiente if any evaluator is in supervision", () => {
    expect(
      estadoSupervisionFicha([{ estado: "CON_OBSERVACIONES" }, { estado: "EN_SUPERVISION" }]),
    ).toBe("pendiente");
  });
});
