import { describe, expect, it } from "vitest";
import {
  absolutizarUrlPdf,
  ajustarCorteSinPartirTexto,
  CASO_PDF_DOC_WIDTH,
  LETTER_H_MM,
  LETTER_W_MM,
  nombreArchivoCasoPdf,
  rectHotspotEnPaginaMm,
  slugArchivoPdf,
  type PdfLinkHotspot,
} from "@/lib/caso-pdf";

describe("slugArchivoPdf", () => {
  it("normaliza acentos y espacios", () => {
    expect(slugArchivoPdf("La cordonería: un barrio")).toBe("La-cordoneria-un-barrio");
  });

  it("usa fallback si queda vacío", () => {
    expect(slugArchivoPdf("@@@")).toBe("caso");
  });
});

describe("nombreArchivoCasoPdf", () => {
  it("combina caso y participante", () => {
    expect(
      nombreArchivoCasoPdf({
        nombreCaso: "Mi caso demo",
        emprendedorNombre: "Marjorie Ulloa",
      }),
    ).toBe("Mi-caso-demo-Marjorie-Ulloa.pdf");
  });
});

describe("absolutizarUrlPdf", () => {
  it("deja intactas las URLs absolutas", () => {
    expect(absolutizarUrlPdf("https://youtu.be/abc", "https://app.example")).toBe(
      "https://youtu.be/abc",
    );
  });

  it("antepone el origen a rutas relativas", () => {
    expect(absolutizarUrlPdf("/api/archivos/foo/bar.png", "https://app.example/")).toBe(
      "https://app.example/api/archivos/foo/bar.png",
    );
  });
});

describe("ajustarCorteSinPartirTexto", () => {
  it("solo mueve la fila cortada, no el resto de la respuesta", () => {
    const lineas = [
      { top: 800, bottom: 824 },
      { top: 828, bottom: 852 },
      { top: 856, bottom: 880 },
      { top: 884, bottom: 908 },
    ];
    // El corte ideal parte la 3ª fila → esa fila empieza en la página siguiente.
    expect(ajustarCorteSinPartirTexto(0, 870, 2000, lineas)).toBe(856);
  });

  it("no mueve el corte si cae entre filas", () => {
    const lineas = [
      { top: 0, bottom: 24 },
      { top: 40, bottom: 64 },
    ];
    expect(ajustarCorteSinPartirTexto(0, 30, 2000, lineas)).toBe(30);
  });

  it("con fila anclada al inicio, cierra en la última fila completa antes del target", () => {
    const lineas = [
      { top: 0, bottom: 24 },
      { top: 28, bottom: 52 },
      { top: 56, bottom: 80 },
    ];
    // target parte la 2ª fila (28-52), que está anclada cerca del inicio → corte al fin de la 1ª.
    expect(ajustarCorteSinPartirTexto(0, 40, 2000, lineas)).toBe(24);
  });

  it("mueve una miniatura completa a la página siguiente si el corte la atraviesa", () => {
    const miniaturas = [
      { top: 900, bottom: 1020 },
      { top: 1040, bottom: 1160 },
    ];
    // target 1000 parte la primera miniatura (900-1020) → corte al inicio de esa miniatura.
    expect(ajustarCorteSinPartirTexto(0, 1000, 2000, miniaturas)).toBe(900);
  });
});

describe("rectHotspotEnPaginaMm", () => {
  const pageHeightDom = (LETTER_H_MM / LETTER_W_MM) * CASO_PDF_DOC_WIDTH;

  it("mapea el rectángulo visible de la miniatura a milímetros de la página", () => {
    const hotspot: PdfLinkHotspot = {
      url: "https://app.example/api/archivos/x.png",
      top: 100,
      bottom: 220,
      left: 40,
      right: 160,
    };
    const corte = { y: 0, height: pageHeightDom };
    const rect = rectHotspotEnPaginaMm(hotspot, corte);

    expect(rect).not.toBeNull();
    expect(rect!.x).toBeCloseTo((40 / CASO_PDF_DOC_WIDTH) * LETTER_W_MM, 5);
    expect(rect!.w).toBeCloseTo((120 / CASO_PDF_DOC_WIDTH) * LETTER_W_MM, 5);
    expect(rect!.y).toBeCloseTo((100 / pageHeightDom) * LETTER_H_MM, 5);
    expect(rect!.h).toBeCloseTo((120 / pageHeightDom) * LETTER_H_MM, 5);
  });

  it("devuelve null si la miniatura queda fuera de la página", () => {
    const hotspot: PdfLinkHotspot = {
      url: "https://youtu.be/abc",
      top: 1200,
      bottom: 1320,
      left: 10,
      right: 100,
    };
    const corte = { y: 0, height: 800 };
    expect(rectHotspotEnPaginaMm(hotspot, corte)).toBeNull();
  });

  it("recorta al tramo visible cuando la miniatura cruza el borde de la página", () => {
    const hotspot: PdfLinkHotspot = {
      url: "https://app.example/api/archivos/doc.xlsx",
      top: 750,
      bottom: 900,
      left: 0,
      right: 100,
    };
    const corte = { y: 0, height: 800 };
    const rect = rectHotspotEnPaginaMm(hotspot, corte);
    expect(rect).not.toBeNull();
    // Solo los 50px visibles (750-800) se mapean.
    expect(rect!.y).toBeCloseTo((750 / pageHeightDom) * LETTER_H_MM, 5);
    expect(rect!.h).toBeCloseTo((50 / pageHeightDom) * LETTER_H_MM, 5);
  });
});
