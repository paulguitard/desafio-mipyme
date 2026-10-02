"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  actualizarConvocatoria,
  cargarPanelEvaluacion,
  crearConvocatoria,
  eliminarConvocatoria,
  toggleConvocatoria,
} from "@/actions/convocatorias";
import { ConvocatoriaEvaluacion } from "@/components/convocatoria-evaluacion";
import { ImagenMentoriaCover, ImagenMentoriaEncuadre } from "@/components/imagen-mentoria";
import { IndicadorGuardando } from "@/components/indicador-guardando";
import { Modal } from "@/components/modal";
import type { PanelEvaluacion } from "@/lib/convocatoria-admin-data";
import { CONTEXTO_PANEL_MENTORIA } from "@/lib/tutoriales";
import { errorDeResultado, useDatoOptimista } from "@/lib/use-dato-optimista";
import {
  diasRestantesHasta,
  etiquetaCierreAbierto,
  etiquetaDiasRestantes,
  formatoRangoFechas,
  parseFechaForm,
  toDatetimeLocalValue,
  type PosicionImagen,
} from "@/lib/convocatoria";
import {
  TIPO_FORMULARIO_LABEL,
  esMentoriaContenido,
  parseTipoFormulario,
  type TipoFormulario,
} from "@/lib/tipo-formulario";

export type ConvocatoriaListaItem = {
  id: string;
  titulo: string;
  descripcion: string;
  estado: string;
  tipo: TipoFormulario;
  formularioId: string;
  formularioTitulo: string;
  postulaciones: number;
  fechaInicio: string | null;
  fechaCierre: string | null;
  imagenUrl: string | null;
  imagenPos: PosicionImagen;
};

export type FormularioOpcion = { id: string; titulo: string; tipo: TipoFormulario };

export function ConvocatoriasAdmin({
  convocatorias,
  formularios,
}: {
  convocatorias: ConvocatoriaListaItem[];
  formularios: FormularioOpcion[];
}) {
  const router = useRouter();
  const lista = useDatoOptimista(convocatorias);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ConvocatoriaListaItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [imagenPos, setImagenPos] = useState<PosicionImagen>({ x: 50, y: 50 });
  const [vistaEmprendedor, setVistaEmprendedor] = useState(false);
  const [vistaDatos, setVistaDatos] = useState<{
    titulo: string;
    descripcion: string;
    fechaCierre: Date | null;
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [evaluacionOpen, setEvaluacionOpen] = useState(false);
  const [evaluacionTitulo, setEvaluacionTitulo] = useState("");
  const [evaluacion, setEvaluacion] = useState<PanelEvaluacion | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [tipoMentoria, setTipoMentoria] = useState<TipoFormulario>("FEEDBACK");
  const tituloModal = editing ? "Editar mentoría" : "Crear mentoría";
  const tipoBloqueado = Boolean(editing && editing.postulaciones > 0);
  const formulariosDelTipo = formularios.filter((form) => form.tipo === tipoMentoria);

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
    setTipoMentoria("FEEDBACK");
    setImagenPreview(null);
    setImagenPos({ x: 50, y: 50 });
    setVistaEmprendedor(false);
    setVistaDatos(null);
    setOpen(true);
  }

  function abrirEditar(item: ConvocatoriaListaItem) {
    setEditing(item);
    setError(null);
    setTipoMentoria(parseTipoFormulario(item.tipo));
    setImagenPreview(null);
    setImagenPos(item.imagenPos);
    setVistaEmprendedor(false);
    setVistaDatos(null);
    setOpen(true);
  }

  function cerrarModal() {
    setOpen(false);
    setError(null);
    setImagenPreview(null);
    setVistaEmprendedor(false);
    setVistaDatos(null);
  }

  function abrirVistaEmprendedor() {
    if (vistaEmprendedor) {
      setVistaEmprendedor(false);
      return;
    }
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    setVistaDatos({
      titulo: String(data.get("titulo") ?? "").trim() || "Sin título",
      descripcion: String(data.get("descripcion") ?? "").trim(),
      fechaCierre: parseFechaForm(String(data.get("fechaCierre") ?? "")),
    });
    setVistaEmprendedor(true);
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

  function itemDesdeFormulario(
    formData: FormData,
    actual: ConvocatoriaListaItem | null,
    tempId: string,
  ): ConvocatoriaListaItem {
    const formularioId = String(formData.get("formularioId") ?? actual?.formularioId ?? "");
    const inicio = parseFechaForm(String(formData.get("fechaInicio") ?? ""));
    const cierre = parseFechaForm(String(formData.get("fechaCierre") ?? ""));
    return {
      id: actual?.id ?? tempId,
      titulo: String(formData.get("titulo") ?? "").trim(),
      descripcion: String(formData.get("descripcion") ?? "").trim(),
      estado: actual?.estado ?? "ABIERTA",
      tipo: parseTipoFormulario(String(formData.get("tipo") ?? actual?.tipo ?? "FEEDBACK")),
      formularioId,
      formularioTitulo:
        formularios.find((form) => form.id === formularioId)?.titulo ?? actual?.formularioTitulo ?? "",
      postulaciones: actual?.postulaciones ?? 0,
      fechaInicio: inicio ? inicio.toISOString() : null,
      fechaCierre: cierre ? cierre.toISOString() : null,
      imagenUrl: imagenPreview ?? actual?.imagenUrl ?? null,
      imagenPos,
    };
  }

  function persistirYRefrescar(
    apply: (prev: ConvocatoriaListaItem[]) => ConvocatoriaListaItem[],
    accion: () => Promise<unknown>,
  ) {
    void lista.aplicar(apply, accion).then((result) => {
      if (!errorDeResultado(result)) router.refresh();
    });
  }

  return (
    <div className="page-scroll h-full space-y-8 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold text-navy">Mentorías</h1>
        <button className="btn btn-sm btn-primary" type="button" onClick={abrirCrear}>
          Crear mentoría
        </button>
      </div>
      <IndicadorGuardando visible={lista.guardando} />
      {lista.error ? <p className="text-danger">{lista.error}</p> : null}

      <div className="space-y-3" data-tour="mentorias-lista">
        {lista.dato.length === 0 ? (
          <p className="text-muted">Aún no hay mentorías.</p>
        ) : null}
        {lista.dato.map((item, index) => {
          const rango = formatoRangoFechas(item.fechaInicio, item.fechaCierre);
          return (
            <article key={item.id} className="card flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                {item.imagenUrl ? (
                  <ImagenMentoriaCover
                    src={item.imagenUrl}
                    pos={item.imagenPos}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="text-xl font-semibold">{item.titulo}</p>
                  <p className="text-muted">
                    {TIPO_FORMULARIO_LABEL[parseTipoFormulario(item.tipo)]} · {item.formularioTitulo} · {item.postulaciones} casos · {item.estado}
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
                <button
                  className="btn btn-sm btn-secondary"
                  type="button"
                  data-tour={index === 0 ? "mentoria-abrir-cerrar" : undefined}
                  onClick={() => {
                    const cerrar = item.estado === "ABIERTA";
                    const ok = window.confirm(
                      cerrar
                        ? "Al cerrar, nadie podrá editar ni evaluar. ¿Continuar?"
                        : "¿Reabrir esta mentoría?",
                    );
                    if (!ok) return;
                    const formData = new FormData();
                    formData.set("id", item.id);
                    persistirYRefrescar(
                      (prev) =>
                        prev.map((row) =>
                          row.id === item.id
                            ? { ...row, estado: row.estado === "ABIERTA" ? "CERRADA" : "ABIERTA" }
                            : row,
                        ),
                      () => toggleConvocatoria(formData),
                    );
                  }}
                >
                  {item.estado === "ABIERTA" ? "Cerrar" : "Abrir"}
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  type="button"
                  onClick={() => {
                    const ok = window.confirm(
                      item.postulaciones > 0
                        ? `¿Eliminar "${item.titulo}"?\n\nSe borrarán ${item.postulaciones} caso(s), respuestas, evaluaciones y archivos. Esta acción no se puede deshacer.`
                        : `¿Eliminar "${item.titulo}"?\n\nEsta acción no se puede deshacer.`,
                    );
                    if (!ok) return;
                    const formData = new FormData();
                    formData.set("id", item.id);
                    persistirYRefrescar(
                      (prev) => prev.filter((row) => row.id !== item.id),
                      () => eliminarConvocatoria(formData),
                    );
                  }}
                >
                  Eliminar
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <Modal
        open={evaluacionOpen}
        tourContexto={CONTEXTO_PANEL_MENTORIA}
        tourAnclaTitulo="mentoria-ficha"
        title={
          <>
            <span>{evaluacion?.titulo ?? evaluacionTitulo}</span>
            {evaluacion ? (
              <>
                <span className="modal-title-sep" aria-hidden="true">
                  ----
                </span>
                <span className="modal-title-meta">
                  {esMentoriaContenido(evaluacion.tipo)
                    ? `(${evaluacion.postulaciones.length}) Participantes`
                    : `(${evaluacion.postulaciones.length}) Respuestas`}
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
            tipo={evaluacion.tipo}
            piezas={evaluacion.piezas}
            evaluacionesPorPostulacion={evaluacion.evaluacionesPorPostulacion}
            preguntas={evaluacion.preguntas}
            pool={evaluacion.pool}
            evaluadoresDisponibles={evaluacion.evaluadoresDisponibles}
            poolSupervisores={evaluacion.poolSupervisores}
            supervisoresDisponibles={evaluacion.supervisoresDisponibles}
            postulaciones={evaluacion.postulaciones}
            onMutated={refrescarEvaluacion}
          />
        ) : null}
      </Modal>

      <Modal open={open} title={tituloModal} onClose={cerrarModal}>
        <form
          ref={formRef}
          key={editing?.id ?? "nuevo"}
          className="grid gap-4"
          action={(formData) => {
            const actual = editing;
            const tempId = `tmp-${crypto.randomUUID()}`;
            const siguiente = itemDesdeFormulario(formData, actual, tempId);
            if (!siguiente.titulo) {
              setError("Título y formulario son obligatorios.");
              return;
            }
            cerrarModal();
            persistirYRefrescar(
              (prev) =>
                actual
                  ? prev.map((row) => (row.id === actual.id ? siguiente : row))
                  : [siguiente, ...prev],
              () => (actual ? actualizarConvocatoria(formData) : crearConvocatoria(formData)),
            );
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
                if (file) setImagenPos({ x: 50, y: 50 });
              }}
            />
            <input type="hidden" name="imagenPosX" value={imagenPos.x} />
            <input type="hidden" name="imagenPosY" value={imagenPos.y} />
            {imagenPreview || editing?.imagenUrl ? (
              <div className="card mt-2 p-6">
                <ImagenMentoriaEncuadre
                  src={imagenPreview ?? editing?.imagenUrl ?? ""}
                  pos={imagenPos}
                  onChange={setImagenPos}
                />
              </div>
            ) : (
              <p className="text-muted">Opcional. Si no eliges una, se mantiene la actual.</p>
            )}
            <button
              className="btn btn-sm btn-secondary mt-2 w-fit"
              type="button"
              onClick={abrirVistaEmprendedor}
            >
              {vistaEmprendedor ? "Ocultar vista del emprendedor" : "Ver como emprendedor"}
            </button>
            {vistaEmprendedor && vistaDatos ? (
              <div className="mt-3">
                <p className="mb-2 text-sm font-semibold text-navy">Así lo verán los emprendedores</p>
                <VistaEmprendedorMentoria
                  titulo={vistaDatos.titulo}
                  descripcion={vistaDatos.descripcion}
                  fechaCierre={vistaDatos.fechaCierre}
                  imagenUrl={imagenPreview ?? editing?.imagenUrl ?? null}
                  imagenPos={imagenPos}
                />
              </div>
            ) : null}
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
            <label htmlFor="tipo">Tipo de mentoría</label>
            <select
              className="input"
              id="tipo"
              name="tipo"
              value={tipoMentoria}
              disabled={tipoBloqueado}
              onChange={(event) => setTipoMentoria(parseTipoFormulario(event.target.value))}
            >
              <option value="FEEDBACK">{TIPO_FORMULARIO_LABEL.FEEDBACK}</option>
              <option value="CONTENIDO">{TIPO_FORMULARIO_LABEL.CONTENIDO}</option>
            </select>
            {tipoBloqueado ? (
              <>
                <input type="hidden" name="tipo" value={tipoMentoria} />
                <p className="text-muted">No se puede cambiar el tipo porque ya hay participaciones.</p>
              </>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="formularioId">Formulario</label>
            <select
              className="input"
              id="formularioId"
              name="formularioId"
              required
              defaultValue={
                editing && formulariosDelTipo.some((form) => form.id === editing.formularioId)
                  ? editing.formularioId
                  : ""
              }
              key={`${tipoMentoria}-${editing?.id ?? "nuevo"}`}
              disabled={Boolean(editing && editing.postulaciones > 0)}
            >
              <option value="">Selecciona un formulario</option>
              {formulariosDelTipo.map((form) => (
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
          <button className="btn btn-primary" type="submit">
            {editing ? "Guardar cambios" : "Crear mentoría"}
          </button>
        </form>
      </Modal>
    </div>
  );
}

function VistaEmprendedorMentoria({
  titulo,
  descripcion,
  fechaCierre,
  imagenUrl,
  imagenPos,
}: {
  titulo: string;
  descripcion: string;
  fechaCierre: Date | null;
  imagenUrl: string | null;
  imagenPos: PosicionImagen;
}) {
  const cierre = etiquetaCierreAbierto(fechaCierre);
  const restantes = etiquetaDiasRestantes(diasRestantesHasta(fechaCierre));
  return (
    <article className="card space-y-3 p-6">
      {imagenUrl ? (
        <ImagenMentoriaCover
          src={imagenUrl}
          pos={imagenPos}
          alt=""
          className="h-40 w-full rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-40 w-full items-center justify-center rounded-xl bg-navy-soft text-muted">
          Sin imagen
        </div>
      )}
      <h2 className="text-2xl font-bold text-navy">{titulo}</h2>
      {descripcion ? <p>{descripcion}</p> : <p className="text-muted">Sin descripción</p>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <button className="btn btn-primary" type="button" disabled>
          Participar
        </button>
        <div className="ml-auto flex flex-col items-end gap-2 text-right">
          {cierre ? (
            <p className="flex items-center justify-end gap-2 text-muted">
              <span className="inline-flex text-navy" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path
                    fill="currentColor"
                    d="M7 2h2v2h6V2h2v2h3v18H4V4h3zm12 8H5v10h14zm-9 3h2v2H10zm4 0h2v2h-2zm-8 0h2v2H6zm0 4h2v2H6zm4 0h2v2h-2zm4 0h2v2h-2z"
                  />
                </svg>
              </span>
              {cierre}
            </p>
          ) : null}
          {restantes ? (
            <p className="inline-flex items-center gap-2 rounded-full bg-navy-soft px-3 py-1 text-sm font-bold text-navy">
              <span className="inline-flex" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path
                    fill="currentColor"
                    d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20m0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16m.75 3v5.19l3.53 2.04-.75 1.3L11.25 13V7z"
                  />
                </svg>
              </span>
              {restantes}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
