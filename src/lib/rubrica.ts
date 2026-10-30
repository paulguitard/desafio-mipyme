export const ESCALA_RUBRICA_DEFAULT = [1, 2, 3, 4, 5] as const;
export const ESCALA_RUBRICA_1_A_4 = [1, 2, 3, 4] as const;
export const ESCALA_RUBRICA_1_A_5 = [1, 2, 3, 4, 5] as const;

export type NivelRubrica = {
  titulo: string;
  detalle: string;
};

export type ExplicacionesRubrica = Record<string, NivelRubrica>;

export type CriterioRubricaDatos = {
  id: string;
  orden: number;
  nombre: string;
  preguntaGuia: string;
  detalle: string;
  peso: number;
  explicaciones: ExplicacionesRubrica;
};

export type RubricaDatos = {
  escala: number[];
  criterios: CriterioRubricaDatos[];
};

export function parseEscalaRubrica(raw: unknown): number[] {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [...ESCALA_RUBRICA_DEFAULT];
    }
  }
  if (!Array.isArray(parsed)) return [...ESCALA_RUBRICA_DEFAULT];
  const valores = parsed
    .map((item) => Number(item))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 20);
  const unicos = [...new Set(valores)].sort((a, b) => a - b);
  return unicos.length >= 2 ? unicos : [...ESCALA_RUBRICA_DEFAULT];
}

export function serializeEscalaRubrica(escala: number[]): string {
  return JSON.stringify(parseEscalaRubrica(escala));
}

export function parseNivelRubrica(raw: unknown): NivelRubrica {
  if (typeof raw === "string") {
    return { titulo: "", detalle: raw.trim() };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { titulo: "", detalle: "" };
  }
  const row = raw as Record<string, unknown>;
  const detalle = String(row.detalle ?? row.texto ?? row.explicacion ?? "").trim();
  return {
    titulo: String(row.titulo ?? "").trim(),
    detalle,
  };
}

export function parseExplicacionesRubrica(raw: unknown): ExplicacionesRubrica {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out: ExplicacionesRubrica = {};
  for (const [clave, valor] of Object.entries(parsed as Record<string, unknown>)) {
    out[clave] = parseNivelRubrica(valor);
  }
  return out;
}

export function serializeExplicacionesRubrica(explicaciones: ExplicacionesRubrica): string {
  return JSON.stringify(parseExplicacionesRubrica(explicaciones));
}

export function nivelRubrica(explicaciones: ExplicacionesRubrica, valor: number): NivelRubrica {
  return explicaciones[String(valor)] ?? { titulo: "", detalle: "" };
}

export function etiquetaNivelRubrica(valor: number, nivel?: NivelRubrica | null): string {
  const titulo = nivel?.titulo?.trim();
  return titulo ? `${valor} · ${titulo}` : `Nota ${valor}`;
}

export function sumaPesosRubrica(criterios: { peso: number }[]): number {
  return criterios.reduce((acc, item) => acc + (Number.isFinite(item.peso) ? Math.floor(item.peso) : 0), 0);
}

export function validarRubrica(rubrica: {
  escala: number[];
  criterios: {
    nombre: string;
    preguntaGuia: string;
    peso: number;
    explicaciones: ExplicacionesRubrica | Record<string, unknown>;
  }[];
}): string | null {
  const escala = parseEscalaRubrica(rubrica.escala);
  if (escala.length < 2) return "La escala necesita al menos dos notas.";
  if (rubrica.criterios.length === 0) return "Agrega al menos un criterio.";
  for (const [index, criterio] of rubrica.criterios.entries()) {
    const n = index + 1;
    if (!criterio.nombre.trim()) return `El criterio ${n} necesita un nombre.`;
    if (!criterio.preguntaGuia.trim()) return `El criterio ${n} necesita una pregunta guía.`;
    const peso = Math.floor(Number(criterio.peso));
    if (!Number.isFinite(peso) || peso < 1) {
      return `El criterio ${n} necesita un peso relativo de al menos 1%.`;
    }
    const explicaciones = parseExplicacionesRubrica(criterio.explicaciones);
    for (const valor of escala) {
      const nivel = nivelRubrica(explicaciones, valor);
      if (!nivel.titulo) {
        return `El criterio ${n} necesita el título de la nota ${valor}.`;
      }
      if (!nivel.detalle) {
        return `El criterio ${n} necesita la explicación de la nota ${valor}.`;
      }
    }
  }
  const suma = sumaPesosRubrica(rubrica.criterios);
  if (suma !== 100) {
    return `Los pesos deben sumar 100%. Ahora suman ${suma}%.`;
  }
  return null;
}

export function notaPonderadaRubrica(
  criterios: { peso: number; nota: number | null | undefined }[],
): number | null {
  if (criterios.length === 0) return null;
  if (criterios.some((item) => item.nota == null || !Number.isFinite(item.nota))) return null;
  const suma = criterios.reduce((acc, item) => acc + Number(item.nota) * Math.floor(item.peso), 0);
  return suma / 100;
}

export function redondearNotaRubrica(nota: number): number {
  return Math.round(nota * 10) / 10;
}

export function formatearNotaRubrica(nota: number | null | undefined): string {
  if (nota == null || !Number.isFinite(nota)) return "";
  const redondeada = redondearNotaRubrica(nota);
  return redondeada.toFixed(1).replace(".", ",");
}

/** Promedio simple de las notas finales. Solo si todos los evaluadores asignados finalizaron. */
export function promedioNotasRubrica(args: {
  notas: (number | null | undefined)[];
  todosFinalizaron: boolean;
}): number | null {
  if (!args.todosFinalizaron || args.notas.length === 0) return null;
  if (args.notas.some((nota) => nota == null || !Number.isFinite(nota))) return null;
  const suma = args.notas.reduce<number>((acc, nota) => acc + Number(nota), 0);
  return suma / args.notas.length;
}

export function notaEnEscala(nota: number, escala: number[]): boolean {
  return escala.includes(nota);
}

export function campoNotaCriterio(criterioId: string) {
  return `nota-criterio-${criterioId}`;
}

export type RubricaVista = RubricaDatos & { estructuraBloqueada: boolean };

export function rubricaVacia(): RubricaDatos {
  return { escala: [...ESCALA_RUBRICA_DEFAULT], criterios: [] };
}

export function criterioRubricaVacio(orden: number, escala: number[]): CriterioRubricaDatos {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `tmp-${crypto.randomUUID()}`
      : `tmp-${Date.now()}-${orden}`;
  return {
    id,
    orden,
    nombre: "",
    preguntaGuia: "",
    detalle: "",
    peso: 0,
    explicaciones: Object.fromEntries(
      escala.map((valor) => [String(valor), { titulo: "", detalle: "" }]),
    ),
  };
}

export function mapearRubricaFila(
  fila:
    | {
        escala: string;
        criterios: {
          id: string;
          orden: number;
          nombre: string;
          preguntaGuia: string;
          detalle: string;
          peso: number;
          explicaciones: string;
        }[];
      }
    | null
    | undefined,
  estructuraBloqueada = false,
): RubricaVista {
  if (!fila) return { ...rubricaVacia(), estructuraBloqueada };
  return {
    escala: parseEscalaRubrica(fila.escala),
    criterios: [...fila.criterios]
      .sort((a, b) => a.orden - b.orden)
      .map((criterio) => ({
        id: criterio.id,
        orden: criterio.orden,
        nombre: criterio.nombre,
        preguntaGuia: criterio.preguntaGuia,
        detalle: criterio.detalle,
        peso: criterio.peso,
        explicaciones: parseExplicacionesRubrica(criterio.explicaciones),
      })),
    estructuraBloqueada,
  };
}

export type PayloadRubrica = {
  escala: number[];
  criterios: {
    id?: string;
    nombre: string;
    preguntaGuia: string;
    detalle: string;
    peso: number;
    explicaciones: ExplicacionesRubrica;
  }[];
};

export function leerPayloadRubrica(raw: unknown): PayloadRubrica | { error: string } {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { error: "La rúbrica no es válida." };
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { error: "La rúbrica no es válida." };
  }
  const data = parsed as {
    escala?: unknown;
    criterios?: unknown;
  };
  const escala = parseEscalaRubrica(data.escala);
  if (!Array.isArray(data.criterios)) return { error: "La rúbrica no es válida." };
  const criterios = data.criterios.map((item, index) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      id: typeof row.id === "string" ? row.id : undefined,
      nombre: String(row.nombre ?? ""),
      preguntaGuia: String(row.preguntaGuia ?? ""),
      detalle: String(row.detalle ?? ""),
      peso: Math.floor(Number(row.peso) || 0),
      explicaciones: parseExplicacionesRubrica(row.explicaciones),
      orden: index + 1,
    };
  });
  return { escala, criterios };
}
