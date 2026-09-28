import { describe, expect, it } from "vitest";
import { parseUsuariosCsv } from "@/lib/usuarios-csv";

describe("parseUsuariosCsv", () => {
  it("rejects Administración role", () => {
    const text = [
      "nombre,correo,contraseña,rol,escuela",
      "Ada,ada@ejemplo.com,ClaveSegura1,Administración,",
    ].join("\n");
    const parsed = parseUsuariosCsv(text);
    expect(parsed.usuarios).toHaveLength(0);
    expect(parsed.errores[0]?.mensaje).toMatch(/Administración/);
  });

  it("accepts participante with a valid password", () => {
    const text = [
      "nombre,correo,contraseña,rol,escuela",
      "Ada,ada@ejemplo.com,ClaveSegura1,Participante,",
    ].join("\n");
    const parsed = parseUsuariosCsv(text);
    expect(parsed.usuarios).toHaveLength(1);
    expect(parsed.usuarios[0]?.role).toBe("EMPRENDEDOR");
  });

  it("guarda el correo en minúsculas", () => {
    const text = [
      "nombre,correo,contraseña,rol,escuela",
      "Ada,ADA@Ejemplo.COM,ClaveSegura1,Participante,",
    ].join("\n");
    const parsed = parseUsuariosCsv(text);
    expect(parsed.usuarios[0]?.email).toBe("ada@ejemplo.com");
  });
});
