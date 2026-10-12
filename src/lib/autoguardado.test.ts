import { describe, expect, it } from "vitest";
import {
  AUTOGUARDADO_INTERVALO_MS,
  decisionAlDesactivar,
  decisionMarcarLimpioTrasOk,
  decisionTickReloj,
  decisionTrasGuardado,
  debeIniciarReloj,
  debePersistirCampoRevision,
} from "@/lib/autoguardado";
import {
  campoAusenteMantieneValor,
  debeRestaurarCopiaLocal,
  decisionAlDesactivarHook,
  esResultadoBorradorOk,
  filtrarAdjuntosMismoNombre,
  formDataSoloTexto,
  hayConflictoVersion,
  mensajeErrorEnvio,
  mensajeErrorGuardado,
} from "@/lib/integridad-borrador";

describe("reloj de autoguardado", () => {
  it("usa un intervalo de 3 minutos", () => {
    expect(AUTOGUARDADO_INTERVALO_MS).toBe(180_000);
  });

  it("arranca el reloj solo con el primer cambio", () => {
    expect(debeIniciarReloj(false)).toBe(true);
    expect(debeIniciarReloj(true)).toBe(false);
  });

  it("en cada tick guarda si hay cambios y no hay petición en curso", () => {
    expect(decisionTickReloj({ sucio: true, enVuelo: false })).toEqual({
      guardar: true,
      detener: false,
    });
    expect(decisionTickReloj({ sucio: true, enVuelo: true })).toEqual({
      guardar: false,
      detener: false,
    });
    expect(decisionTickReloj({ sucio: false, enVuelo: false })).toEqual({
      guardar: false,
      detener: true,
    });
  });

  it("tras guardar mantiene el reloj si hubo cambios durante la petición", () => {
    expect(
      decisionTrasGuardado({ huboCambiosDuranteVuelo: true, timerActivo: true }),
    ).toEqual({ sucio: true, mantenerTimer: true });
    expect(
      decisionTrasGuardado({ huboCambiosDuranteVuelo: false, timerActivo: true }),
    ).toEqual({ sucio: false, mantenerTimer: false });
  });

  it("al desactivar el hook no limpia si sigue sucio", () => {
    expect(decisionAlDesactivar({ sucio: true })).toEqual({
      limpiarSucio: false,
      detenerTimer: false,
    });
    expect(decisionAlDesactivar({ sucio: false })).toEqual({
      limpiarSucio: true,
      detenerTimer: true,
    });
    expect(decisionAlDesactivarHook({ sucio: true }).limpiarSucio).toBe(false);
  });

  it("marcarLimpio no limpia si hubo edición durante la petición", () => {
    expect(decisionMarcarLimpioTrasOk({ huboCambiosDuranteVuelo: true })).toEqual({
      limpiar: false,
    });
    expect(decisionMarcarLimpioTrasOk({ huboCambiosDuranteVuelo: false })).toEqual({
      limpiar: true,
    });
  });
});

describe("integridad de borrador", () => {
  it("quita archivos del FormData para keepalive / solo texto", () => {
    const form = new FormData();
    form.set("postulacionId", "abc");
    form.set("valor-1", "<p>hola</p>");
    form.set("archivo-1", new File(["x"], "captura.png", { type: "image/png" }));
    const solo = formDataSoloTexto(form);
    expect(solo.get("postulacionId")).toBe("abc");
    expect(solo.get("valor-1")).toBe("<p>hola</p>");
    expect(solo.get("archivo-1")).toBeNull();
  });

  it("detecta conflicto de versión", () => {
    expect(hayConflictoVersion("2020-01-01T00:00:00.000Z", "2020-01-02T00:00:00.000Z")).toBe(
      true,
    );
    expect(hayConflictoVersion("2020-01-01T00:00:00.000Z", "2020-01-01T00:00:00.000Z")).toBe(
      false,
    );
    expect(hayConflictoVersion(null, "2020-01-01T00:00:00.000Z")).toBe(false);
  });

  it("un valor ausente mantiene el existente", () => {
    expect(campoAusenteMantieneValor(null, '"texto"')).toBe(true);
    expect(campoAusenteMantieneValor("", '"texto"')).toBe(false);
    expect(campoAusenteMantieneValor(null, null)).toBe(false);
  });

  it("reemplaza adjuntos con el mismo nombre", () => {
    const prev = [
      { originalName: "Captura.PNG", id: "1" },
      { originalName: "otro.pdf", id: "2" },
      { kind: "video_link", url: "https://youtu.be/x" },
    ];
    const next = filtrarAdjuntosMismoNombre(prev, "captura.png");
    expect(next).toHaveLength(2);
    expect(next.map((item) => ("originalName" in item ? item.originalName : item.kind))).toEqual([
      "otro.pdf",
      "video_link",
    ]);
  });

  it("mensaje de envío distingue borrador guardado", () => {
    expect(mensajeErrorEnvio({ borradorGuardado: true })).toBe(
      "No se pudo enviar. Tu borrador quedó guardado.",
    );
    expect(mensajeErrorEnvio({ borradorGuardado: false, sinRed: true })).toBe(
      "No se pudo enviar. El texto sigue en esta pantalla.",
    );
    expect(mensajeErrorGuardado()).toContain("sigue en esta pantalla");
  });

  it("restaura copia local solo si es más nueva que el servidor", () => {
    expect(
      debeRestaurarCopiaLocal({
        copiaSavedAt: "2026-10-12T18:00:00.000Z",
        serverUpdatedAt: "2026-10-12T17:00:00.000Z",
        versionBase: "2026-10-12T16:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      debeRestaurarCopiaLocal({
        copiaSavedAt: "2026-10-12T16:00:00.000Z",
        serverUpdatedAt: "2026-10-12T17:00:00.000Z",
        versionBase: "2026-10-12T16:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("reconoce un borrador ok frente a skipped o error", () => {
    expect(esResultadoBorradorOk({ ok: true, updatedAt: "t" })).toBe(true);
    expect(esResultadoBorradorOk({ skipped: true })).toBe(false);
    expect(esResultadoBorradorOk({ error: "x" })).toBe(false);
  });
});

describe("persistencia de revisión en borrador", () => {
  it("guarda comentario o nota aunque falte el veredicto", () => {
    expect(
      debePersistirCampoRevision({
        veredicto: "",
        comentario: "<p>hola</p>",
        nota: null,
        permitirSinVeredicto: true,
      }),
    ).toBe(true);
    expect(
      debePersistirCampoRevision({
        veredicto: "",
        comentario: "",
        nota: 4,
        permitirSinVeredicto: true,
      }),
    ).toBe(true);
  });

  it("no crea fila vacía sin veredicto, comentario ni nota", () => {
    expect(
      debePersistirCampoRevision({
        veredicto: "",
        comentario: "",
        nota: null,
        permitirSinVeredicto: true,
      }),
    ).toBe(false);
  });

  it("sin permitirSinVeredicto exige OK u OBSERVACION", () => {
    expect(
      debePersistirCampoRevision({
        veredicto: "",
        comentario: "<p>hola</p>",
        nota: 3,
        permitirSinVeredicto: false,
      }),
    ).toBe(false);
    expect(
      debePersistirCampoRevision({
        veredicto: "OK",
        comentario: "",
        nota: null,
        permitirSinVeredicto: false,
      }),
    ).toBe(true);
  });
});
