import { describe, expect, it } from "vitest";
import {
  errorDeResultado,
  plegarConfirmados,
  vistaOptimista,
  type ParchePendiente,
} from "@/lib/use-dato-optimista";

describe("errorDeResultado", () => {
  it("lee el mensaje de error de una acción", () => {
    expect(errorDeResultado({ error: "Ya existe." })).toBe("Ya existe.");
    expect(errorDeResultado({ ok: true })).toBeNull();
    expect(errorDeResultado(undefined)).toBeNull();
  });
});

describe("parches concurrentes", () => {
  it("aplica los parches en orden sobre la base", () => {
    const pending: ParchePendiente<number[]>[] = [
      { id: 1, confirmed: false, apply: (prev) => [...prev, 1] },
      { id: 2, confirmed: false, apply: (prev) => [...prev, 2] },
    ];
    expect(vistaOptimista([], pending)).toEqual([1, 2]);
  });

  it("al confirmar el primero lo pliega y deja el segundo pendiente", () => {
    const pending: ParchePendiente<number[]>[] = [
      { id: 1, confirmed: true, apply: (prev) => [...prev, 1] },
      { id: 2, confirmed: false, apply: (prev) => [...prev, 2] },
    ];
    const plegado = plegarConfirmados([], pending);
    expect(plegado.baseline).toEqual([1]);
    expect(plegado.pending).toHaveLength(1);
    expect(vistaOptimista(plegado.baseline, plegado.pending)).toEqual([1, 2]);
  });

  it("quitar un parche del medio no deshace los demás", () => {
    const pending: ParchePendiente<number[]>[] = [
      { id: 1, confirmed: false, apply: (prev) => [...prev, 1] },
      { id: 3, confirmed: false, apply: (prev) => [...prev, 3] },
    ];
    expect(vistaOptimista([], pending)).toEqual([1, 3]);
  });
});
