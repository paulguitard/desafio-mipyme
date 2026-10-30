import { describe, expect, it } from "vitest";
import {
  conLimitesAdjuntos,
  conOcultarTextbox,
  parseConfigAdjuntos,
  recortarAdjuntosAlTope,
  type StoredAttachment,
} from "@/lib/preguntas";

function archivo(id: string, kind: "file" | "image"): StoredAttachment {
  return {
    id,
    originalName: `${id}.pdf`,
    mimeType: "application/pdf",
    kind,
    relativePath: id,
  };
}

function video(id: string): StoredAttachment {
  return { id, kind: "video_link", url: `https://youtu.be/${id}`, provider: "youtube" };
}

describe("límites de adjuntos", () => {
  it("lee topes en el JSON de opciones", () => {
    expect(parseConfigAdjuntos("[]")).toEqual({});
    expect(
      parseConfigAdjuntos(JSON.stringify({ maxArchivos: 2, maxImagenes: 1, maxVideos: 3 })),
    ).toEqual({ maxArchivos: 2, maxImagenes: 1, maxVideos: 3 });
    expect(parseConfigAdjuntos(JSON.stringify({ maxArchivos: 0 }))).toEqual({
      maxArchivos: null,
      maxImagenes: null,
      maxVideos: null,
    });
  });

  it("agrega y quita topes sin perder el resto de la config", () => {
    const conLimite = JSON.stringify({ maxCaracteres: 20, ocultarTextbox: true });
    const conTope = conLimitesAdjuntos(conLimite, { maxArchivos: 2, maxVideos: 1 });
    expect(JSON.parse(conTope)).toMatchObject({
      maxCaracteres: 20,
      ocultarTextbox: true,
      maxArchivos: 2,
      maxVideos: 1,
    });
    expect(JSON.parse(conLimitesAdjuntos(conTope, {}))).toEqual({
      maxCaracteres: 20,
      ocultarTextbox: true,
    });
  });

  it("convive con el flag de ocultar textbox sobre un listado", () => {
    const conFlag = conOcultarTextbox(JSON.stringify(["A", "B"]), true);
    const conTope = conLimitesAdjuntos(conFlag, { maxImagenes: 1 });
    expect(JSON.parse(conTope)).toEqual({
      opciones: ["A", "B"],
      ocultarTextbox: true,
      maxImagenes: 1,
    });
  });

  it("recorta por tipo y conserva los más recientes", () => {
    const recortados = recortarAdjuntosAlTope(
      [
        archivo("d1", "file"),
        archivo("d2", "file"),
        archivo("d3", "file"),
        archivo("i1", "image"),
        video("v1"),
        video("v2"),
      ],
      { maxArchivos: 2, maxImagenes: 1, maxVideos: 1 },
    );
    expect(recortados.map((item) => item.id)).toEqual(["i1", "d2", "d3", "v2"]);
  });
});
