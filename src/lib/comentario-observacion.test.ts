import { describe, expect, it } from "vitest";
import {
  htmlDesdeTextoPlano,
  htmlParaVistaComentario,
  sanitizarComentarioObservacion,
} from "@/lib/comentario-observacion";

describe("htmlDesdeTextoPlano", () => {
  it("conserva saltos de línea como br y párrafos", () => {
    expect(htmlDesdeTextoPlano("uno\ndos\n\ntres")).toBe("<p>uno<br>dos</p><p>tres</p>");
  });

  it("escapa HTML del texto plano", () => {
    expect(htmlDesdeTextoPlano("<script>x</script>")).toBe(
      "<p>&lt;script&gt;x&lt;/script&gt;</p>",
    );
  });
});

describe("htmlParaVistaComentario", () => {
  it("deja pasar HTML del editor", () => {
    expect(htmlParaVistaComentario("<p><strong>Hola</strong></p>")).toBe(
      "<p><strong>Hola</strong></p>",
    );
  });

  it("convierte comentarios viejos sin tags", () => {
    expect(htmlParaVistaComentario("línea 1\nlínea 2")).toBe("<p>línea 1<br>línea 2</p>");
  });
});

describe("sanitizarComentarioObservacion", () => {
  it("quita destacados y deja el texto", () => {
    const clean = sanitizarComentarioObservacion(
      '<p><mark data-color="#fef08a" style="background-color: #fef08a">Hola</mark></p>',
    );
    expect(clean).not.toMatch(/mark/i);
    expect(clean).toContain("Hola");
  });

  it("deja vacío un párrafo sin texto", () => {
    expect(sanitizarComentarioObservacion("<p></p>")).toBe("");
    expect(sanitizarComentarioObservacion("<p><br></p>")).toBe("");
  });

  it("quita tamaño y alineación y deja el texto", () => {
    const clean = sanitizarComentarioObservacion(
      '<p style="text-align: center"><span style="font-size: 1.25rem"><strong>Hola</strong></span></p>',
    );
    expect(clean).not.toMatch(/font-size|text-align|span/i);
    expect(clean).toContain("<strong>Hola</strong>");
  });
});
