import { describe, expect, it } from "vitest";
import { ajustarCorteSinPartirTexto, nombreArchivoCasoPdf, slugArchivoPdf } from "@/lib/caso-pdf";

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
});
