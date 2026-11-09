import { describe, expect, it } from "vitest";
import {
  compararCasosPitch,
  etiquetaEvaluadoresPitch,
  mapearCasoEvaluacionPitch,
  pasaFiltroEvaluadorPitch,
  pasaFiltroEvaluadoresPitch,
  pasaFiltroRangoNotaPitch,
  textoNotaPitch,
  urlVideoSegundaPregunta,
  filasExcelLinksVideosPitch,
  type CasoEvaluacionPitch,
} from "@/lib/dashboard-evaluaciones-pitch";

describe("urlVideoSegundaPregunta", () => {
  it("toma el link de video de la segunda pregunta por orden", () => {
    expect(
      urlVideoSegundaPregunta(
        [
          { id: "nombre", orden: 1 },
          { id: "video", orden: 2 },
        ],
        [
          { preguntaId: "nombre", archivos: "[]" },
          {
            preguntaId: "video",
            archivos: JSON.stringify([
              {
                id: "v1",
                kind: "video_link",
                url: "https://www.youtube.com/watch?v=abcdefghijk",
                provider: "youtube",
              },
            ]),
          },
        ],
      ),
    ).toBe("https://www.youtube.com/watch?v=abcdefghijk");
  });

  it("devuelve null si la segunda pregunta no tiene video", () => {
    expect(
      urlVideoSegundaPregunta([{ id: "nombre", orden: 1 }, { id: "otra", orden: 2 }], [
        { preguntaId: "otra", archivos: "[]" },
      ]),
    ).toBeNull();
  });

  it("lee el link si está en el valor de la respuesta", () => {
    expect(
      urlVideoSegundaPregunta(
        [
          { id: "nombre", orden: 1 },
          { id: "video", orden: 2 },
        ],
        [{ preguntaId: "video", archivos: "[]", valor: JSON.stringify("https://youtu.be/abcdefghijk") }],
      ),
    ).toBe("https://youtu.be/abcdefghijk");
  });

  it("busca el video en otra pregunta si la segunda no lo tiene", () => {
    expect(
      urlVideoSegundaPregunta(
        [
          { id: "nombre", orden: 1 },
          { id: "texto", orden: 2 },
          { id: "video", orden: 3, permiteVideoLink: true },
        ],
        [
          { preguntaId: "texto", archivos: "[]" },
          {
            preguntaId: "video",
            archivos: JSON.stringify([
              {
                id: "v1",
                kind: "video_link",
                url: "https://vimeo.com/123456789",
                provider: "vimeo",
              },
            ]),
          },
        ],
      ),
    ).toBe("https://vimeo.com/123456789");
  });
});

describe("mapearCasoEvaluacionPitch", () => {
  it("promedia finalizados y deja marcada la pendiente", () => {
    const caso = mapearCasoEvaluacionPitch({
      postulacionId: "p1",
      participanteNombre: "Ana",
      nombreCaso: "Mi pitch",
      videoUrl: "https://youtu.be/abcdefghijk",
      criterios: [
        { id: "c1", nombre: "Claridad", peso: 70 },
        { id: "c2", nombre: "Impacto", peso: 30 },
      ],
      evaluadores: [
        {
          id: "e1",
          nombre: "Eva",
          estado: "FINALIZADA",
          notasPorCriterio: { c1: 4, c2: 2 },
          ponderacion: 3.4,
          comentario: "Bien",
        },
        {
          id: "e2",
          nombre: "Luis",
          estado: "PENDIENTE",
          notasPorCriterio: {},
          ponderacion: null,
          comentario: "",
        },
      ],
    });
    expect(caso.promedioPorCriterio.c1).toBe(4);
    expect(caso.ponderacionPromedio).toBe(3.4);
    expect(caso.hayPendientes).toBe(true);
    expect(caso.pendientesNombres).toEqual(["Luis"]);
    expect(textoNotaPitch(caso.ponderacionPromedio)).toBe("3,4");
  });
});

describe("etiquetaEvaluadoresPitch", () => {
  it("usa pendiente en singular o plural y Todos Ok", () => {
    expect(etiquetaEvaluadoresPitch({ asignados: 3, finalizados: 1 })).toBe("2 Pendientes");
    expect(etiquetaEvaluadoresPitch({ asignados: 3, finalizados: 2 })).toBe("1 Pendiente");
    expect(etiquetaEvaluadoresPitch({ asignados: 3, finalizados: 3 })).toBe("Todos Ok");
  });
});

describe("pasaFiltroEvaluadoresPitch", () => {
  it("separa pendientes y todos ok", () => {
    expect(pasaFiltroEvaluadoresPitch({ asignados: 3, finalizados: 2 }, "")).toBe(true);
    expect(pasaFiltroEvaluadoresPitch({ asignados: 3, finalizados: 2 }, "pendientes")).toBe(true);
    expect(pasaFiltroEvaluadoresPitch({ asignados: 3, finalizados: 3 }, "pendientes")).toBe(false);
    expect(pasaFiltroEvaluadoresPitch({ asignados: 3, finalizados: 3 }, "ok")).toBe(true);
  });
});

describe("pasaFiltroRangoNotaPitch", () => {
  it("filtra por mínimo, máximo o ambos", () => {
    expect(pasaFiltroRangoNotaPitch(3.4, "", "")).toBe(true);
    expect(pasaFiltroRangoNotaPitch(3, "2", "4")).toBe(true);
    expect(pasaFiltroRangoNotaPitch(5, "2", "4")).toBe(false);
    expect(pasaFiltroRangoNotaPitch(3.4, "3,4", "3,4")).toBe(true);
    expect(pasaFiltroRangoNotaPitch(3, "3", "")).toBe(true);
    expect(pasaFiltroRangoNotaPitch(2, "3", "")).toBe(false);
    expect(pasaFiltroRangoNotaPitch(4, "", "3")).toBe(false);
    expect(pasaFiltroRangoNotaPitch(null, "2", "4")).toBe(false);
  });
});

describe("pasaFiltroEvaluadorPitch", () => {
  it("filtra por nombre de evaluador asignado", () => {
    const caso = { evaluadores: [{ nombre: "CausaLab" }, { nombre: "Pamela Ferrand" }] };
    expect(pasaFiltroEvaluadorPitch(caso, "")).toBe(true);
    expect(pasaFiltroEvaluadorPitch(caso, "CausaLab")).toBe(true);
    expect(pasaFiltroEvaluadorPitch(caso, "Juan Jose Villablanca")).toBe(false);
  });
});

describe("compararCasosPitch", () => {
  const base = {
    videoUrl: null,
    evaluadores: [],
    promedioPorCriterio: { c1: null as number | null },
    ponderacionPromedio: null as number | null,
    finalizados: 0,
    asignados: 3,
    hayPendientes: true,
    pendientesNombres: [],
  };

  function caso(parcial: Partial<CasoEvaluacionPitch> & { postulacionId: string; participanteNombre: string }): CasoEvaluacionPitch {
    return {
      nombreCaso: "Caso",
      ...base,
      ...parcial,
    };
  }

  it("ordena por pendientes y deja las notas vacías al final", () => {
    const ana = caso({ postulacionId: "a", participanteNombre: "Ana", asignados: 3, finalizados: 3 });
    const luis = caso({ postulacionId: "b", participanteNombre: "Luis", asignados: 3, finalizados: 1 });
    expect(compararCasosPitch(ana, luis, "evaluadores", "asc")).toBeLessThan(0);
    const conNota = caso({
      postulacionId: "c",
      participanteNombre: "Mia",
      ponderacionPromedio: 2,
    });
    const sinNota = caso({ postulacionId: "d", participanteNombre: "Zoe" });
    expect(compararCasosPitch(conNota, sinNota, "ponderacion", "desc")).toBeLessThan(0);
  });
});

describe("filasExcelLinksVideosPitch", () => {
  it("arma encabezados y filas con nombre, caso y link de video", () => {
    expect(
      filasExcelLinksVideosPitch([
        {
          participanteNombre: "Valentina Godoy Villagra",
          nombreCaso: "Transformación digital",
          videoUrl: "https://youtu.be/abcdefghijk",
        },
        {
          participanteNombre: "Pedro Cabrera",
          nombreCaso: "Borrar no basta",
          videoUrl: null,
        },
      ]),
    ).toEqual([
      ["Nombre del participante", "Nombre del caso", "Link del video pitch"],
      ["Valentina Godoy Villagra", "Transformación digital", "https://youtu.be/abcdefghijk"],
      ["Pedro Cabrera", "Borrar no basta", ""],
    ]);
  });
});
