import { describe, expect, it } from "vitest";
import { esTokenPublicoValido, generarTokenPublico, rutaFichaPublica, withFichaToken } from "@/lib/ficha-publica";

describe("ficha publica", () => {
  it("generates an opaque url-safe token", () => {
    const token = generarTokenPublico();
    expect(esTokenPublicoValido(token)).toBe(true);
    expect(rutaFichaPublica(token)).toBe(`/ficha/${token}`);
  });

  it("rejects short or odd tokens", () => {
    expect(esTokenPublicoValido("abc")).toBe(false);
    expect(esTokenPublicoValido("../secret")).toBe(false);
  });

  it("appends the token only to local upload urls", () => {
    const token = "abcdefghijklmnopqrstuvwxyz012345";
    expect(withFichaToken("/api/archivos/a/b", token)).toBe(
      `/api/archivos/a/b?ficha=${token}`,
    );
    expect(withFichaToken("/api/archivos/a/b?w=1200", token)).toBe(
      `/api/archivos/a/b?w=1200&ficha=${token}`,
    );
    expect(withFichaToken("https://cdn.example/x", token)).toBe("https://cdn.example/x");
  });
});
