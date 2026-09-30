"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { IndicadorGuardando } from "@/components/indicador-guardando";
import { Modal } from "@/components/modal";
import {
  getConfigApp,
  getConfigCorreoNotificaciones,
  getConfigCorreoRecuperacion,
  guardarConfigApp,
  guardarConfigCorreoNotificacion,
  guardarConfigCorreoRecuperacion,
} from "@/actions/config-admin";
import { DEFAULT_CONFIG_APP, type ConfigAppData } from "@/lib/config-app";
import {
  DEFAULT_CORREO_RECUPERACION,
  type ConfigCorreoRecuperacionData,
} from "@/lib/correo-recuperacion";
import {
  DEFAULT_CORREO_NOTIFICACION,
  SECCIONES_CORREO_NOTIFICACION,
  isTipoCorreoNotificacion,
  type TextosCorreoNotificacion,
  type TipoCorreoNotificacion,
} from "@/lib/correo-notificacion-ui";
import { useAccionOptimista } from "@/lib/use-dato-optimista";

type Seccion = "formularios" | "recuperacion" | TipoCorreoNotificacion;

const SECCIONES: { id: Seccion; label: string }[] = [
  { id: "formularios", label: "Formularios" },
  { id: "recuperacion", label: "Recuperación" },
  ...SECCIONES_CORREO_NOTIFICACION.map((item) => ({
    id: item.id,
    label: item.label,
  })),
];

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          className="h-11 w-14 cursor-pointer rounded-md border border-border bg-white p-1"
          id={`${id}-picker`}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${label} (selector)`}
        />
        <input
          className="input flex-1 font-mono text-sm uppercase"
          id={id}
          name={id}
          type="text"
          pattern="#[0-9A-Fa-f]{6}"
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function CamposTextos({
  prefix,
  value,
  onChange,
}: {
  prefix: string;
  value: TextosCorreoNotificacion;
  onChange: (next: TextosCorreoNotificacion) => void;
}) {
  return (
    <>
      <div className="field">
        <label htmlFor={`${prefix}-asunto`}>Asunto</label>
        <input
          className="input"
          id={`${prefix}-asunto`}
          name="asunto"
          required
          value={value.asunto}
          onChange={(event) => onChange({ ...value, asunto: event.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-titulo`}>Título del encabezado</label>
        <input
          className="input"
          id={`${prefix}-titulo`}
          name="titulo"
          required
          value={value.titulo}
          onChange={(event) => onChange({ ...value, titulo: event.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-cuerpo`}>Cuerpo</label>
        <textarea
          className="input min-h-28"
          id={`${prefix}-cuerpo`}
          name="cuerpo"
          required
          value={value.cuerpo}
          onChange={(event) => onChange({ ...value, cuerpo: event.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-textoBoton`}>Texto del botón</label>
        <input
          className="input"
          id={`${prefix}-textoBoton`}
          name="textoBoton"
          required
          value={value.textoBoton}
          onChange={(event) => onChange({ ...value, textoBoton: event.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-pie`}>Pie / enlace alternativo</label>
        <textarea
          className="input min-h-20"
          id={`${prefix}-pie`}
          name="pie"
          value={value.pie}
          onChange={(event) => onChange({ ...value, pie: event.target.value })}
        />
      </div>
    </>
  );
}

function VistaPreviaCorreo({
  colorFondo,
  colorEncabezado,
  colorBoton,
  colorTexto,
  imagen,
  titulo,
  cuerpo,
  textoBoton,
  pie,
}: {
  colorFondo: string;
  colorEncabezado: string;
  colorBoton: string;
  colorTexto: string;
  imagen: string | null;
  titulo: string;
  cuerpo: string;
  textoBoton: string;
  pie: string;
}) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border"
      style={{ background: colorFondo }}
    >
      <p className="border-b border-border bg-white/70 px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted">
        Vista previa
      </p>
      {imagen ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imagen} alt="" className="max-h-28 w-full object-cover" />
      ) : null}
      <div className="px-4 py-3 text-white" style={{ background: colorEncabezado }}>
        <p className="font-heading text-lg font-semibold">{titulo}</p>
      </div>
      <div className="space-y-3 bg-white px-4 py-4 text-sm" style={{ color: colorTexto }}>
        <p className="whitespace-pre-wrap">{cuerpo}</p>
        <span
          className="inline-block rounded-lg px-4 py-2 text-sm font-bold text-white"
          style={{ background: colorBoton }}
        >
          {textoBoton}
        </span>
        <p className="whitespace-pre-wrap text-xs opacity-80">{pie}</p>
      </div>
    </div>
  );
}

export function AdminConfigLauncher() {
  const [open, setOpen] = useState(false);
  const [seccion, setSeccion] = useState<Seccion>("formularios");
  const [loading, setLoading] = useState(false);
  const accion = useAccionOptimista();
  const error = accion.error;
  const okMsg = accion.mensaje;
  const [configApp, setConfigApp] = useState<ConfigAppData>(DEFAULT_CONFIG_APP);
  const [config, setConfig] = useState<ConfigCorreoRecuperacionData>(() => ({
    ...DEFAULT_CORREO_RECUPERACION,
    imagenUrl: null,
  }));
  const [textos, setTextos] = useState<Record<TipoCorreoNotificacion, TextosCorreoNotificacion>>(
    () => ({ ...DEFAULT_CORREO_NOTIFICACION }),
  );
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [quitarImagen, setQuitarImagen] = useState(false);

  useEffect(() => {
    return () => {
      if (imagenPreview) URL.revokeObjectURL(imagenPreview);
    };
  }, [imagenPreview]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    accion.setError(null);
    accion.setMensaje(null);
    void Promise.all([
      getConfigApp(),
      getConfigCorreoRecuperacion(),
      getConfigCorreoNotificaciones(),
    ])
      .then(([app, recuperacion, avisos]) => {
        if (cancelled) return;
        setConfigApp(app.config);
        setConfig(recuperacion.config);
        setTextos(avisos.textos);
        setQuitarImagen(false);
        setImagenPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        const parts = [
          !app.ok ? app.error : null,
          !recuperacion.ok ? recuperacion.error : null,
          !avisos.ok ? avisos.error : null,
        ].filter(Boolean);
        if (parts.length > 0) accion.setError(parts.join(" "));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const detail = err instanceof Error ? err.message : "";
        accion.setError(
          detail
            ? `No se pudo cargar la configuración. ${detail.slice(0, 160)}`
            : "No se pudo cargar la configuración.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const previewImg = useMemo(() => {
    if (quitarImagen) return null;
    return imagenPreview ?? config.imagenUrl;
  }, [quitarImagen, imagenPreview, config.imagenUrl]);

  const avisoActual = isTipoCorreoNotificacion(seccion)
    ? SECCIONES_CORREO_NOTIFICACION.find((item) => item.id === seccion)
    : null;

  function onSubmitRecuperacion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (quitarImagen) formData.set("quitarImagen", "1");
    accion.setMensaje("Configuración de correo guardada.");
    void accion.ejecutar(() => guardarConfigCorreoRecuperacion(formData), {
      onOk: (result) => {
        if (result && "config" in result && result.config) {
          setConfig(result.config);
          setQuitarImagen(false);
          setImagenPreview((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
        }
      },
    });
  }

  function onSubmitFormularios(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set(
      "permitirEvaluacionPorPregunta",
      configApp.permitirEvaluacionPorPregunta ? "1" : "0",
    );
    accion.setMensaje("Configuración de formularios guardada.");
    void accion.ejecutar(() => guardarConfigApp(formData), {
      onOk: (result) => {
        if (result && "config" in result && result.config) {
          setConfigApp(result.config);
        }
      },
    });
  }

  function onSubmitAviso(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    accion.setMensaje("Configuración de correo guardada.");
    void accion.ejecutar(() => guardarConfigCorreoNotificacion(new FormData(event.currentTarget)), {
      onOk: (result) => {
        if (result && "textos" in result && result.textos) {
          setTextos(result.textos);
        }
      },
    });
  }

  return (
    <>
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-md text-white/90 hover:bg-white/10 hover:text-white"
        aria-label="Configuración"
        title="Configuración"
        data-tour="admin-config"
        onClick={() => setOpen(true)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden
        >
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.36.5.96.8 1.51.8H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Configuración"
        wide
        tall
        toned
        sinCerrar
      >
        <div className="admin-config-shell">
          <aside className="admin-config-side" aria-label="Secciones de configuración">
            <p className="admin-config-side-label">Ajustes</p>
            <nav className="admin-config-nav">
              {SECCIONES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`admin-config-nav-item${seccion === item.id ? " is-active" : ""}`}
                  onClick={() => {
                    setSeccion(item.id);
                    accion.setError(null);
                    accion.setMensaje(null);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="admin-config-main">
            {loading ? (
              <p className="text-muted">Cargando configuración…</p>
            ) : seccion === "formularios" ? (
              <form className="admin-config-form space-y-4" onSubmit={onSubmitFormularios}>
                <div>
                  <h3 className="font-heading text-xl font-semibold text-navy">Formularios</h3>
                  <p className="mt-1 text-sm text-muted">
                    Controla qué tipos de evaluación se pueden elegir al crear un formulario.
                    Los formularios ya existentes no se modifican.
                  </p>
                </div>

                {error ? <p className="text-danger">{error}</p> : null}
                {okMsg ? <p className="font-semibold text-navy">{okMsg}</p> : null}
                <IndicadorGuardando visible={accion.guardando} />

                <div className="flex flex-wrap items-start gap-3 rounded-xl border border-border bg-white/70 p-4">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={configApp.permitirEvaluacionPorPregunta}
                    aria-label="Permitir evaluación pregunta por pregunta"
                    onClick={() =>
                      setConfigApp((prev) => ({
                        ...prev,
                        permitirEvaluacionPorPregunta: !prev.permitirEvaluacionPorPregunta,
                      }))
                    }
                    className={`relative inline-flex h-7 w-[3.5rem] shrink-0 items-center rounded-full border px-0.5 transition-colors ${
                      configApp.permitirEvaluacionPorPregunta
                        ? "border-navy bg-navy"
                        : "border-border bg-slate-100"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute inset-y-0 flex w-[45%] items-center justify-center text-[10px] font-bold uppercase tracking-wide ${
                        configApp.permitirEvaluacionPorPregunta
                          ? "left-0 text-white"
                          : "right-0 text-muted"
                      }`}
                    >
                      {configApp.permitirEvaluacionPorPregunta ? "Sí" : "No"}
                    </span>
                    <span
                      className={`relative z-10 inline-block size-5 rounded-full shadow transition-transform ${
                        configApp.permitirEvaluacionPorPregunta
                          ? "translate-x-[1.65rem] bg-white"
                          : "translate-x-0 bg-white"
                      }`}
                    />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-navy">Evaluación pregunta por pregunta</p>
                    <p className="mt-1 text-sm text-muted">
                      Si está desactivada, al crear un formulario solo estará disponible la
                      evaluación general.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => setOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button className="btn btn-primary" type="submit">
                    Guardar
                  </button>
                </div>
              </form>
            ) : seccion === "recuperacion" ? (
              <form className="admin-config-form space-y-4" onSubmit={onSubmitRecuperacion}>
                <div>
                  <h3 className="font-heading text-xl font-semibold text-navy">
                    Correo de recuperación
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    Definí asunto, textos, colores e imagen del mail que reciben los
                    participantes al pedir restablecer la contraseña. Placeholders:{" "}
                    <code className="rounded bg-white/70 px-1">{"{{nombre}}"}</code> y{" "}
                    <code className="rounded bg-white/70 px-1">{"{{enlace}}"}</code>.
                    Los colores e imagen también se usan en los avisos de novedades.
                  </p>
                </div>

                {error ? <p className="text-danger">{error}</p> : null}
                {okMsg ? <p className="font-semibold text-navy">{okMsg}</p> : null}
                <IndicadorGuardando visible={accion.guardando} />

                <CamposTextos prefix="recuperacion" value={config} onChange={(next) => setConfig((prev) => ({ ...prev, ...next }))} />

                <div className="grid gap-3 sm:grid-cols-2">
                  <ColorField
                    id="colorFondo"
                    label="Color de fondo"
                    value={config.colorFondo}
                    onChange={(value) =>
                      setConfig((prev) => ({ ...prev, colorFondo: value }))
                    }
                  />
                  <ColorField
                    id="colorEncabezado"
                    label="Color de encabezado"
                    value={config.colorEncabezado}
                    onChange={(value) =>
                      setConfig((prev) => ({ ...prev, colorEncabezado: value }))
                    }
                  />
                  <ColorField
                    id="colorBoton"
                    label="Color del botón"
                    value={config.colorBoton}
                    onChange={(value) =>
                      setConfig((prev) => ({ ...prev, colorBoton: value }))
                    }
                  />
                  <ColorField
                    id="colorTexto"
                    label="Color del texto"
                    value={config.colorTexto}
                    onChange={(value) =>
                      setConfig((prev) => ({ ...prev, colorTexto: value }))
                    }
                  />
                </div>

                <div className="field">
                  <label htmlFor="imagen">Imagen del correo</label>
                  <input
                    className="input"
                    id="imagen"
                    name="imagen"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      setQuitarImagen(false);
                      setImagenPreview((prev) => {
                        if (prev) URL.revokeObjectURL(prev);
                        return file ? URL.createObjectURL(file) : null;
                      });
                    }}
                  />
                  {previewImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewImg}
                      alt="Vista previa de la imagen del correo"
                      className="mt-2 max-h-40 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-muted">
                      Opcional. Se muestra arriba del encabezado del mail.
                    </p>
                  )}
                  {config.imagenUrl || imagenPreview ? (
                    <label className="mt-2 flex items-center gap-2 text-sm text-muted">
                      <input
                        type="checkbox"
                        checked={quitarImagen}
                        onChange={(event) => setQuitarImagen(event.target.checked)}
                      />
                      Quitar imagen actual
                    </label>
                  ) : null}
                </div>

                <VistaPreviaCorreo
                  colorFondo={config.colorFondo}
                  colorEncabezado={config.colorEncabezado}
                  colorBoton={config.colorBoton}
                  colorTexto={config.colorTexto}
                  imagen={previewImg}
                  titulo={config.titulo}
                  cuerpo={config.cuerpo}
                  textoBoton={config.textoBoton}
                  pie={config.pie}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => setOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button className="btn btn-primary" type="submit">
                    Guardar
                  </button>
                </div>
              </form>
            ) : avisoActual ? (
              <form className="admin-config-form space-y-4" onSubmit={onSubmitAviso}>
                <input type="hidden" name="tipo" value={avisoActual.id} />
                <div>
                  <h3 className="font-heading text-xl font-semibold text-navy">
                    {avisoActual.label}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {avisoActual.descripcion} Placeholders:{" "}
                    <code className="rounded bg-white/70 px-1">{avisoActual.placeholders}</code>
                    . Colores e imagen se toman del correo de recuperación.
                  </p>
                </div>

                {error ? <p className="text-danger">{error}</p> : null}
                {okMsg ? <p className="font-semibold text-navy">{okMsg}</p> : null}
                <IndicadorGuardando visible={accion.guardando} />

                <CamposTextos
                  prefix={avisoActual.id}
                  value={textos[avisoActual.id]}
                  onChange={(next) =>
                    setTextos((prev) => ({ ...prev, [avisoActual.id]: next }))
                  }
                />

                <VistaPreviaCorreo
                  colorFondo={config.colorFondo}
                  colorEncabezado={config.colorEncabezado}
                  colorBoton={config.colorBoton}
                  colorTexto={config.colorTexto}
                  imagen={previewImg}
                  titulo={textos[avisoActual.id].titulo}
                  cuerpo={textos[avisoActual.id].cuerpo}
                  textoBoton={textos[avisoActual.id].textoBoton}
                  pie={textos[avisoActual.id].pie}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => setOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button className="btn btn-primary" type="submit">
                    Guardar
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      </Modal>
    </>
  );
}
