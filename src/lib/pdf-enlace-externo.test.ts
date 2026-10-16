import { describe, expect, it } from "vitest";
import {
  inyectarNewWindowEnAnotacionesUri,
  parseDestinoAdjuntoPdf,
  scriptAperturaAdjuntoPdf,
  urlAbridorEnlacePdf,
} from "@/lib/pdf-enlace-externo";

describe("parseDestinoAdjuntoPdf", () => {
  const origen = "https://app.example";

  it("acepta archivos del mismo origen", () => {
    expect(parseDestinoAdjuntoPdf("https://app.example/api/archivos/desafio-aiep/a.webp", origen)).toBe(
      "https://app.example/api/archivos/desafio-aiep/a.webp",
    );
  });

  it("acepta links de video conocidos", () => {
    expect(parseDestinoAdjuntoPdf("https://youtu.be/dQw4w9WgXcQ", origen)).toBe(
      "https://youtu.be/dQw4w9WgXcQ",
    );
  });

  it("rechaza javascript y orígenes ajenos", () => {
    expect(parseDestinoAdjuntoPdf("javascript:alert(1)", origen)).toBeNull();
    expect(parseDestinoAdjuntoPdf("https://evil.test/api/archivos/x", origen)).toBeNull();
  });
});

describe("urlAbridorEnlacePdf", () => {
  it("envuelve el destino en la ruta de apertura", () => {
    expect(urlAbridorEnlacePdf("https://youtu.be/abc", "https://app.example/")).toBe(
      "https://app.example/abrir-enlace?to=https%3A%2F%2Fyoutu.be%2Fabc",
    );
  });
});

describe("scriptAperturaAdjuntoPdf", () => {
  it("abre el destino en otra pestaña y vuelve atrás", () => {
    const src = scriptAperturaAdjuntoPdf("https://app.example/api/archivos/a.webp");
    expect(src).toContain("https://app.example/api/archivos/a.webp");
    expect(src).toContain('window.open(dest, "_blank")');
    expect(src).toContain("history.back()");
    expect(src).not.toContain("location.replace");
  });
});

describe("inyectarNewWindowEnAnotacionesUri", () => {
  it("marca las acciones URI para abrir el abridor en otra ventana", () => {
    const src = "/A <</S /URI /URI (https://example.com) >>";
    const bytes = Uint8Array.from(src, (ch) => ch.charCodeAt(0));
    const out = inyectarNewWindowEnAnotacionesUri(bytes);
    const text = String.fromCharCode(...out);
    expect(text).toContain("/S /URI /NewWindow true /URI (https://example.com)");
  });
});
