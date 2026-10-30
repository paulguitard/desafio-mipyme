import { describe, expect, it } from "vitest";
import { resolverTutorial, selectorTour } from "@/lib/tutoriales";

describe("selectorTour", () => {
  it("arma el selector data-tour", () => {
    expect(selectorTour("nav")).toBe('[data-tour="nav"]');
  });
});

describe("resolverTutorial", () => {
  it("distingue el panel de evaluador y el de supervisor", () => {
    const evaluador = resolverTutorial("EVALUADOR", "/evaluador");
    const supervisor = resolverTutorial("SUPERVISOR", "/evaluador");
    expect(evaluador.some((p) => p.ancla === "filtros-evaluacion")).toBe(true);
    expect(supervisor.some((p) => p.ancla === "filtros-supervision")).toBe(true);
    expect(evaluador.map((p) => p.ancla)).not.toEqual(supervisor.map((p) => p.ancla));
  });

  it("resuelve rutas exactas de participante", () => {
    expect(resolverTutorial("EMPRENDEDOR", "/participante").map((p) => p.ancla)).toEqual([
      "nav",
      "mentorias-abiertas",
      "mis-casos",
    ]);
    expect(resolverTutorial("EMPRENDEDOR", "/participante/perfil").some((p) => p.ancla === "perfil-guardar")).toBe(
      true,
    );
  });

  it("resuelve rutas dinámicas", () => {
    expect(
      resolverTutorial("EMPRENDEDOR", "/participante/postulaciones/abc").map((p) => p.ancla),
    ).toEqual(["volver", "formulario-caso", "pestaña-evaluacion", "observacion-pregunta", "guardar-borrador", "enviar-caso"]);
    expect(
      resolverTutorial("EMPRENDEDOR", "/participante/postulaciones/abc", "carga-informacion").map((p) => p.ancla),
    ).toEqual(["volver", "formulario-caso", "guardar-borrador", "enviar-caso"]);
    expect(
      resolverTutorial("EMPRENDEDOR", "/participante/postulaciones/abc", "carga-informacion")
        .map((p) => p.descripcion)
        .join(" "),
    ).not.toMatch(/evaluaci[oó]n|observaciones/i);
    expect(resolverTutorial("EVALUADOR", "/evaluador/evaluaciones/xyz").map((p) => p.ancla)).toEqual([
      "volver",
      "nav",
      "pestaña-caso",
      "ficha-caso",
      "historial-versiones",
      "pestaña-evaluacion",
      "observacion-pregunta",
      "guardar-revision",
      "enviar-supervisor",
      "finalizar-evaluacion",
    ]);
    expect(resolverTutorial("SUPERVISOR", "/evaluador/supervision/xyz").map((p) => p.ancla)).toEqual([
      "volver",
      "nav",
      "pestaña-caso",
      "ficha-caso",
      "historial-versiones",
      "pestaña-evaluacion",
      "observacion-pregunta",
      "guardar-revision",
      "enviar-observaciones",
      "enviar-evaluador",
      "proceder",
    ]);
    expect(resolverTutorial("ADMIN", "/admin/formularios/nuevo").map((p) => p.ancla)).toContain("formulario-agregar");
    expect(resolverTutorial("ADMIN", "/admin/formularios/form-1").map((p) => p.ancla)).toContain("formulario-titulo");
    expect(resolverTutorial("ADMIN", "/admin/mentorias/m-1").map((p) => p.ancla)).toContain("pool-evaluadores");
    expect(
      resolverTutorial("ADMIN", "/admin/mentorias", "panel-mentoria").map((p) => p.ancla),
    ).toEqual([
      "mentoria-ficha",
      "vista-panel-asesoria",
      "pool-evaluadores",
      "pool-supervisores",
      "pool-incorporar",
      "asignacion-automatica",
      "lista-casos",
    ]);
    expect(resolverTutorial("ADMIN", "/admin/mentorias").map((p) => p.ancla)).toContain("mentorias-lista");
    expect(
      resolverTutorial("EMPRENDEDOR", "/participante/postulaciones/abc", "rubrica").map((p) => p.ancla),
    ).toEqual(["volver", "formulario-caso", "guardar-borrador", "enviar-caso"]);
    expect(
      resolverTutorial("EMPRENDEDOR", "/participante/postulaciones/abc", "rubrica")
        .map((p) => p.descripcion)
        .join(" "),
    ).not.toMatch(/observaciones/i);
    expect(
      resolverTutorial("EVALUADOR", "/evaluador/evaluaciones/xyz", "rubrica").map((p) => p.ancla),
    ).toEqual([
      "volver",
      "nav",
      "pestaña-caso",
      "ficha-caso",
      "pestaña-evaluacion",
      "observacion-pregunta",
      "guardar-revision",
      "finalizar-evaluacion",
    ]);
    expect(
      resolverTutorial("EVALUADOR", "/evaluador/evaluaciones/xyz", "rubrica")
        .map((p) => `${p.titulo} ${p.descripcion}`)
        .join(" "),
    ).not.toMatch(/Modificada|Pedir cambios|observaciones|supervisor/i);
  });

  it("no ofrece tutorial de perfil a evaluador ni supervisor", () => {
    expect(resolverTutorial("EVALUADOR", "/evaluador/perfil").some((p) => p.ancla === "perfil-guardar")).toBe(
      false,
    );
    expect(resolverTutorial("SUPERVISOR", "/evaluador/perfil").some((p) => p.ancla === "perfil-guardar")).toBe(
      false,
    );
    expect(resolverTutorial("EVALUADOR", "/evaluador")[0]?.descripcion).not.toMatch(/perfil/i);
    expect(resolverTutorial("SUPERVISOR", "/evaluador")[0]?.descripcion).not.toMatch(/perfil/i);
  });

  it("ignora la barra final y usa el recorte del encabezado en rutas sin recorrido propio", () => {
    expect(resolverTutorial("ADMIN", "/admin/").map((p) => p.ancla)).toEqual(
      resolverTutorial("ADMIN", "/admin").map((p) => p.ancla),
    );
    const fallback = resolverTutorial("EMPRENDEDOR", "/participante/otra");
    expect(fallback[0]?.ancla).toBe("nav");
  });

  it("no trata /admin/formularios como un id de formulario", () => {
    expect(resolverTutorial("ADMIN", "/admin/formularios").map((p) => p.ancla)).toEqual([
      "nav",
      "formularios-nuevo",
      "formularios-lista",
    ]);
  });
});
