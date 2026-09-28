import { describe, expect, it } from "vitest";
import {
  agruparFiltrosPorBanda,
  compararUrgenciaPendiente,
  conteosCasos,
  etiquetaAsignacionPanelEvaluador,
  etiquetaAsignacionPanelSupervisor,
  FILTROS_EVALUADOR,
  FILTROS_SUPERVISOR,
  grupoFiltroEvaluador,
  gruposDeSupervisor,
  gruposVisibles,
  itemsDeGrupo,
  resolverFiltroSupervisor,
  supervisorCoincideFiltro,
} from "@/lib/casos-panel";

describe("grupoFiltroEvaluador", () => {
  it("agrupa los estados de acción del evaluador", () => {
    expect(grupoFiltroEvaluador("DEVUELTA_SUPERVISOR")).toBe("pendientes");
    expect(grupoFiltroEvaluador("EN_REVISION")).toBe("pendientes");
    expect(grupoFiltroEvaluador("REPARADA")).toBe("reparadas");
    expect(grupoFiltroEvaluador("EN_SUPERVISION")).toBe("supervision");
    expect(grupoFiltroEvaluador("CON_OBSERVACIONES")).toBe("observaciones");
    expect(grupoFiltroEvaluador("FINALIZADA")).toBe("finalizadas");
  });

  it("prioriza devueltas sobre revisión y pendientes", () => {
    const estados = ["PENDIENTE", "DEVUELTA_SUPERVISOR", "EN_REVISION"];
    estados.sort(compararUrgenciaPendiente);
    expect(estados).toEqual(["DEVUELTA_SUPERVISOR", "EN_REVISION", "PENDIENTE"]);
  });
});

describe("etiquetas de panel", () => {
  it("en el evaluador distingue el motivo cuando es su turno", () => {
    expect(etiquetaAsignacionPanelEvaluador("PENDIENTE")).toBe("Pendiente");
    expect(etiquetaAsignacionPanelEvaluador("EN_REVISION")).toBe("En revisión");
    expect(etiquetaAsignacionPanelEvaluador("DEVUELTA_SUPERVISOR")).toBe("Devuelta por el supervisor");
    expect(etiquetaAsignacionPanelEvaluador("REPARADA")).toBe("Reparada por el participante");
  });

  it("dice quién tiene la pelota cuando el evaluador espera", () => {
    expect(etiquetaAsignacionPanelEvaluador("CON_OBSERVACIONES")).toBe("Esperando respuesta");
    expect(etiquetaAsignacionPanelEvaluador("EN_SUPERVISION")).toBe("Esperando supervisión");
    expect(etiquetaAsignacionPanelEvaluador("FINALIZADA")).toBe("Finalizada");
  });

  it("en el supervisor usa las pastillas de la ficha de evaluación", () => {
    expect(etiquetaAsignacionPanelSupervisor("EN_REVISION")).toBe("Pendiente");
    expect(etiquetaAsignacionPanelSupervisor("CON_OBSERVACIONES")).toBe("Esperando respuesta");
    expect(etiquetaAsignacionPanelSupervisor("EN_SUPERVISION")).toBe("Esperando supervisión");
    expect(etiquetaAsignacionPanelSupervisor("FINALIZADA")).toBe("Finalizada");
  });
});

describe("supervisorCoincideFiltro", () => {
  const observaciones = [{ estado: "EN_SUPERVISION", intencionPendiente: "OBSERVACIONES" }];
  const finalizar = [{ estado: "EN_SUPERVISION", intencionPendiente: "FINALIZAR" }];
  const mixto = [
    { estado: "EN_SUPERVISION", intencionPendiente: "OBSERVACIONES" },
    { estado: "EN_SUPERVISION", intencionPendiente: "FINALIZAR" },
  ];
  const esperandoRespuesta = [{ estado: "CON_OBSERVACIONES", intencionPendiente: null }];
  const esperandoEvaluacion = [{ estado: "EN_REVISION", intencionPendiente: null }];
  const devuelta = [{ estado: "DEVUELTA_SUPERVISOR", intencionPendiente: null }];
  const mixtoRespuestaYEvaluacion = [
    { estado: "CON_OBSERVACIONES", intencionPendiente: null },
    { estado: "EN_REVISION", intencionPendiente: null },
  ];
  const cerrado = [{ estado: "FINALIZADA", intencionPendiente: null }];

  it("separa colas de revisión de las esperas", () => {
    expect(supervisorCoincideFiltro("observaciones", observaciones)).toBe(true);
    expect(supervisorCoincideFiltro("finalizar", finalizar)).toBe(true);
    expect(supervisorCoincideFiltro("esperando-respuesta", observaciones)).toBe(false);
    expect(supervisorCoincideFiltro("esperando-evaluacion", observaciones)).toBe(false);
    expect(supervisorCoincideFiltro("finalizadas", cerrado)).toBe(true);
  });

  it("un caso con dos intenciones entra en ambas colas de revisión", () => {
    expect(supervisorCoincideFiltro("observaciones", mixto)).toBe(true);
    expect(supervisorCoincideFiltro("finalizar", mixto)).toBe(true);
    expect(supervisorCoincideFiltro("esperando-evaluacion", mixto)).toBe(false);
  });

  it("espera respuesta solo cuando el participante tiene la pelota", () => {
    expect(supervisorCoincideFiltro("esperando-respuesta", esperandoRespuesta)).toBe(true);
    expect(supervisorCoincideFiltro("esperando-evaluacion", esperandoRespuesta)).toBe(false);
    expect(supervisorCoincideFiltro("esperando-respuesta", mixtoRespuestaYEvaluacion)).toBe(false);
  });

  it("espera evaluación cuando el evaluador tiene la pelota, incluidas las devueltas", () => {
    expect(supervisorCoincideFiltro("esperando-evaluacion", esperandoEvaluacion)).toBe(true);
    expect(supervisorCoincideFiltro("esperando-evaluacion", devuelta)).toBe(true);
    expect(supervisorCoincideFiltro("esperando-evaluacion", mixtoRespuestaYEvaluacion)).toBe(true);
    expect(supervisorCoincideFiltro("esperando-respuesta", devuelta)).toBe(false);
  });

  it("mapea filtros viejos a Esperando evaluación", () => {
    expect(resolverFiltroSupervisor("devueltas").id).toBe("esperando-evaluacion");
    expect(resolverFiltroSupervisor("en_curso").id).toBe("esperando-evaluacion");
  });
});

describe("agruparFiltrosPorBanda", () => {
  it("separa chips del evaluador por quién tiene la pelota", () => {
    const bandas = agruparFiltrosPorBanda(FILTROS_EVALUADOR);
    expect(bandas.map((b) => b.id)).toEqual(["todas", "tu-turno", "supervisor", "participante", "cerrados"]);
    expect(bandas.find((b) => b.id === "tu-turno")?.filtros.map((f) => f.id)).toEqual([
      "pendientes",
      "reparadas",
    ]);
  });

  it("separa chips del supervisor por quién tiene la pelota", () => {
    const bandas = agruparFiltrosPorBanda(FILTROS_SUPERVISOR);
    expect(bandas.map((b) => b.id)).toEqual(["todas", "tu-turno", "evaluador", "participante", "cerrados"]);
    expect(bandas.find((b) => b.id === "tu-turno")?.filtros.map((f) => f.id)).toEqual([
      "observaciones",
      "finalizar",
    ]);
  });
});

describe("gruposVisibles", () => {
  const filtros = [
    { id: "todas", label: "Todas", banda: "todas" as const },
    { id: "a", label: "A", banda: "tu-turno" as const },
    { id: "b", label: "B", banda: "participante" as const },
  ];

  it("en Todas oculta secciones vacías", () => {
    const grupos = gruposVisibles(filtros, "todas", (id) => (id === "a" ? [1] : []));
    expect(grupos.map((g) => g.id)).toEqual(["a"]);
  });

  it("en un filtro muestra la sección aunque esté vacía", () => {
    const grupos = gruposVisibles(filtros, "b", () => []);
    expect(grupos).toEqual([{ id: "b", label: "B", banda: "participante", items: [] }]);
  });
});

describe("conteos e items en cliente", () => {
  const casos = [
    {
      id: "1",
      href: "/a",
      nombre: "A",
      detalle: "d",
      estado: "CON_OBSERVACIONES",
      etiqueta: "Esperando respuesta",
      grupos: ["observaciones"],
      updatedAt: 2,
    },
    {
      id: "2",
      href: "/b",
      nombre: "B",
      detalle: "d",
      estado: "PENDIENTE",
      etiqueta: "Pendiente",
      grupos: ["pendientes"],
      updatedAt: 1,
    },
  ];

  it("cuenta sin recargar", () => {
    const counts = conteosCasos(casos, FILTROS_EVALUADOR);
    expect(counts.todas).toBe(2);
    expect(counts.observaciones).toBe(1);
    expect(counts.pendientes).toBe(1);
  });

  it("filtra un grupo", () => {
    expect(itemsDeGrupo(casos, "observaciones").map((c) => c.id)).toEqual(["1"]);
  });

  it("un caso de supervisor puede estar en dos colas de revisión", () => {
    expect(
      gruposDeSupervisor([
        { estado: "EN_SUPERVISION", intencionPendiente: "OBSERVACIONES" },
        { estado: "EN_SUPERVISION", intencionPendiente: "FINALIZAR" },
      ]),
    ).toEqual(["observaciones", "finalizar"]);
  });
});
