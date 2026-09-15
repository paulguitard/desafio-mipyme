"use client";

import { useEffect, useMemo, useState } from "react";
import {
  actualizarConvocatoria,
  cargarPanelEvaluacion,
  crearConvocatoria,
  toggleConvocatoriaForm,
} from "@/actions/convocatorias";
import { ConfirmForm } from "@/components/confirm-form";
import { ConvocatoriaEvaluacion } from "@/components/convocatoria-evaluacion";
import { Modal } from "@/components/modal";
import type { PanelEvaluacion } from "@/lib/convocatoria-admin-data";
import { formatoRangoFechas, toDatetimeLocalValue } from "@/lib/convocatoria";

export type ConvocatoriaListaItem = {
  id: string;
  titulo: string;
  descripcion: string;
  estado: string;
  formularioId: string;
  formularioTitulo: string;
  postulaciones: number;
  fechaInicio: string | null;
  fechaCierre: string | null;
  imagenUrl: string | null;
};

export type FormularioOpcion = { id: string; titulo: string };

export function ConvocatoriasAdmin({
  convocatorias,
  formularios,
}: {
  convocatorias: ConvocatoriaListaItem[];
  formularios: FormularioOpcion[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ConvocatoriaListaItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [evaluacionOpen, setEvaluacionOpen] = useState(false);
  const [evaluacionTitulo, setEvaluacionTitulo] = useState("");
  const [evaluacion, setEvaluacion] = useState<PanelEvaluacion | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const tituloModal = editing ? "Editar convocatoria" : "Crear convocatoria";

  useEffect(() => {
    return () => {
      if (imagenPreview) URL.revokeObjectURL(imagenPreview);
    };
  }, [imagenPreview]);

  const defaultInicio = useMemo(
    () => toDatetimeLocalValue(editing?.fechaInicio),
    [editing],
  );
  const defaultCierre = useMemo(
    () => toDatetimeLocalValue(editing?.fechaCierre),
    [editing],
  );

  function abrirCrear() {
    setEditing(null);
    setError(null);
    setImagenPreview(null);
    setOpen(true);
  }

  function abrirEditar(item: ConvocatoriaListaItem) {
    setEditing(item);
    setError(null);
    setImagenPreview(null);
    setOpen(true);
  }

  function cerrarModal() {
    setOpen(false);
    setError(null);
    setImagenPreview(null);
  }

  async function abrirEvaluacion(item: ConvocatoriaListaItem) {
    setEvaluacionOpen(true);
    setEvaluacionTitulo(item.titulo);
    setEvaluacion(null);
    setPanelError(null);
    setPanelLoading(true);
    const result = await cargarPanelEvaluacion(item.id);
    setPanelLoading(false);
    if ("error" in result && result.error) {
      setPanelError(result.error);
      return;
    }
    if ("data" in result && result.data) setEvaluacion(result.data);
  }

  async function refrescarEvaluacion() {
    if (!evaluacion) return;
    const result = await cargarPanelEvaluacion(evaluacion.id);
    if ("data" in result && result.data) {
      setEvaluacion(result.data);
    }
  }

  return (
    <div className="page-scroll h-full space-y-8 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold text-navy">Convocatorias</h1>
        <button className="btn btn-sm btn-primary" type="button" onClick={abrirCrear}>
          Crear convocatoria
        </button>
      </div>

      <div className="space-y-3">
        {convocatorias.length === 0 ? (
          <p className="text-muted">Aún no hay convocatorias.</p>
        ) : null}
        {convocatorias.map((item) => {
          const rango = formatoRangoFechas(item.fechaInicio, item.fechaCierre);
          return (
            <article key={item.id} className="card flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                {item.imagenUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imagenUrl}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="text-xl font-semibold">{item.titulo}</p>
                  <p className="text-muted">
                    {item.formularioTitulo} · {item.postulaciones} casos · {item.estado}
                  </p>
                  {rango ? <p className="text-muted">{rango}</p> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-sm btn-secondary" type="button" onClick={() => abrirEvaluacion(item)}>
                  Ver
                </button>
                <button className="btn btn-sm btn-secondary" type="button" onClick={() => abrirEditar(item)}>
                  Editar
                </button>
                <ConfirmForm
                  action={toggleConvocatoriaForm}
                  message={
                    item.estado === "ABIERTA"
                      ? "Al cerrar, nadie podrá editar ni evaluar. ¿Continuar?"
                      : "¿Reabrir esta convocatoria?"
                  }
                >
                  <input type="hidden" name="id" value={item.id} />
                  <button className="btn btn-sm btn-secondary" type="submit">
                    {item.estado === "ABIERTA" ? "Cerrar" : "Abrir"}
                  </button>
                </ConfirmForm>
              </div>
            </article>
          );
        })}
      </div>

      <Modal
        open={evaluacionOpen}
        title={
          <>
            <span>{evaluacion?.titulo ?? evaluacionTitulo}</span>
            {evaluacion ? (
              <>
                <span className="modal-title-sep" aria-hidden="true">
                  ----
                </span>
                <span className="modal-title-meta">
                  ({evaluacion.postulaciones.length}) Respuestas
                </span>
              </>
            ) : null}
          </>
        }
        wide
        tall
        toned
        onClose={() => {
          setEvaluacionOpen(false);
          setEvaluacion(null);
          setEvaluacionTitulo("");
          setPanelError(null);
        }}
      >
        {panelLoading && evaluacionOpen ? (
          <p className="respuestas-lista text-muted">Cargando evaluación…</p>
        ) : null}
        {panelError && evaluacionOpen ? <p className="respuestas-lista text-danger">{panelError}</p> : null}
        {evaluacion ? (
          <ConvocatoriaEvaluacion
            convocatoriaId={evaluacion.id}
            estadoConvocatoria={evaluacion.estado}
            evaluacionesPorPostulacion={evaluacion.evaluacionesPorPostulacion}
            preguntas={evaluacion.preguntas}
            pool={evaluacion.pool}
            evaluadoresDisponibles={evaluacion.evaluadoresDisponibles}
            postulaciones={evaluacion.postulaciones}
            onMutated={refrescarEvaluacion}
          />
        ) : null}
      </Modal>

      <Modal open={open} title={tituloModal} onClose={cerrarModal}>
        <form
          key={editing?.id ?? "nuevo"}
          className="grid gap-4"
          action={async (formData) => {
            setSaving(true);
            setError(null);
            const result = editing
              ? await actualizarConvocatoria(formData)
              : await crearConvocatoria(formData);
            setSaving(false);
            if (result && "error" in result && result.error) {
              setError(result.error);
              return;
            }
            cerrarModal();
          }}
        >
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          {error ? <p className="text-danger">{error}</p> : null}
          <div className="field">
            <label htmlFor="imagen">Imagen</label>
            <input
              className="input"
              id="imagen"
              name="imagen"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setImagenPreview((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return file ? URL.createObjectURL(file) : null;
                });
              }}
            />
            {imagenPreview || editing?.imagenUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagenPreview ?? editing?.imagenUrl ?? ""}
                alt="Vista previa"
                className="mt-2 h-32 w-full rounded-xl object-cover"
              />
            ) : (
              <p className="text-muted">Opcional. Si no eliges una, se mantiene la actual.</p>
            )}
          </div>
          <div className="field">
            <label htmlFor="titulo">Título</label>
            <input
              className="input"
              id="titulo"
              name="titulo"
              required
              defaultValue={editing?.titulo ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="descripcion">Descripción</label>
            <textarea
              className="input"
              id="descripcion"
              name="descripcion"
              defaultValue={editing?.descripcion ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="formularioId">Formulario</label>
            <select
              className="input"
              id="formularioId"
              name="formularioId"
              required
              defaultValue={editing?.formularioId ?? ""}
              disabled={Boolean(editing && editing.postulaciones > 0)}
            >
              <option value="">Selecciona un formulario</option>
              {formularios.map((form) => (
                <option key={form.id} value={form.id}>
                  {form.titulo}
                </option>
              ))}
            </select>
            {editing && editing.postulaciones > 0 ? (
              <>
                <input type="hidden" name="formularioId" value={editing.formularioId} />
                <p className="text-muted">No se puede cambiar el formulario porque ya hay casos.</p>
              </>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field">
              <label htmlFor="fechaInicio">Fecha de inicio</label>
              <input
                className="input"
                id="fechaInicio"
                name="fechaInicio"
                type="datetime-local"
                required
                defaultValue={defaultInicio}
              />
            </div>
            <div className="field">
              <label htmlFor="fechaCierre">Fecha de cierre</label>
              <input
                className="input"
                id="fechaCierre"
                name="fechaCierre"
                type="datetime-local"
                required
                defaultValue={defaultCierre}
              />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear convocatoria"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
