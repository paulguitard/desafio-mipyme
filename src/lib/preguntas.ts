export const TIPOS_PREGUNTA = [
  "texto_corto",
  "texto_largo",
  "lista",
  "opcion_unica",
  "opcion_multiple",
  "si_no",
  "numero",
  "fecha",
  "correo",
  "gantt",
  "presupuesto",
  "objetivos_indicadores",
] as const;

export type TipoPregunta = (typeof TIPOS_PREGUNTA)[number];

export const TIPO_PREGUNTA_LABEL: Record<TipoPregunta, string> = {
  texto_corto: "Texto corto",
  texto_largo: "Texto largo",
  lista: "Lista desplegable",
  opcion_unica: "Opción única",
  opcion_multiple: "Opción múltiple",
  si_no: "Sí / No",
  numero: "Número",
  fecha: "Fecha",
  correo: "Correo",
  gantt: "Gantt",
  presupuesto: "Presupuesto",
  objetivos_indicadores: "Objetivos e Indicadores",
};

/** Grupos para el selector de tipo en el builder de formularios. */
export const TIPOS_PREGUNTA_GRUPOS: { label: string; tipos: readonly TipoPregunta[] }[] = [
  {
    label: "Grupo A — Texto y datos",
    tipos: ["texto_corto", "texto_largo", "numero", "fecha", "correo", "si_no"],
  },
  {
    label: "Grupo B — Selección",
    tipos: ["lista", "opcion_unica", "opcion_multiple"],
  },
  {
    label: "Grupo C — Formatos",
    tipos: ["gantt", "presupuesto", "objetivos_indicadores"],
  },
];

export const CUENTAS_PRESUPUESTO = [
  { id: "recursos_humanos", label: "Recursos Humanos" },
  { id: "operacion", label: "Operación" },
  { id: "inversion", label: "Inversión" },
] as const;

export type CuentaPresupuesto = (typeof CUENTAS_PRESUPUESTO)[number]["id"];

export type ConfigGantt = {
  minActividades?: number | null;
  maxActividades?: number | null;
  fechaMin?: string | null;
  fechaMax?: string | null;
  maxDiasActividad?: number | null;
};

export type LimitesCuentaPresupuesto = {
  montoMin?: number | null;
  montoMax?: number | null;
};

export type ConfigPresupuesto = {
  minItems?: number | null;
  maxItems?: number | null;
  limitesCuentas: Record<CuentaPresupuesto, LimitesCuentaPresupuesto>;
  montoTotalMin?: number | null;
  montoTotalMax?: number | null;
};

export function limitesCuentasVacios(): Record<CuentaPresupuesto, LimitesCuentaPresupuesto> {
  return {
    recursos_humanos: { montoMin: null, montoMax: null },
    operacion: { montoMin: null, montoMax: null },
    inversion: { montoMin: null, montoMax: null },
  };
}

export function campoLimiteCuenta(id: CuentaPresupuesto, extremo: "min" | "max"): string {
  return `limiteCuenta_${id}_${extremo}`;
}

export type ConfigObjetivos = {
  cantidadObjetivosEspecificos: number;
  minIndicadoresPorObjetivo?: number | null;
  maxIndicadoresPorObjetivo?: number | null;
};

export type ActividadGantt = {
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaCierre: string;
};

export type ItemPresupuesto = {
  cuenta: CuentaPresupuesto | "";
  nombre: string;
  descripcion: string;
  monto: number | null;
};

export type IndicadorObjetivo = {
  nombre: string;
  descripcion: string;
  formaCalculo: string;
  valorEsperado: number | null;
  resultadoEsperado: string;
};

export type ObjetivoEspecifico = {
  enunciado: string;
  indicadores: IndicadorObjetivo[];
};

export type ValorGantt = { actividades: ActividadGantt[] };
export type ValorPresupuesto = { items: ItemPresupuesto[] };
export type ValorObjetivos = {
  objetivoGeneral: string;
  objetivosEspecificos: ObjetivoEspecifico[];
};

export function esTipoFormato(tipo: string): tipo is "gantt" | "presupuesto" | "objetivos_indicadores" {
  return tipo === "gantt" || tipo === "presupuesto" || tipo === "objetivos_indicadores";
}

export type ModoFecha = "unica" | "rango";

export type ConfigFecha = { fechaModo: ModoFecha };
export type ConfigCorreo = { cantidadCorreos: number };
export type ConfigLimites = {
  minCaracteres?: number | null;
  maxCaracteres?: number | null;
  minPalabras?: number | null;
  maxPalabras?: number | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

function toNullableInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

export function parseOpciones(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
    if (parsed && typeof parsed === "object") {
      const opciones = (parsed as { opciones?: unknown }).opciones;
      if (Array.isArray(opciones)) {
        return opciones.filter((item): item is string => typeof item === "string");
      }
    }
    return [];
  } catch {
    return [];
  }
}

export function parseConfigLimites(raw: string): ConfigLimites {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const obj = parsed as Record<string, unknown>;
    return {
      minCaracteres: toNullableInt(obj.minCaracteres),
      maxCaracteres: toNullableInt(obj.maxCaracteres),
      minPalabras: toNullableInt(obj.minPalabras),
      maxPalabras: toNullableInt(obj.maxPalabras),
    };
  } catch {
    return {};
  }
}

export function contarPalabras(texto: string): number {
  const trimmed = texto.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/** Extrae texto plano desde HTML del editor de texto largo (o texto crudo legado). */
export function textoPlanoDesdeHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function esHtmlVacio(html: string): boolean {
  return !textoPlanoDesdeHtml(html);
}

export function pareceHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

export type StoredFile = {
  id: string;
  originalName: string;
  mimeType: string;
  kind: "file" | "image";
  relativePath: string;
};

export type StoredVideoLink = {
  id: string;
  kind: "video_link";
  url: string;
  provider: VideoProvider;
};

export type StoredAttachment = StoredFile | StoredVideoLink;

export type VideoProvider = "youtube" | "vimeo" | "google_drive" | "sharepoint";

export function isStoredFile(item: StoredAttachment): item is StoredFile {
  return item.kind === "file" || item.kind === "image";
}

export function isStoredVideoLink(item: StoredAttachment): item is StoredVideoLink {
  return item.kind === "video_link";
}

export function parseArchivos(raw: string): StoredAttachment[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is StoredAttachment => {
      if (!item || typeof item !== "object") return false;
      const kind = (item as { kind?: unknown }).kind;
      return kind === "file" || kind === "image" || kind === "video_link";
    });
  } catch {
    return [];
  }
}

export function parseArchivosSoloFiles(raw: string): StoredFile[] {
  return parseArchivos(raw).filter(isStoredFile);
}

export function getVideoLink(archivos: StoredAttachment[]): StoredVideoLink | null {
  return archivos.find(isStoredVideoLink) ?? null;
}

export function resolveVideoEmbed(urlRaw: string): { provider: VideoProvider; embedUrl: string; url: string } | null {
  const url = urlRaw.trim();
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

  // YouTube
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const fromQuery = parsed.searchParams.get("v");
    const shorts = parsed.pathname.match(/^\/shorts\/([^/]+)/);
    const embed = parsed.pathname.match(/^\/embed\/([^/]+)/);
    const id = fromQuery || shorts?.[1] || embed?.[1];
    if (id) {
      return { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${id}`, url };
    }
  }
  if (host === "youtu.be") {
    const id = parsed.pathname.split("/").filter(Boolean)[0];
    if (id) {
      return { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${id}`, url };
    }
  }

  // Vimeo
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const match = parsed.pathname.match(/\/(?:video\/)?(\d+)/);
    if (match?.[1]) {
      return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${match[1]}`, url };
    }
  }

  // Google Drive
  if (host === "drive.google.com" || host === "docs.google.com") {
    const fileMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
    const openId = parsed.searchParams.get("id");
    const id = fileMatch?.[1] || openId;
    if (id) {
      return {
        provider: "google_drive",
        embedUrl: `https://drive.google.com/file/d/${id}/preview`,
        url,
      };
    }
  }

  // SharePoint / OneDrive for Business video shares
  if (
    host.endsWith(".sharepoint.com") ||
    host === "sharepoint.com" ||
    host.endsWith(".sharepoint-df.com") ||
    (host.endsWith(".onedrive.live.com") && parsed.pathname.includes(":v:"))
  ) {
    return { provider: "sharepoint", embedUrl: url, url };
  }
  // SharePoint sharing form :v: / :u: often on sharepoint hosts already covered;
  // also allow microsoftstream embeds that redirect via sharepoint
  if (host.endsWith(".stream.microsoft.com") || host === "web.microsoftstream.com") {
    return { provider: "sharepoint", embedUrl: url, url };
  }

  return null;
}

export function validarVideoLink(urlRaw: string): string | null {
  const trimmed = urlRaw.trim();
  if (!trimmed) return null;
  if (!resolveVideoEmbed(trimmed)) {
    return "El link de video debe ser de YouTube, Vimeo, Google Drive o SharePoint.";
  }
  return null;
}

export function parseValor(raw: string): unknown {
  if (!raw) return "";
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function serializeValor(value: unknown): string {
  return JSON.stringify(value ?? "");
}

export function publicUploadUrl(file: StoredFile) {
  return `/api/archivos/${encodeURIComponent(file.relativePath)}`;
}

export function tipoTieneOpciones(tipo: TipoPregunta): boolean {
  return tipo === "lista" || tipo === "opcion_unica" || tipo === "opcion_multiple";
}

export function parseConfigFecha(raw: string): ModoFecha {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && (parsed as ConfigFecha).fechaModo === "rango") {
      return "rango";
    }
  } catch {
    /* ignore */
  }
  return "unica";
}

export function parseConfigCorreo(raw: string): number {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      const n = Number((parsed as ConfigCorreo).cantidadCorreos);
      if (Number.isFinite(n) && n >= 1) return Math.min(20, Math.floor(n));
    }
  } catch {
    /* ignore */
  }
  return 1;
}

export function serializeConfigFecha(modo: ModoFecha, limites: ConfigLimites = {}): string {
  return JSON.stringify({ fechaModo: modo, ...compactLimites(limites) });
}

export function serializeConfigCorreo(cantidad: number, limites: ConfigLimites = {}): string {
  const n = Math.max(1, Math.min(20, Math.floor(Number(cantidad) || 1)));
  return JSON.stringify({ cantidadCorreos: n, ...compactLimites(limites) });
}

export function serializeOpcionesConLimites(opciones: string[], limites: ConfigLimites = {}): string {
  const lim = compactLimites(limites);
  if (Object.keys(lim).length === 0) return JSON.stringify(opciones);
  return JSON.stringify({ opciones, ...lim });
}

export function serializeSoloLimites(limites: ConfigLimites = {}): string {
  const lim = compactLimites(limites);
  return Object.keys(lim).length === 0 ? "[]" : JSON.stringify(lim);
}

function compactLimites(limites: ConfigLimites): ConfigLimites {
  const out: ConfigLimites = {};
  if (limites.minCaracteres != null) out.minCaracteres = limites.minCaracteres;
  if (limites.maxCaracteres != null) out.maxCaracteres = limites.maxCaracteres;
  if (limites.minPalabras != null) out.minPalabras = limites.minPalabras;
  if (limites.maxPalabras != null) out.maxPalabras = limites.maxPalabras;
  return out;
}

export function formatearPesosCLP(valor: number | null | undefined): string {
  const n = valor == null || !Number.isFinite(Number(valor)) ? 0 : Math.round(Number(valor));
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function toNullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function toNullableDate(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return esFechaValida(raw) ? raw : null;
}

function diasEntre(inicio: string, cierre: string): number {
  const a = new Date(`${inicio}T00:00:00`);
  const b = new Date(`${cierre}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export const CONFIG_GANTT_DEFAULT: ConfigGantt = {
  minActividades: 1,
  maxActividades: 20,
  fechaMin: null,
  fechaMax: null,
  maxDiasActividad: null,
};

export const CONFIG_PRESUPUESTO_DEFAULT: ConfigPresupuesto = {
  minItems: 1,
  maxItems: 50,
  limitesCuentas: limitesCuentasVacios(),
  montoTotalMin: null,
  montoTotalMax: null,
};

export const CONFIG_OBJETIVOS_DEFAULT: ConfigObjetivos = {
  cantidadObjetivosEspecificos: 3,
  minIndicadoresPorObjetivo: 1,
  maxIndicadoresPorObjetivo: 5,
};

export function parseConfigGantt(raw: string): ConfigGantt {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ...CONFIG_GANTT_DEFAULT };
    const obj = parsed as Record<string, unknown>;
    return {
      minActividades: toNullableInt(obj.minActividades) ?? CONFIG_GANTT_DEFAULT.minActividades,
      maxActividades: toNullableInt(obj.maxActividades) ?? CONFIG_GANTT_DEFAULT.maxActividades,
      fechaMin: toNullableDate(obj.fechaMin),
      fechaMax: toNullableDate(obj.fechaMax),
      maxDiasActividad: toNullableInt(obj.maxDiasActividad),
    };
  } catch {
    return { ...CONFIG_GANTT_DEFAULT };
  }
}

function parseLimitesCuenta(raw: unknown): LimitesCuentaPresupuesto {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { montoMin: null, montoMax: null };
  }
  const obj = raw as Record<string, unknown>;
  return {
    montoMin: toNullableNumber(obj.montoMin),
    montoMax: toNullableNumber(obj.montoMax),
  };
}

export function parseConfigPresupuesto(raw: string): ConfigPresupuesto {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...CONFIG_PRESUPUESTO_DEFAULT, limitesCuentas: limitesCuentasVacios() };
    }
    const obj = parsed as Record<string, unknown>;
    const limites = limitesCuentasVacios();
    const rawCuentas = obj.limitesCuentas;
    if (rawCuentas && typeof rawCuentas === "object" && !Array.isArray(rawCuentas)) {
      const mapa = rawCuentas as Record<string, unknown>;
      for (const cuenta of CUENTAS_PRESUPUESTO) {
        limites[cuenta.id] = parseLimitesCuenta(mapa[cuenta.id]);
      }
    }
    return {
      minItems: toNullableInt(obj.minItems) ?? CONFIG_PRESUPUESTO_DEFAULT.minItems,
      maxItems: toNullableInt(obj.maxItems) ?? CONFIG_PRESUPUESTO_DEFAULT.maxItems,
      limitesCuentas: limites,
      montoTotalMin: toNullableNumber(obj.montoTotalMin),
      montoTotalMax: toNullableNumber(obj.montoTotalMax),
    };
  } catch {
    return { ...CONFIG_PRESUPUESTO_DEFAULT, limitesCuentas: limitesCuentasVacios() };
  }
}

export function parseConfigObjetivos(raw: string): ConfigObjetivos {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...CONFIG_OBJETIVOS_DEFAULT };
    }
    const obj = parsed as Record<string, unknown>;
    const cantidad = toNullableInt(obj.cantidadObjetivosEspecificos) ?? CONFIG_OBJETIVOS_DEFAULT.cantidadObjetivosEspecificos!;
    return {
      cantidadObjetivosEspecificos: Math.max(1, Math.min(20, cantidad)),
      minIndicadoresPorObjetivo:
        toNullableInt(obj.minIndicadoresPorObjetivo) ?? CONFIG_OBJETIVOS_DEFAULT.minIndicadoresPorObjetivo,
      maxIndicadoresPorObjetivo:
        toNullableInt(obj.maxIndicadoresPorObjetivo) ?? CONFIG_OBJETIVOS_DEFAULT.maxIndicadoresPorObjetivo,
    };
  } catch {
    return { ...CONFIG_OBJETIVOS_DEFAULT };
  }
}

export function serializeConfigGantt(config: ConfigGantt): string {
  return JSON.stringify({
    formato: "gantt",
    minActividades: config.minActividades ?? null,
    maxActividades: config.maxActividades ?? null,
    fechaMin: config.fechaMin || null,
    fechaMax: config.fechaMax || null,
    maxDiasActividad: config.maxDiasActividad ?? null,
  });
}

export function serializeConfigPresupuesto(config: ConfigPresupuesto): string {
  const limites = config.limitesCuentas ?? limitesCuentasVacios();
  return JSON.stringify({
    formato: "presupuesto",
    minItems: config.minItems ?? null,
    maxItems: config.maxItems ?? null,
    limitesCuentas: {
      recursos_humanos: {
        montoMin: limites.recursos_humanos.montoMin ?? null,
        montoMax: limites.recursos_humanos.montoMax ?? null,
      },
      operacion: {
        montoMin: limites.operacion.montoMin ?? null,
        montoMax: limites.operacion.montoMax ?? null,
      },
      inversion: {
        montoMin: limites.inversion.montoMin ?? null,
        montoMax: limites.inversion.montoMax ?? null,
      },
    },
    montoTotalMin: config.montoTotalMin ?? null,
    montoTotalMax: config.montoTotalMax ?? null,
  });
}

export function serializeConfigObjetivos(config: ConfigObjetivos): string {
  return JSON.stringify({
    formato: "objetivos_indicadores",
    cantidadObjetivosEspecificos: Math.max(1, Math.min(20, config.cantidadObjetivosEspecificos || 1)),
    minIndicadoresPorObjetivo: config.minIndicadoresPorObjetivo ?? null,
    maxIndicadoresPorObjetivo: config.maxIndicadoresPorObjetivo ?? null,
  });
}

export function esCuentaPresupuesto(value: string): value is CuentaPresupuesto {
  return CUENTAS_PRESUPUESTO.some((cuenta) => cuenta.id === value);
}

export function sumaCuentaPresupuesto(
  items: ItemPresupuesto[],
  cuentaId: CuentaPresupuesto,
  exceptIndex?: number,
): number {
  return items.reduce((sum, item, index) => {
    if (exceptIndex != null && index === exceptIndex) return sum;
    if (item.cuenta !== cuentaId) return sum;
    return sum + (item.monto ?? 0);
  }, 0);
}

/** Monto máximo que puede tener el ítem `index` sin pasarse del tope de su cuenta. */
export function topeItemCuenta(
  items: ItemPresupuesto[],
  index: number,
  cuentaId: string,
  config: ConfigPresupuesto,
): number | null {
  if (!esCuentaPresupuesto(cuentaId)) return null;
  const max = config.limitesCuentas?.[cuentaId]?.montoMax;
  if (max == null) return null;
  return Math.max(0, max - sumaCuentaPresupuesto(items, cuentaId, index));
}

export function parseValorGantt(valor: unknown): ValorGantt {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return { actividades: [] };
  const raw = (valor as { actividades?: unknown }).actividades;
  if (!Array.isArray(raw)) return { actividades: [] };
  return {
    actividades: raw.map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        nombre: String(row.nombre ?? "").trim(),
        descripcion: String(row.descripcion ?? "").trim(),
        fechaInicio: String(row.fechaInicio ?? "").trim(),
        fechaCierre: String(row.fechaCierre ?? "").trim(),
      };
    }),
  };
}

export function parseValorPresupuesto(valor: unknown): ValorPresupuesto {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return { items: [] };
  const raw = (valor as { items?: unknown }).items;
  if (!Array.isArray(raw)) return { items: [] };
  return {
    items: raw.map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const cuentaRaw = String(row.cuenta ?? "").trim();
      const montoRaw = row.monto;
      const monto =
        montoRaw == null || montoRaw === ""
          ? null
          : Number.isFinite(Number(montoRaw))
            ? Number(montoRaw)
            : null;
      return {
        cuenta: esCuentaPresupuesto(cuentaRaw) ? cuentaRaw : "",
        nombre: String(row.nombre ?? "").trim(),
        descripcion: String(row.descripcion ?? "").trim(),
        monto,
      };
    }),
  };
}

export function parseValorObjetivos(valor: unknown): ValorObjetivos {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return { objetivoGeneral: "", objetivosEspecificos: [] };
  }
  const obj = valor as Record<string, unknown>;
  const especificos = Array.isArray(obj.objetivosEspecificos) ? obj.objetivosEspecificos : [];
  return {
    objetivoGeneral: String(obj.objetivoGeneral ?? "").trim(),
    objetivosEspecificos: especificos.map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const indicadores = Array.isArray(row.indicadores) ? row.indicadores : [];
      return {
        enunciado: String(row.enunciado ?? "").trim(),
        indicadores: indicadores.map((ind) => {
          const i = ind && typeof ind === "object" ? (ind as Record<string, unknown>) : {};
          const valorEsperado =
            i.valorEsperado == null || i.valorEsperado === ""
              ? null
              : Number.isFinite(Number(i.valorEsperado))
                ? Number(i.valorEsperado)
                : null;
          return {
            nombre: String(i.nombre ?? "").trim(),
            descripcion: String(i.descripcion ?? "").trim(),
            formaCalculo: String(i.formaCalculo ?? "").trim(),
            valorEsperado,
            resultadoEsperado: String(i.resultadoEsperado ?? "").trim(),
          };
        }),
      };
    }),
  };
}

function actividadGanttVacia(act: ActividadGantt) {
  return !act.nombre && !act.descripcion && !act.fechaInicio && !act.fechaCierre;
}

function itemPresupuestoVacio(item: ItemPresupuesto) {
  return !item.cuenta && !item.nombre && !item.descripcion && item.monto == null;
}

function indicadorVacio(ind: IndicadorObjetivo) {
  return (
    !ind.nombre &&
    !ind.descripcion &&
    !ind.formaCalculo &&
    ind.valorEsperado == null &&
    !ind.resultadoEsperado
  );
}

function validarGantt(valor: unknown, opciones: string, obligatoria: boolean): string | null {
  const config = parseConfigGantt(opciones);
  const data = parseValorGantt(valor);
  const actividades = data.actividades.filter((act) => !actividadGanttVacia(act));
  if (actividades.length === 0) {
    return obligatoria ? "Debes agregar al menos una actividad." : null;
  }
  if (config.minActividades != null && actividades.length < config.minActividades) {
    return `Debes ingresar al menos ${config.minActividades} actividad(es).`;
  }
  if (config.maxActividades != null && actividades.length > config.maxActividades) {
    return `Máximo ${config.maxActividades} actividades.`;
  }
  for (let i = 0; i < actividades.length; i++) {
    const act = actividades[i];
    const n = i + 1;
    if (!act.nombre) return `La actividad ${n} necesita un nombre.`;
    if (!act.fechaInicio || !act.fechaCierre) {
      return `La actividad ${n} necesita fechas de inicio y cierre.`;
    }
    if (!esFechaValida(act.fechaInicio) || !esFechaValida(act.fechaCierre)) {
      return `Las fechas de la actividad ${n} no son válidas.`;
    }
    if (act.fechaInicio > act.fechaCierre) {
      return `En la actividad ${n}, la fecha de inicio no puede ser posterior al cierre.`;
    }
    if (config.fechaMin && act.fechaInicio < config.fechaMin) {
      return `La actividad ${n} no puede iniciar antes de ${config.fechaMin}.`;
    }
    if (config.fechaMax && act.fechaCierre > config.fechaMax) {
      return `La actividad ${n} no puede cerrar después de ${config.fechaMax}.`;
    }
    if (config.maxDiasActividad != null) {
      const dias = diasEntre(act.fechaInicio, act.fechaCierre);
      if (dias > config.maxDiasActividad) {
        return `La actividad ${n} no puede durar más de ${config.maxDiasActividad} día(s).`;
      }
    }
  }
  return null;
}

function validarPresupuesto(valor: unknown, opciones: string, obligatoria: boolean): string | null {
  const config = parseConfigPresupuesto(opciones);
  const data = parseValorPresupuesto(valor);
  const items = data.items.filter((item) => !itemPresupuestoVacio(item));
  if (items.length === 0) {
    return obligatoria ? "Debes agregar al menos un ítem de presupuesto." : null;
  }
  if (config.minItems != null && items.length < config.minItems) {
    return `Debes ingresar al menos ${config.minItems} ítem(s).`;
  }
  if (config.maxItems != null && items.length > config.maxItems) {
    return `Máximo ${config.maxItems} ítems.`;
  }
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const n = i + 1;
    if (!item.cuenta || !esCuentaPresupuesto(item.cuenta)) {
      return `El ítem ${n} debe tener una cuenta válida.`;
    }
    if (!item.nombre) return `El ítem ${n} necesita un nombre.`;
    if (item.monto == null || !Number.isFinite(item.monto)) {
      return `El ítem ${n} necesita un monto válido.`;
    }
    if (item.monto < 0) return `El monto del ítem ${n} no puede ser negativo.`;
    total += item.monto;
  }
  const porCuenta = { recursos_humanos: 0, operacion: 0, inversion: 0 };
  for (const cuenta of CUENTAS_PRESUPUESTO) {
    porCuenta[cuenta.id] = sumaCuentaPresupuesto(items, cuenta.id);
  }
  for (const cuenta of CUENTAS_PRESUPUESTO) {
    const limites = config.limitesCuentas?.[cuenta.id];
    const suma = porCuenta[cuenta.id];
    if (limites?.montoMin != null && suma < limites.montoMin) {
      return `El total de ${cuenta.label} debe ser al menos ${formatearPesosCLP(limites.montoMin)} (vas ${formatearPesosCLP(suma)}).`;
    }
    if (limites?.montoMax != null && suma > limites.montoMax) {
      return `El total de ${cuenta.label} no puede superar ${formatearPesosCLP(limites.montoMax)} (vas ${formatearPesosCLP(suma)}).`;
    }
  }
  if (config.montoTotalMin != null && total < config.montoTotalMin) {
    return `El monto total debe ser al menos ${formatearPesosCLP(config.montoTotalMin)} (vas ${formatearPesosCLP(total)}).`;
  }
  if (config.montoTotalMax != null && total > config.montoTotalMax) {
    return `El monto total no puede superar ${formatearPesosCLP(config.montoTotalMax)} (vas ${formatearPesosCLP(total)}).`;
  }
  return null;
}

function validarObjetivos(valor: unknown, opciones: string, obligatoria: boolean): string | null {
  const config = parseConfigObjetivos(opciones);
  const data = parseValorObjetivos(valor);
  const tieneAlgo =
    Boolean(data.objetivoGeneral) ||
    data.objetivosEspecificos.some(
      (oe) => oe.enunciado || oe.indicadores.some((ind) => !indicadorVacio(ind)),
    );
  if (!tieneAlgo) {
    return obligatoria ? "Debes completar el objetivo general y los objetivos específicos." : null;
  }
  if (!data.objetivoGeneral) return "Debes ingresar el objetivo general.";
  if (data.objetivosEspecificos.length !== config.cantidadObjetivosEspecificos) {
    return `Debes completar ${config.cantidadObjetivosEspecificos} objetivo(s) específico(s).`;
  }
  for (let i = 0; i < data.objetivosEspecificos.length; i++) {
    const oe = data.objetivosEspecificos[i];
    const n = i + 1;
    if (!oe.enunciado) return `El objetivo específico ${n} necesita un enunciado.`;
    const indicadores = oe.indicadores.filter((ind) => !indicadorVacio(ind));
    if (config.minIndicadoresPorObjetivo != null && indicadores.length < config.minIndicadoresPorObjetivo) {
      return `El objetivo específico ${n} requiere al menos ${config.minIndicadoresPorObjetivo} indicador(es).`;
    }
    if (config.maxIndicadoresPorObjetivo != null && indicadores.length > config.maxIndicadoresPorObjetivo) {
      return `El objetivo específico ${n} admite máximo ${config.maxIndicadoresPorObjetivo} indicador(es).`;
    }
    for (let j = 0; j < indicadores.length; j++) {
      const ind = indicadores[j];
      const m = j + 1;
      if (!ind.nombre) return `El indicador ${m} del objetivo ${n} necesita un nombre.`;
      if (!ind.formaCalculo) return `El indicador ${m} del objetivo ${n} necesita forma de cálculo.`;
      if (ind.valorEsperado == null || !Number.isFinite(ind.valorEsperado)) {
        return `El indicador ${m} del objetivo ${n} necesita un valor esperado numérico.`;
      }
      if (!ind.resultadoEsperado) {
        return `El indicador ${m} del objetivo ${n} necesita un resultado esperado.`;
      }
    }
  }
  return null;
}


export function esFechaValida(value: string): boolean {
  if (!FECHA_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function esCorreoValido(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function formatearValorPregunta(tipo: string, valor: unknown, opcionesRaw = "[]"): string {
  if (tipo === "gantt") {
    const data = parseValorGantt(valor);
    const n = data.actividades.filter((act) => !actividadGanttVacia(act)).length;
    return n ? `${n} actividad(es)` : "";
  }
  if (tipo === "presupuesto") {
    const data = parseValorPresupuesto(valor);
    const items = data.items.filter((item) => !itemPresupuestoVacio(item));
    if (!items.length) return "";
    const total = items.reduce((sum, item) => sum + (item.monto ?? 0), 0);
    return `${items.length} ítem(s) · total ${formatearPesosCLP(total)}`;
  }
  if (tipo === "objetivos_indicadores") {
    const data = parseValorObjetivos(valor);
    if (!data.objetivoGeneral) return "";
    const inds = data.objetivosEspecificos.reduce((sum, oe) => sum + oe.indicadores.length, 0);
    return `OG + ${data.objetivosEspecificos.length} OE · ${inds} indicador(es)`;
  }
  if (tipo === "fecha") {
    if (valor && typeof valor === "object" && !Array.isArray(valor)) {
      const desde = String((valor as { desde?: unknown }).desde ?? "").trim();
      const hasta = String((valor as { hasta?: unknown }).hasta ?? "").trim();
      if (desde || hasta) return [desde, hasta].filter(Boolean).join(" — ");
    }
    return valor == null ? "" : String(valor);
  }
  if (tipo === "correo") {
    if (Array.isArray(valor)) return valor.map(String).filter(Boolean).join(", ");
    return valor == null ? "" : String(valor);
  }
  if (tipo === "texto_largo") {
    if (valor == null) return "";
    return textoPlanoDesdeHtml(String(valor));
  }
  if (Array.isArray(valor)) return valor.join(", ");
  if (valor == null) return "";
  void opcionesRaw;
  return String(valor);
}

export function validarValorRespuesta(args: {
  tipo: string;
  opciones: string;
  valor: unknown;
  obligatoria: boolean;
}): string | null {
  const { tipo, opciones, valor, obligatoria } = args;

  if (tipo === "texto_corto" || tipo === "texto_largo") {
    const raw = valor == null ? "" : String(valor);
    const plano = tipo === "texto_largo" ? textoPlanoDesdeHtml(raw) : raw.trim();
    if (!plano) return obligatoria ? "Debes completar esta pregunta." : null;
    const limites = parseConfigLimites(opciones);
    const chars = tipo === "texto_largo" ? plano.length : raw.length;
    const words = contarPalabras(tipo === "texto_largo" ? plano : raw);
    if (limites.minCaracteres != null && chars < limites.minCaracteres) {
      return `Mínimo ${limites.minCaracteres} caracteres (vas ${chars}).`;
    }
    if (limites.maxCaracteres != null && chars > limites.maxCaracteres) {
      return `Máximo ${limites.maxCaracteres} caracteres (vas ${chars}).`;
    }
    if (limites.minPalabras != null && words < limites.minPalabras) {
      return `Mínimo ${limites.minPalabras} palabras (vas ${words}).`;
    }
    if (limites.maxPalabras != null && words > limites.maxPalabras) {
      return `Máximo ${limites.maxPalabras} palabras (vas ${words}).`;
    }
    return null;
  }

  if (tipo === "numero") {
    const raw = valor == null ? "" : String(valor).trim();
    if (!raw) return obligatoria ? "Debes ingresar un número." : null;
    if (!Number.isFinite(Number(raw))) return "La respuesta debe ser un número válido.";
    return null;
  }

  if (tipo === "fecha") {
    const modo = parseConfigFecha(opciones);
    if (modo === "rango") {
      const desde =
        valor && typeof valor === "object" && !Array.isArray(valor)
          ? String((valor as { desde?: unknown }).desde ?? "").trim()
          : "";
      const hasta =
        valor && typeof valor === "object" && !Array.isArray(valor)
          ? String((valor as { hasta?: unknown }).hasta ?? "").trim()
          : "";
      if (!desde && !hasta) return obligatoria ? "Debes indicar el rango de fechas." : null;
      if (!desde || !hasta) return "Debes completar ambas fechas del rango.";
      if (!esFechaValida(desde) || !esFechaValida(hasta)) return "Las fechas no son válidas.";
      if (desde > hasta) return "La fecha de inicio no puede ser posterior a la de término.";
      return null;
    }
    const raw = valor == null ? "" : String(valor).trim();
    if (!raw) return obligatoria ? "Debes indicar una fecha." : null;
    if (!esFechaValida(raw)) return "La fecha no es válida.";
    return null;
  }

  if (tipo === "correo") {
    const cantidad = parseConfigCorreo(opciones);
    const correos = Array.isArray(valor)
      ? valor.map((item) => String(item).trim())
      : [String(valor ?? "").trim()];
    while (correos.length < cantidad) correos.push("");
    const usados = correos.slice(0, cantidad);
    const llenos = usados.filter(Boolean);
    if (llenos.length === 0) {
      return obligatoria
        ? cantidad === 1
          ? "Debes ingresar un correo."
          : `Debes ingresar ${cantidad} correos.`
        : null;
    }
    if (obligatoria && llenos.length < cantidad) {
      return `Debes ingresar ${cantidad} correo${cantidad === 1 ? "" : "s"}.`;
    }
    if (usados.some((item) => item && !esCorreoValido(item))) {
      return "Hay uno o más correos con formato inválido.";
    }
    return null;
  }

  if (tipo === "gantt") return validarGantt(valor, opciones, obligatoria);
  if (tipo === "presupuesto") return validarPresupuesto(valor, opciones, obligatoria);
  if (tipo === "objetivos_indicadores") return validarObjetivos(valor, opciones, obligatoria);

  return null;
}

export type PeldanoEscala = {
  valor: number;
  etiqueta: string;
};

export const ESCALA_NOTAS_DEFAULT: PeldanoEscala[] = [1, 2, 3, 4, 5, 6, 7].map((valor) => ({
  valor,
  etiqueta: "",
}));

export function parseEscalaNotas(raw: string): PeldanoEscala[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const valor = Number((item as { valor?: unknown }).valor);
        const etiqueta = String((item as { etiqueta?: unknown }).etiqueta ?? "").trim();
        if (!Number.isFinite(valor)) return null;
        return { valor, etiqueta };
      })
      .filter((item): item is PeldanoEscala => item !== null);
  } catch {
    return [];
  }
}

export function serializeEscalaNotas(escala: PeldanoEscala[]): string {
  return JSON.stringify(escala);
}

export function validarEscalaNotas(escala: PeldanoEscala[]): string | null {
  if (escala.length < 2) return "La escala de notas necesita al menos dos peldaños.";
  const valores = escala.map((item) => item.valor);
  if (valores.some((valor) => !Number.isFinite(valor))) {
    return "Cada peldaño de la escala debe tener un número.";
  }
  if (new Set(valores).size !== valores.length) {
    return "Los números de la escala no pueden repetirse.";
  }
  return null;
}
