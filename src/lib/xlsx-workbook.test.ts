import { describe, expect, it } from "vitest";
import { workbookXlsx } from "@/lib/xlsx-workbook";

describe("workbookXlsx", () => {
  it("genera un zip xlsx con la hoja y las celdas", () => {
    const bytes = workbookXlsx("Perfiles", [
      ["Nombre", "WhatsApp"],
      ["Ada", "Sí"],
    ]);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    const texto = new TextDecoder().decode(bytes);
    expect(texto).toContain("xl/worksheets/sheet1.xml");
    expect(texto).toContain("Ada");
    expect(texto).toContain("name=\"Perfiles\"");
  });
});
