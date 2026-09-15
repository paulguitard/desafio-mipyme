"use client";

import { useState } from "react";
import {
  campoLimiteCuenta,
  CUENTAS_PRESUPUESTO,
  CONFIG_GANTT_DEFAULT,
  CONFIG_OBJETIVOS_DEFAULT,
  CONFIG_PRESUPUESTO_DEFAULT,
  ESCALA_NOTAS_DEFAULT,
  TIPO_PREGUNTA_LABEL,
  TIPOS_PREGUNTA_GRUPOS,
  esTipoFormato,
  limitesCuentasVacios,
  parseConfigCorreo,
  parseConfigFecha,
  parseConfigGantt,
  parseConfigLimites,
  parseConfigObjetivos,
  parseConfigPresupuesto,
  tipoTieneOpciones,
  type ConfigGantt,
  type CuentaPresupuesto,
  type ConfigObjetivos,
  type ConfigPresupuesto,
  type ModoFecha,
  type PeldanoEscala,
  type TipoPregunta,
} from "@/lib/preguntas";

export type PreguntaBorrador = {
  enunciado: string;
  ayuda: string;
  tipo: TipoPregunta;
  opciones: string[];
  fechaModo: ModoFecha;
  cantidadCorreos: number;
  minCaracteres: number | null;
  maxCaracteres: number | null;
  minPalabras: number | null;
  maxPalabras: number | null;
  configGantt: ConfigGantt;
  configPresupuesto: ConfigPresupuesto;
  configObjetivos: ConfigObjetivos;
  obligatoria: boolean;
  permiteArchivo: boolean;
  permiteImagen: boolean;
  permiteVideoLink: boolean;
  conNotas: boolean;
  escalaNotas: PeldanoEscala[];
};

const VACIA: PreguntaBorrador = {
  enunciado: "",
  ayuda: "",
  tipo: "texto_corto",
  opciones: [],
  fechaModo: "unica",
  cantidadCorreos: 1,
  minCaracteres: null,
  maxCaracteres: null,
  minPalabras: null,
  maxPalabras: null,
  configGantt: { ...CONFIG_GANTT_DEFAULT },
  configPresupuesto: { ...CONFIG_PRESUPUESTO_DEFAULT, limitesCuentas: limitesCuentasVacios() },
  configObjetivos: { ...CONFIG_OBJETIVOS_DEFAULT },
  obligatoria: true,
  permiteArchivo: false,
  permiteImagen: false,
  permiteVideoLink: false,
  conNotas: false,
  escalaNotas: ESCALA_NOTAS_DEFAULT,
};

function toOptionalNumber(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

function toOptionalFloat(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function PreguntaComposer({
  inicial,
  error,
  onCancel,
  onSubmit,
  submitLabel,
  obligatoria,
}: {
  inicial?: Partial<PreguntaBorrador> & { opcionesRaw?: string };
  error?: string | null;
  onCancel: () => void;
  onSubmit: (pregunta: PreguntaBorrador) => void;
  submitLabel: string;
  obligatoria: boolean;
}) {
  const limitesInicial = inicial?.opcionesRaw ? parseConfigLimites(inicial.opcionesRaw) : {};
  const fechaInicial =
    inicial?.fechaModo ??
    (inicial?.opcionesRaw ? parseConfigFecha(inicial.opcionesRaw) : VACIA.fechaModo);
  const correosInicial =
    inicial?.cantidadCorreos ??
    (inicial?.opcionesRaw ? parseConfigCorreo(inicial.opcionesRaw) : VACIA.cantidadCorreos);
  const ganttInicial =
    inicial?.configGantt ??
    (inicial?.opcionesRaw ? parseConfigGantt(inicial.opcionesRaw) : VACIA.configGantt);
  const presupuestoInicial =
    inicial?.configPresupuesto ??
    (inicial?.opcionesRaw ? parseConfigPresupuesto(inicial.opcionesRaw) : VACIA.configPresupuesto);
  const objetivosInicial =
    inicial?.configObjetivos ??
    (inicial?.opcionesRaw ? parseConfigObjetivos(inicial.opcionesRaw) : VACIA.configObjetivos);

  const [tipo, setTipo] = useState<TipoPregunta>(inicial?.tipo ?? VACIA.tipo);
  const [fechaModo, setFechaModo] = useState<ModoFecha>(fechaInicial);
  const [cantidadCorreos, setCantidadCorreos] = useState(correosInicial);
  const [conNotas, setConNotas] = useState(inicial?.conNotas ?? false);
  const [escala, setEscala] = useState<PeldanoEscala[]>(
    inicial?.escalaNotas && inicial.escalaNotas.length > 0 ? inicial.escalaNotas : ESCALA_NOTAS_DEFAULT,
  );
  const [opcionesLista, setOpcionesLista] = useState<string[]>(() => {
    const iniciales = (inicial?.opciones ?? []).map((item) => item.trim()).filter(Boolean);
    return iniciales.length > 0 ? iniciales : ["", ""];
  });
  const esFormato = esTipoFormato(tipo);
  const conOpciones = tipoTieneOpciones(tipo);
  const conPanelLateral = esFormato || conOpciones;

  return (
    <form
      className={
        conPanelLateral
          ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]"
          : "grid gap-4"
      }
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const siguienteTipo = String(formData.get("tipo") ?? "") as TipoPregunta;
        const opciones = tipoTieneOpciones(siguienteTipo)
          ? opcionesLista.map((item) => item.trim()).filter(Boolean)
          : [];
        const modo = String(formData.get("fechaModo") ?? "unica") === "rango" ? "rango" : "unica";
        const cantidad = Math.max(1, Math.min(20, Number(formData.get("cantidadCorreos") ?? 1) || 1));
        onSubmit({
          enunciado: String(formData.get("enunciado") ?? "").trim(),
          ayuda: String(formData.get("ayuda") ?? "").trim(),
          tipo: siguienteTipo,
          opciones,
          fechaModo: modo,
          cantidadCorreos: cantidad,
          minCaracteres: toOptionalNumber(formData.get("minCaracteres")),
          maxCaracteres: toOptionalNumber(formData.get("maxCaracteres")),
          minPalabras: toOptionalNumber(formData.get("minPalabras")),
          maxPalabras: toOptionalNumber(formData.get("maxPalabras")),
          configGantt: {
            minActividades: toOptionalNumber(formData.get("minActividades")),
            maxActividades: toOptionalNumber(formData.get("maxActividades")),
            fechaMin: String(formData.get("fechaMin") ?? "").trim() || null,
            fechaMax: String(formData.get("fechaMax") ?? "").trim() || null,
            maxDiasActividad: toOptionalNumber(formData.get("maxDiasActividad")),
          },
          configPresupuesto: {
            minItems: toOptionalNumber(formData.get("minItems")),
            maxItems: toOptionalNumber(formData.get("maxItems")),
            limitesCuentas: Object.fromEntries(
              CUENTAS_PRESUPUESTO.map((cuenta) => [
                cuenta.id,
                {
                  montoMin: toOptionalFloat(formData.get(campoLimiteCuenta(cuenta.id, "min"))),
                  montoMax: toOptionalFloat(formData.get(campoLimiteCuenta(cuenta.id, "max"))),
                },
              ]),
            ) as Record<CuentaPresupuesto, { montoMin: number | null; montoMax: number | null }>,
            montoTotalMin: toOptionalFloat(formData.get("montoTotalMin")),
            montoTotalMax: toOptionalFloat(formData.get("montoTotalMax")),
          },
          configObjetivos: {
            cantidadObjetivosEspecificos: Math.max(
              1,
              Math.min(20, Number(formData.get("cantidadObjetivosEspecificos") ?? 3) || 3),
            ),
            minIndicadoresPorObjetivo: toOptionalNumber(formData.get("minIndicadoresPorObjetivo")),
            maxIndicadoresPorObjetivo: toOptionalNumber(formData.get("maxIndicadoresPorObjetivo")),
          },
          obligatoria,
          permiteArchivo: formData.get("permiteArchivo") === "on",
          permiteImagen: formData.get("permiteImagen") === "on",
          permiteVideoLink: formData.get("permiteVideoLink") === "on",
          conNotas,
          escalaNotas: conNotas ? escala : [],
        });
      }}
    >
      <div className="grid gap-4">
      {error ? <p className="text-danger">{error}</p> : null}

      <div className="field">
        <label htmlFor="tipo">Tipo de pregunta</label>
        <select
          className="input"
          id="tipo"
          name="tipo"
          value={tipo}
          onChange={(event) => {
            const siguiente = event.target.value as TipoPregunta;
            setTipo(siguiente);
            if (tipoTieneOpciones(siguiente) && opcionesLista.every((item) => !item.trim())) {
              setOpcionesLista(["", ""]);
            }
          }}
        >
          {TIPOS_PREGUNTA_GRUPOS.map((grupo) => (
            <optgroup key={grupo.label} label={grupo.label}>
              {grupo.tipos.map((item) => (
                <option key={item} value={item}>
                  {TIPO_PREGUNTA_LABEL[item]}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {tipo === "fecha" ? (
        <div className="field">
          <label htmlFor="fechaModo">Formato de fecha</label>
          <select
            className="input"
            id="fechaModo"
            name="fechaModo"
            value={fechaModo}
            onChange={(event) => setFechaModo(event.target.value as ModoFecha)}
          >
            <option value="unica">Una sola fecha</option>
            <option value="rango">Rango (fecha inicio y término)</option>
          </select>
        </div>
      ) : (
        <input type="hidden" name="fechaModo" value="unica" />
      )}

      {tipo === "correo" ? (
        <div className="field">
          <label htmlFor="cantidadCorreos">Cantidad de correos requeridos</label>
          <input
            className="input w-32"
            id="cantidadCorreos"
            name="cantidadCorreos"
            type="number"
            min={1}
            max={20}
            value={cantidadCorreos}
            onChange={(event) =>
              setCantidadCorreos(Math.max(1, Math.min(20, Number(event.target.value) || 1)))
            }
          />
        </div>
      ) : (
        <input type="hidden" name="cantidadCorreos" value="1" />
      )}

      <div className="field">
        <label htmlFor="enunciado">Enunciado</label>
        <input
          className="input"
          id="enunciado"
          name="enunciado"
          defaultValue={inicial?.enunciado ?? ""}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="ayuda">Texto de ayuda (opcional)</label>
        <input className="input" id="ayuda" name="ayuda" defaultValue={inicial?.ayuda ?? ""} />
      </div>

      <div className={`grid gap-4 ${esFormato ? "" : "md:grid-cols-2"}`}>
        <section className="space-y-3 rounded-xl border border-border p-4">
          <p className="font-semibold text-navy">Adjuntos</p>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="permiteArchivo" defaultChecked={inicial?.permiteArchivo ?? false} />
            Permitir subir archivo
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="permiteImagen" defaultChecked={inicial?.permiteImagen ?? false} />
            Permitir subir imagen
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="permiteVideoLink"
              defaultChecked={inicial?.permiteVideoLink ?? false}
            />
            Permitir pegar link de video
          </label>
        </section>

        {!esFormato ? (
        <section className="space-y-3 rounded-xl border border-border p-4">
          <p className="font-semibold text-navy">Límites de respuesta</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label htmlFor="minCaracteres">Mín. caracteres</label>
              <input
                className="input"
                id="minCaracteres"
                name="minCaracteres"
                type="number"
                min={0}
                defaultValue={inicial?.minCaracteres ?? limitesInicial.minCaracteres ?? ""}
                placeholder="—"
              />
            </div>
            <div className="field">
              <label htmlFor="maxCaracteres">Máx. caracteres</label>
              <input
                className="input"
                id="maxCaracteres"
                name="maxCaracteres"
                type="number"
                min={0}
                defaultValue={inicial?.maxCaracteres ?? limitesInicial.maxCaracteres ?? ""}
                placeholder="—"
              />
            </div>
            <div className="field">
              <label htmlFor="minPalabras">Mín. palabras</label>
              <input
                className="input"
                id="minPalabras"
                name="minPalabras"
                type="number"
                min={0}
                defaultValue={inicial?.minPalabras ?? limitesInicial.minPalabras ?? ""}
                placeholder="—"
              />
            </div>
            <div className="field">
              <label htmlFor="maxPalabras">Máx. palabras</label>
              <input
                className="input"
                id="maxPalabras"
                name="maxPalabras"
                type="number"
                min={0}
                defaultValue={inicial?.maxPalabras ?? limitesInicial.maxPalabras ?? ""}
                placeholder="—"
              />
            </div>
          </div>
        </section>
        ) : null}
      </div>

      <section className="space-y-3 rounded-xl border border-border p-4">
        <label className="flex items-center gap-2 font-semibold text-navy">
          <input
            type="checkbox"
            checked={conNotas}
            onChange={(event) => {
              setConNotas(event.target.checked);
              if (event.target.checked && escala.length < 2) setEscala(ESCALA_NOTAS_DEFAULT);
            }}
          />
          Evaluar con notas
        </label>
        {conNotas ? (
          <div className="space-y-3 border-t border-border pt-3">
            <p className="font-semibold">Escala de notas</p>
            <p className="text-sm text-muted">
              Número y texto opcional por peldaño (por ejemplo 1 Deficiente, 7 Excelente).
            </p>
            <div className="space-y-2">
              {escala.map((item, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2">
                  <input
                    className="input w-24"
                    type="number"
                    aria-label={`Valor ${index + 1}`}
                    value={Number.isFinite(item.valor) ? item.valor : ""}
                    onChange={(event) => {
                      const valor = Number(event.target.value);
                      setEscala((actual) =>
                        actual.map((peldano, i) => (i === index ? { ...peldano, valor } : peldano)),
                      );
                    }}
                  />
                  <input
                    className="input min-w-48 flex-1"
                    placeholder="Texto (opcional)"
                    aria-label={`Etiqueta ${index + 1}`}
                    value={item.etiqueta}
                    onChange={(event) => {
                      const etiqueta = event.target.value;
                      setEscala((actual) =>
                        actual.map((peldano, i) => (i === index ? { ...peldano, etiqueta } : peldano)),
                      );
                    }}
                  />
                  <button
                    className="btn btn-sm btn-ghost"
                    type="button"
                    onClick={() => setEscala((actual) => actual.filter((_, i) => i !== index))}
                    disabled={escala.length <= 2}
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
            <button
              className="btn btn-sm btn-secondary"
              type="button"
              onClick={() => {
                const siguiente = escala.reduce((max, item) => Math.max(max, item.valor), 0) + 1;
                setEscala((actual) => [...actual, { valor: siguiente, etiqueta: "" }]);
              }}
            >
              Agregar peldaño
            </button>
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-3">
        <button className="btn btn-primary" type="submit">
          {submitLabel}
        </button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
      </div>

      {conOpciones ? (
        <aside className="space-y-3 rounded-xl border border-border bg-slate-50 p-4 lg:sticky lg:top-0">
          <div>
            <p className="font-semibold text-navy">Opciones de respuesta</p>
            <p className="mt-1 text-sm text-muted">Cada fila es una opción distinta. Se requieren al menos dos.</p>
          </div>
          <div className="space-y-2">
            {opcionesLista.map((opcion, index) => (
              <div key={index} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-navy ring-1 ring-border"
                >
                  {index + 1}
                </span>
                <input
                  className="input min-w-0 flex-1"
                  value={opcion}
                  placeholder={`Opción ${index + 1}`}
                  aria-label={`Opción ${index + 1}`}
                  onChange={(event) => {
                    const valor = event.target.value;
                    setOpcionesLista((actual) =>
                      actual.map((item, i) => (i === index ? valor : item)),
                    );
                  }}
                />
                <button
                  className="btn btn-sm btn-ghost shrink-0"
                  type="button"
                  onClick={() => setOpcionesLista((actual) => actual.filter((_, i) => i !== index))}
                  disabled={opcionesLista.length <= 2}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
          <button
            className="btn btn-sm btn-secondary w-full"
            type="button"
            onClick={() => setOpcionesLista((actual) => [...actual, ""])}
          >
            Agregar opción
          </button>
        </aside>
      ) : null}

      {esFormato ? (
        <aside className="formato-config-aside space-y-3 rounded-xl border border-border bg-slate-50 p-4 lg:sticky lg:top-0">
          <p className="font-semibold text-navy">Configuración del formato</p>
          {tipo === "gantt" ? (
            <div className="grid gap-3">
              <div className="field">
                <label htmlFor="minActividades">Mín. actividades</label>
                <input
                  className="input"
                  id="minActividades"
                  name="minActividades"
                  type="number"
                  min={0}
                  defaultValue={ganttInicial.minActividades ?? ""}
                />
              </div>
              <div className="field">
                <label htmlFor="maxActividades">Máx. actividades</label>
                <input
                  className="input"
                  id="maxActividades"
                  name="maxActividades"
                  type="number"
                  min={0}
                  defaultValue={ganttInicial.maxActividades ?? ""}
                />
              </div>
              <div className="field">
                <label htmlFor="fechaMin">Fecha mínima permitida</label>
                <input
                  className="input"
                  id="fechaMin"
                  name="fechaMin"
                  type="date"
                  defaultValue={ganttInicial.fechaMin ?? ""}
                />
              </div>
              <div className="field">
                <label htmlFor="fechaMax">Fecha máxima permitida</label>
                <input
                  className="input"
                  id="fechaMax"
                  name="fechaMax"
                  type="date"
                  defaultValue={ganttInicial.fechaMax ?? ""}
                />
              </div>
              <div className="field">
                <label htmlFor="maxDiasActividad">Máx. días por actividad</label>
                <input
                  className="input"
                  id="maxDiasActividad"
                  name="maxDiasActividad"
                  type="number"
                  min={0}
                  defaultValue={ganttInicial.maxDiasActividad ?? ""}
                />
              </div>
            </div>
          ) : null}
          {tipo === "presupuesto" ? (
            <div className="grid gap-3">
              <div className="grid min-w-0 grid-cols-2 gap-3">
                <div className="field min-w-0">
                  <label htmlFor="minItems">Mín. ítems</label>
                  <input
                    className="input w-full min-w-0"
                    id="minItems"
                    name="minItems"
                    type="number"
                    min={0}
                    defaultValue={presupuestoInicial.minItems ?? ""}
                  />
                </div>
                <div className="field min-w-0">
                  <label htmlFor="maxItems">Máx. ítems</label>
                  <input
                    className="input w-full min-w-0"
                    id="maxItems"
                    name="maxItems"
                    type="number"
                    min={0}
                    defaultValue={presupuestoInicial.maxItems ?? ""}
                  />
                </div>
              </div>
              <div className="presupuesto-cuentas-wrap">
                <p className="text-sm font-semibold text-navy">Límites por cuenta ($)</p>
                <table className="presupuesto-cuentas-table">
                  <colgroup>
                    <col className="cuenta" />
                    <col className="monto" />
                    <col className="monto" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col">Cuenta</th>
                      <th scope="col">Mín. $</th>
                      <th scope="col">Máx. $</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CUENTAS_PRESUPUESTO.map((cuenta) => {
                      const limites = presupuestoInicial.limitesCuentas?.[cuenta.id];
                      const minName = campoLimiteCuenta(cuenta.id, "min");
                      const maxName = campoLimiteCuenta(cuenta.id, "max");
                      return (
                        <tr key={cuenta.id}>
                          <th scope="row">{cuenta.label}</th>
                          <td>
                            <input
                              className="input"
                              id={minName}
                              name={minName}
                              type="number"
                              min={0}
                              step={1}
                              inputMode="numeric"
                              placeholder="0"
                              aria-label={`${cuenta.label} monto mínimo`}
                              defaultValue={limites?.montoMin ?? ""}
                            />
                          </td>
                          <td>
                            <input
                              className="input"
                              id={maxName}
                              name={maxName}
                              type="number"
                              min={0}
                              step={1}
                              inputMode="numeric"
                              placeholder="0"
                              aria-label={`${cuenta.label} monto máximo`}
                              defaultValue={limites?.montoMax ?? ""}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="grid min-w-0 grid-cols-2 gap-3">
                <div className="field min-w-0">
                  <label htmlFor="montoTotalMin">Monto total mín. ($)</label>
                  <input
                    className="input w-full min-w-0"
                    id="montoTotalMin"
                    name="montoTotalMin"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    placeholder="0"
                    defaultValue={presupuestoInicial.montoTotalMin ?? ""}
                  />
                </div>
                <div className="field min-w-0">
                  <label htmlFor="montoTotalMax">Monto total máx. ($)</label>
                  <input
                    className="input w-full min-w-0"
                    id="montoTotalMax"
                    name="montoTotalMax"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    placeholder="0"
                    defaultValue={presupuestoInicial.montoTotalMax ?? ""}
                  />
                </div>
              </div>
            </div>
          ) : null}
          {tipo === "objetivos_indicadores" ? (
            <div className="grid gap-3">
              <div className="field">
                <label htmlFor="cantidadObjetivosEspecificos">Objetivos específicos</label>
                <input
                  className="input"
                  id="cantidadObjetivosEspecificos"
                  name="cantidadObjetivosEspecificos"
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={objetivosInicial.cantidadObjetivosEspecificos}
                />
              </div>
              <div className="field">
                <label htmlFor="minIndicadoresPorObjetivo">Mín. indicadores por OE</label>
                <input
                  className="input"
                  id="minIndicadoresPorObjetivo"
                  name="minIndicadoresPorObjetivo"
                  type="number"
                  min={0}
                  defaultValue={objetivosInicial.minIndicadoresPorObjetivo ?? ""}
                />
              </div>
              <div className="field">
                <label htmlFor="maxIndicadoresPorObjetivo">Máx. indicadores por OE</label>
                <input
                  className="input"
                  id="maxIndicadoresPorObjetivo"
                  name="maxIndicadoresPorObjetivo"
                  type="number"
                  min={0}
                  defaultValue={objetivosInicial.maxIndicadoresPorObjetivo ?? ""}
                />
              </div>
            </div>
          ) : null}
        </aside>
      ) : null}
    </form>
  );
}

export function InterruptorObligatoria({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-navy">
      <span>Obligatoria</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={checked ? "Obligatoria: sí" : "Obligatoria: no"}
        onClick={(event) => {
          event.stopPropagation();
          onChange(!checked);
        }}
        className={`relative inline-flex h-7 w-[3.5rem] shrink-0 items-center rounded-full border px-0.5 transition-colors ${
          checked ? "border-navy bg-navy" : "border-border bg-slate-100"
        }`}
      >
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 flex w-[45%] items-center justify-center text-[10px] font-bold uppercase tracking-wide ${
            checked ? "left-0 text-white" : "right-0 text-muted"
          }`}
        >
          {checked ? "Sí" : "No"}
        </span>
        <span
          className={`relative z-10 inline-block size-5 rounded-full shadow transition-transform ${
            checked ? "translate-x-[1.65rem] bg-white" : "translate-x-0 bg-white"
          }`}
        />
      </button>
    </div>
  );
}
