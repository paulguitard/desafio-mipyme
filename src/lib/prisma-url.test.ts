import { describe, expect, it } from "vitest";
import { ajustarUrlPrisma } from "@/lib/prisma-url";

describe("ajustarUrlPrisma", () => {
  it("en desarrollo sube connection_limit=1 para no bloquear el login", () => {
    const url =
      "postgresql://u:p@localhost:6543/postgres?pgbouncer=true&connection_limit=1";
    const next = ajustarUrlPrisma(url, "development");
    expect(next).toContain("connection_limit=5");
    expect(next).toContain("pgbouncer=true");
    expect(next).toContain("pool_timeout=20");
  });

  it("en producción no toca la URL", () => {
    const url =
      "postgresql://u:p@localhost:6543/postgres?pgbouncer=true&connection_limit=1";
    expect(ajustarUrlPrisma(url, "production")).toBe(url);
  });
});
