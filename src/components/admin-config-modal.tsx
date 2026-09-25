"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/components/modal";
import {
  getConfigCorreoRecuperacion,
  guardarConfigCorreoRecuperacion,
} from "@/actions/config-admin";
import {
  DEFAULT_CORREO_RECUPERACION,
  type ConfigCorreoRecuperacionData,
} from "@/lib/correo-recuperacion";

type Seccion = "recuperacion";

const SECCIONES: { id: Seccion; label: string }[] = [
  { id: "recuperacion", label: "Recuperación" },
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

export function AdminConfigLauncher() {
  const [open, setOpen] = useState(false);
  const [seccion, setSeccion] = useState<Seccion>("recuperacion");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [config, setConfig] = useState<ConfigCorreoRecuperacionData>(() =>
    ({ ...DEFAULT_CORREO_RECUPERACION, imagenUrl: null }),
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
    setError(null);
    setOkMsg(null);
    void getConfigCorreoRecuperacion()
      .then((result) => {
        if (cancelled) return;
        setConfig(result.config);
        setQuitarImagen(false);
        setImagenPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        if (!result.ok) setError(result.error);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const detail = err instanceof Error ? err.message : "";
        setError(
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setOkMsg(null);
    const formData = new FormData(event.currentTarget);
    if (quitarImagen) formData.set("quitarImagen", "1");
    const result = await guardarConfigCorreoRecuperacion(formData);
    setSaving(false);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    if (result && "config" in result && result.config) {
      setConfig(result.config);
      setQuitarImagen(false);
      setImagenPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }
    setOkMsg("Configuración de correo guardada.");
  }

  return (
    <>
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-md text-white/90 hover:bg-white/10 hover:text-white"
        aria-label="Configuración"
        title="Configuración"
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
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.36.5.96.8 1.51.8H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Configuración"
        wide
        tall
        toned
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
                  onClick={() => setSeccion(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="admin-config-main">
            {loading ? (
              <p className="text-muted">Cargando configuración…</p>
            ) : seccion === "recuperacion" ? (
              <form className="admin-config-form space-y-4" onSubmit={onSubmit}>
                <div>
                  <h3 className="font-heading text-xl font-semibold text-navy">
                    Correo de recuperación
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    Definí asunto, textos, colores e imagen del mail que reciben los
                    participantes al pedir restablecer la contraseña. Placeholders:{" "}
                    <code className="rounded bg-white/70 px-1">{"{{nombre}}"}</code> y{" "}
                    <code className="rounded bg-white/70 px-1">{"{{enlace}}"}</code>.
                  </p>
                </div>

                {error ? <p className="text-danger">{error}</p> : null}
                {okMsg ? <p className="font-semibold text-navy">{okMsg}</p> : null}

                <div className="field">
                  <label htmlFor="asunto">Asunto</label>
                  <input
                    className="input"
                    id="asunto"
                    name="asunto"
                    required
                    value={config.asunto}
                    onChange={(event) =>
                      setConfig((prev) => ({ ...prev, asunto: event.target.value }))
                    }
                  />
                </div>

                <div className="field">
                  <label htmlFor="titulo">Título del encabezado</label>
                  <input
                    className="input"
                    id="titulo"
                    name="titulo"
                    required
                    value={config.titulo}
                    onChange={(event) =>
                      setConfig((prev) => ({ ...prev, titulo: event.target.value }))
                    }
                  />
                </div>

                <div className="field">
                  <label htmlFor="cuerpo">Cuerpo</label>
                  <textarea
                    className="input min-h-28"
                    id="cuerpo"
                    name="cuerpo"
                    required
                    value={config.cuerpo}
                    onChange={(event) =>
                      setConfig((prev) => ({ ...prev, cuerpo: event.target.value }))
                    }
                  />
                </div>

                <div className="field">
                  <label htmlFor="textoBoton">Texto del botón</label>
                  <input
                    className="input"
                    id="textoBoton"
                    name="textoBoton"
                    required
                    value={config.textoBoton}
                    onChange={(event) =>
                      setConfig((prev) => ({ ...prev, textoBoton: event.target.value }))
                    }
                  />
                </div>

                <div className="field">
                  <label htmlFor="pie">Pie / enlace alternativo</label>
                  <textarea
                    className="input min-h-20"
                    id="pie"
                    name="pie"
                    value={config.pie}
                    onChange={(event) =>
                      setConfig((prev) => ({ ...prev, pie: event.target.value }))
                    }
                  />
                </div>

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

                <div
                  className="overflow-hidden rounded-xl border border-border"
                  style={{ background: config.colorFondo }}
                >
                  <p className="border-b border-border bg-white/70 px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted">
                    Vista previa
                  </p>
                  {previewImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewImg} alt="" className="max-h-28 w-full object-cover" />
                  ) : null}
                  <div
                    className="px-4 py-3 text-white"
                    style={{ background: config.colorEncabezado }}
                  >
                    <p className="font-heading text-lg font-semibold">{config.titulo}</p>
                  </div>
                  <div className="space-y-3 bg-white px-4 py-4 text-sm" style={{ color: config.colorTexto }}>
                    <p className="whitespace-pre-wrap">{config.cuerpo}</p>
                    <span
                      className="inline-block rounded-lg px-4 py-2 text-sm font-bold text-white"
                      style={{ background: config.colorBoton }}
                    >
                      {config.textoBoton}
                    </span>
                    <p className="whitespace-pre-wrap text-xs opacity-80">{config.pie}</p>
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
                  <button className="btn btn-primary" type="submit" disabled={saving}>
                    {saving ? "Guardando…" : "Guardar"}
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
