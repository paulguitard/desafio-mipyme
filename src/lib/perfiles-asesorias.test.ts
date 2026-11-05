import { describe, expect, it } from "vitest";
import {
  anexarAsesoriasAPerfiles,
  elegirConvocatoriaActiva,
  barrasTdPorSeccion,
  estadosTdEnCeldas,
  etiquetaAsesoriaTd,
  etiquetaVideoPitch,
  filasDashboardPublico,
  filtrarPerfilesAnalisis,
  pasaFiltroEstados,
  pasaFiltroTexto,
  resumenDashboardPublico,
} from "@/lib/perfiles-asesorias";

describe("elegirConvocatoriaActiva", () => {
  it("elige la ABIERTA más reciente cuyo título coincide", () => {
    const elegida = elegirConvocatoriaActiva(
      [
        {
          id: "old",
          titulo: "Asesoría de Transformación Digital",
          estado: "CERRADA",
          createdAt: "2026-01-01",
        },
        {
          id: "new",
          titulo: "Asesoría de Transformación Digital",
          estado: "ABIERTA",
          createdAt: "2026-06-01",
        },
      ],
      "Asesoría de Transformación Digital",
    );
    expect(elegida?.id).toBe("new");
  });

  it("coincide ignorando mayúsculas y acentos", () => {
    const elegida = elegirConvocatoriaActiva(
      [{ id: "p", titulo: "comparte tu pitch", estado: "ABIERTA", createdAt: "2026-06-01" }],
      "Comparte tu Pitch",
    );
    expect(elegida?.id).toBe("p");
  });
});

describe("etiquetaAsesoriaTd", () => {
  it("usa la etiqueta de estado de la postulación", () => {
    expect(etiquetaAsesoriaTd("EN_EVALUACION")).toBe("En evaluación");
    expect(etiquetaAsesoriaTd("BORRADOR")).toBe("Incompleto");
    expect(etiquetaAsesoriaTd(null)).toBe("Sin información");
  });
});

describe("etiquetaVideoPitch", () => {
  it("dice Enviado si envió el caso y Pendiente si no", () => {
    expect(etiquetaVideoPitch({ enviadaAt: new Date("2026-06-01") })).toBe("Enviado");
    expect(etiquetaVideoPitch({ enviadaAt: null })).toBe("Pendiente");
    expect(etiquetaVideoPitch(null)).toBe("Pendiente");
  });
});

describe("anexarAsesoriasAPerfiles", () => {
  it("rellena Asesoría TD con el estado y Video Pitch con Enviado o Pendiente", () => {
    const filas = anexarAsesoriasAPerfiles(
      [
        { id: "u1" },
        { id: "u2" },
        { id: "u3" },
      ],
      [
        {
          id: "td",
          titulo: "Asesoría de Transformación Digital",
          estado: "ABIERTA",
          createdAt: "2026-06-01",
        },
        {
          id: "pitch",
          titulo: "Comparte tu Pitch",
          estado: "ABIERTA",
          createdAt: "2026-06-01",
        },
      ],
      [
        { postulanteId: "u1", convocatoriaId: "td", estado: "EN_EVALUACION", enviadaAt: "2026-06-02" },
        { postulanteId: "u1", convocatoriaId: "pitch", estado: "ENVIADA", enviadaAt: "2026-06-03" },
        { postulanteId: "u2", convocatoriaId: "td", estado: "BORRADOR", enviadaAt: null },
        { postulanteId: "u2", convocatoriaId: "pitch", estado: "BORRADOR", enviadaAt: null },
      ],
    );

    expect(filas[0]).toMatchObject({ id: "u1", asesoriaTd: "En evaluación", videoPitch: "Enviado" });
    expect(filas[1]).toMatchObject({ id: "u2", asesoriaTd: "Incompleto", videoPitch: "Pendiente" });
    expect(filas[2]).toMatchObject({ id: "u3", asesoriaTd: "Sin información", videoPitch: "Pendiente" });
  });
});

describe("filtrarPerfilesAnalisis", () => {
  it("oculta las cuentas de prueba por correo y deja al resto", () => {
    const visibles = filtrarPerfilesAnalisis([
      { email: "Cristina@aiep.cl" },
      { email: "Guitard.Paul@gmail.com" },
      { email: "piortegaf@gmail.com" },
      { email: "emprendedor2@test.com" },
      { email: "emprendedor@test.com" },
    ]);
    expect(visibles.map((fila) => fila.email)).toEqual(["Cristina@aiep.cl"]);
  });
});

describe("estadosTdEnCeldas", () => {
  it("ordena los estados que aparecen en las celdas", () => {
    expect(estadosTdEnCeldas(["En evaluación", "Sin información", "Incompleto", "En evaluación"])).toEqual([
      "Sin información",
      "Incompleto",
      "En evaluación",
    ]);
  });
});

describe("barrasTdPorSeccion", () => {
  it("agrupa los estados en fuera del proceso, en evaluación y finalizadas", () => {
    const secciones = barrasTdPorSeccion([
      { estado: "Finalizada", cantidad: 22 },
      { estado: "En evaluación", cantidad: 13 },
      { estado: "Sin información", cantidad: 2 },
    ]);
    expect(secciones.map((seccion) => seccion.titulo)).toEqual([
      "Fuera del proceso",
      "En proceso de evaluación",
      "Finalizadas",
    ]);
    expect(secciones[0]?.items).toEqual([
      { etiqueta: "Sin información", cantidad: 2 },
      { etiqueta: "Incompleto", cantidad: 0 },
    ]);
    expect(secciones[2]?.items).toEqual([{ etiqueta: "Finalizada", cantidad: 22 }]);
  });
});

describe("pasaFiltroTexto", () => {
  it("filtra por coincidencia parcial sin importar mayúsculas", () => {
    expect(pasaFiltroTexto("Cristina Arias", "")).toBe(true);
    expect(pasaFiltroTexto("Cristina Arias", "cris")).toBe(true);
    expect(pasaFiltroTexto("Cristina Arias", "xyz")).toBe(false);
  });
});

describe("pasaFiltroEstados", () => {
  it("sin selección deja pasar todos y con selección solo esos estados", () => {
    expect(pasaFiltroEstados("Enviada", [])).toBe(true);
    expect(pasaFiltroEstados("Enviada", ["Enviada", "Incompleto"])).toBe(true);
    expect(pasaFiltroEstados("Sin información", ["Enviada", "Incompleto"])).toBe(false);
  });
});

describe("dashboard público", () => {
  it("deja nombre, correo, formalización y estados de las asesorías", () => {
    const filas = filasDashboardPublico([
      {
        name: "Ana",
        email: "Ana@Aiep.cl",
        formalizacionEmpresa: true,
        asesoriaTd: "En evaluación",
        videoPitch: "Enviado",
      },
      {
        name: "Luis",
        email: "luis@aiep.cl",
        formalizacionEmpresa: false,
        asesoriaTd: "Sin información",
        videoPitch: "Pendiente",
      },
      {
        name: "Mia",
        email: "mia@aiep.cl",
        formalizacionEmpresa: true,
        asesoriaTd: "Incompleto",
        videoPitch: "Pendiente",
      },
    ]);
    expect(filas[0]).toEqual({
      name: "Ana",
      email: "ana@aiep.cl",
      formalizacionEmpresa: true,
      asesoriaTd: "En evaluación",
      videoPitch: "Enviado",
    });
    expect(resumenDashboardPublico(filas)).toEqual({
      total: 3,
      formalizacionSi: 2,
      formalizacionNo: 1,
      videoPitchEnviado: 1,
      videoPitchPendiente: 2,
      asesoriaTd: [
        { estado: "Sin información", cantidad: 1 },
        { estado: "Incompleto", cantidad: 1 },
        { estado: "En evaluación", cantidad: 1 },
      ],
    });
  });
});
