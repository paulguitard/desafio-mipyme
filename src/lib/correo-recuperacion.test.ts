import { describe, expect, it } from "vitest";
import { DEFAULT_CORREO_RECUPERACION, renderCorreoRecuperacion } from "@/lib/correo-recuperacion";

describe("renderCorreoRecuperacion", () => {
  it("keeps the card from stretching past the banner in Outlook", () => {
    const rendered = renderCorreoRecuperacion(
      DEFAULT_CORREO_RECUPERACION,
      {
        nombre: "Ana",
        enlace: "http://localhost:3000/participante/postulaciones/cmurb1d2j0001l404iyyxuwa5",
      },
      "https://example.com/banner.png",
    );
    expect(rendered.html).toContain("table-layout:fixed");
    expect(rendered.html).toContain("overflow-wrap:anywhere");
    expect(rendered.html).toContain("max-width:100%");
  });
});
