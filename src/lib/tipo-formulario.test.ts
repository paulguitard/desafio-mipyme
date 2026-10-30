import { describe, expect, it } from "vitest";
import {
  esCargaInformacion,
  esMentoriaContenido,
  mentoriaTieneRevision,
  parseTipoFormulario,
  TIPO_FORMULARIO_LABEL,
} from "@/lib/tipo-formulario";

describe("parseTipoFormulario", () => {
  it("reconoce los tres tipos", () => {
    expect(parseTipoFormulario("FEEDBACK")).toBe("FEEDBACK");
    expect(parseTipoFormulario("CONTENIDO")).toBe("CONTENIDO");
    expect(parseTipoFormulario("CARGA_INFORMACION")).toBe("CARGA_INFORMACION");
  });

  it("no trata carga de información como feedback", () => {
    expect(parseTipoFormulario("CARGA_INFORMACION")).not.toBe("FEEDBACK");
    expect(TIPO_FORMULARIO_LABEL.CARGA_INFORMACION).toBe("Carga de información");
  });
});

describe("helpers de tipo", () => {
  it("marca contenido y carga sin revisión", () => {
    expect(esMentoriaContenido("CONTENIDO")).toBe(true);
    expect(esCargaInformacion("CARGA_INFORMACION")).toBe(true);
    expect(mentoriaTieneRevision("FEEDBACK")).toBe(true);
    expect(mentoriaTieneRevision("CONTENIDO")).toBe(false);
    expect(mentoriaTieneRevision("CARGA_INFORMACION")).toBe(false);
  });
});
