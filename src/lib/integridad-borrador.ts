import type { KindAutoguardado } from "@/lib/autoguardado";

export type CopiaLocalBorrador = {
  savedAt: string;
  versionBase: string;
  fields: Record<string, string | string[]>;
};

/** Quita archivos del FormData; deja texto y metadatos. */
export function formDataSoloTexto(formData: FormData): FormData {
  const out = new FormData();
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    out.append(key, value);
  }
  return out;
}

export function hayArchivosEnFormData(formData: FormData): boolean {
  for (const value of formData.values()) {
    if (value instanceof File && value.size > 0) return true;
  }
  return false;
}

/** FormData solo con ids, versión y archivos nuevos (sin campos valor-*). */
export function formDataSoloArchivos(formData: FormData): FormData {
  const out = new FormData();
  for (const [key, value] of formData.entries()) {
    if (key === "postulacionId" || key === "asignacionId" || key === "kind" || key === "expectedUpdatedAt") {
      if (!(value instanceof File)) out.append(key, value);
      continue;
    }
    if (value instanceof File && value.size > 0) {
      out.append(key, value);
    }
  }
  return out;
}

export function serializarCamposTexto(formData: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    if (key === "kind" || key === "expectedUpdatedAt") continue;
    const texto = String(value);
    const prev = out[key];
    if (prev === undefined) out[key] = texto;
    else if (Array.isArray(prev)) prev.push(texto);
    else out[key] = [prev, texto];
  }
  return out;
}

export function claveCopiaLocal(kind: KindAutoguardado, id: string) {
  return `borrador-local:${kind}:${id}`;
}

export function debeRestaurarCopiaLocal(args: {
  copiaSavedAt: string;
  serverUpdatedAt: string;
  versionBase: string;
}) {
  const copiaMs = Date.parse(args.copiaSavedAt);
  const serverMs = Date.parse(args.serverUpdatedAt);
  if (!Number.isFinite(copiaMs) || !Number.isFinite(serverMs)) return false;
  if (copiaMs <= serverMs) return false;
  // Si el servidor avanzó desde la base que tenía la copia, la copia puede estar obsoleta
  // solo cuando el servidor es más nuevo que la copia (ya filtrado). Restaurar si la copia
  // es más reciente que lo guardado en servidor.
  return true;
}

export function hayConflictoVersion(
  expectedUpdatedAt: string | null | undefined,
  actualIso: string,
) {
  return Boolean(expectedUpdatedAt && expectedUpdatedAt !== actualIso);
}

/** Campo ausente en FormData: no pisar un valor ya persistido. */
export function campoAusenteMantieneValor(
  bruto: FormDataEntryValue | null,
  valorExistente: string | null,
) {
  return bruto == null && valorExistente != null;
}

/** Quita adjuntos con el mismo nombre (minúsculas) antes de agregar el nuevo. */
export function filtrarAdjuntosMismoNombre<T extends { originalName?: string; kind?: string }>(
  archivos: T[],
  nombreNuevo: string,
): T[] {
  const nombre = nombreNuevo.trim().toLowerCase();
  return archivos.filter((item) => {
    if (!item.originalName) return true;
    return item.originalName.trim().toLowerCase() !== nombre;
  });
}

export function mensajeErrorEnvio(args: { borradorGuardado: boolean; sinRed?: boolean }) {
  if (args.borradorGuardado) {
    return "No se pudo enviar. Tu borrador quedó guardado.";
  }
  if (args.sinRed) {
    return "No se pudo enviar. El texto sigue en esta pantalla.";
  }
  return "No se pudo enviar. El texto sigue en esta pantalla.";
}

export function mensajeErrorGuardado() {
  return "No se pudo guardar. El texto sigue en esta pantalla.";
}

export function esResultadoBorradorOk(
  resultado: { ok: true; updatedAt: string } | { skipped: true } | { error: string } | { conflict: true; updatedAt: string } | null | undefined,
): resultado is { ok: true; updatedAt: string } {
  return Boolean(
    resultado &&
      typeof resultado === "object" &&
      "ok" in resultado &&
      (resultado as { ok?: unknown }).ok === true &&
      "updatedAt" in resultado &&
      typeof (resultado as { updatedAt?: unknown }).updatedAt === "string",
  );
}

export function decisionAlDesactivarHook(args: { sucio: boolean }) {
  return {
    limpiarSucio: !args.sucio,
    detenerTimer: !args.sucio,
  } as const;
}

export function decisionMarcarLimpio(args: { huboCambiosDuranteVuelo: boolean }) {
  if (args.huboCambiosDuranteVuelo) {
    return { limpiar: false, sucio: true } as const;
  }
  return { limpiar: true, sucio: false } as const;
}

export function leerCopiaLocal(
  storage: Pick<Storage, "getItem"> | null | undefined,
  kind: KindAutoguardado,
  id: string,
): CopiaLocalBorrador | null {
  if (!storage || !id) return null;
  try {
    const raw = storage.getItem(claveCopiaLocal(kind, id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CopiaLocalBorrador>;
    if (
      !parsed ||
      typeof parsed.savedAt !== "string" ||
      typeof parsed.versionBase !== "string" ||
      !parsed.fields ||
      typeof parsed.fields !== "object"
    ) {
      return null;
    }
    return parsed as CopiaLocalBorrador;
  } catch {
    return null;
  }
}

export function escribirCopiaLocal(
  storage: Pick<Storage, "setItem"> | null | undefined,
  kind: KindAutoguardado,
  id: string,
  args: { versionBase: string; formData: FormData },
) {
  if (!storage || !id) return;
  const copia: CopiaLocalBorrador = {
    savedAt: new Date().toISOString(),
    versionBase: args.versionBase,
    fields: serializarCamposTexto(args.formData),
  };
  try {
    storage.setItem(claveCopiaLocal(kind, id), JSON.stringify(copia));
  } catch {
    // quota / private mode
  }
}

export function borrarCopiaLocal(
  storage: Pick<Storage, "removeItem"> | null | undefined,
  kind: KindAutoguardado,
  id: string,
) {
  if (!storage || !id) return;
  try {
    storage.removeItem(claveCopiaLocal(kind, id));
  } catch {
    // ignore
  }
}

/** Aplica campos de texto al formulario y avisa a editores ricos. */
export function aplicarCopiaAlFormulario(
  form: HTMLFormElement,
  fields: Record<string, string | string[]>,
) {
  for (const [name, value] of Object.entries(fields)) {
    const values = Array.isArray(value) ? value : [value];
    const nodes = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      `[name="${CSS.escape(name)}"]`,
    );
    if (nodes.length === 0) {
      form.dispatchEvent(
        new CustomEvent("borrador:restaurar", { detail: { name, value: values[0] ?? "" } }),
      );
      continue;
    }
    if (nodes.length > 1 || (nodes[0] instanceof HTMLInputElement && nodes[0].type === "checkbox")) {
      const setVals = new Set(values);
      for (const node of nodes) {
        if (node instanceof HTMLInputElement && (node.type === "checkbox" || node.type === "radio")) {
          node.checked = setVals.has(node.value);
        }
      }
    } else {
      const node = nodes[0];
      node.value = values[0] ?? "";
    }
    form.dispatchEvent(
      new CustomEvent("borrador:restaurar", { detail: { name, value: values[0] ?? "" } }),
    );
  }
  form.dispatchEvent(new Event("input", { bubbles: true }));
}
