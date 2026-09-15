"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  agregarEvaluadorAlPool,
  agregarEvaluadoresAlPool,
  asignarEvaluadorAPostulacion,
  asignarEvaluadoresAutomatico,
  eliminarPostulacion,
  guardarConfigEvaluacion,
  quitarEvaluadorDelPool,
} from "@/actions/convocatorias";
import { Modal } from "@/components/modal";
import { parseValor } from "@/lib/preguntas";
import { etiquetaNombreCaso } from "@/lib/nombre-caso";

type Evaluador = { id: string; name: string; email: string };

type PoolItem = {
  evaluadorId: string;
  maxEvaluaciones: number;
  evaluador: Evaluador;
  carga: number;
  asignadas: number;
  revisadas: number;
  finalizadas: number;
};

type Asignacion = {
  evaluadorId: string;
  evaluadorNombre: string;
  orden: number;
  estado: string;
};

type PreguntaFiltro = { id: string; enunciado: string; obligatoria: boolean; opciones?: string };

type RespuestaFiltro = { preguntaId: string; valor: string };

type PostulacionItem = {
  id: string;
  estado: string;
  enviadaAt: string | null;
  emprendedorNombre: string;
  emprendedorEmail: string;
  nombreCaso: string;
  respuestas: RespuestaFiltro[];
  asignaciones: Asignacion[];
};

type EstadoRespuestaFicha = "pendiente" | "observaciones" | "completa";

function textoPlano(valor: unknown) {
  if (Array.isArray(valor)) return valor.join(" ");
  if (valor == null) return "";
  return String(valor);
}

function contiene(haystack: string, needle: string) {
  const q = needle.trim().toLocaleLowerCase("es-CL");
  if (!q) return true;
  return haystack.toLocaleLowerCase("es-CL").includes(q);
}

function idCorto(id: string) {
  return id.slice(-8).toUpperCase();
}

function respuestaConValor(valor: string) {
  const parsed = parseValor(valor);
  if (parsed == null) return false;
  if (Array.isArray(parsed)) return parsed.some((item) => String(item).trim().length > 0);
  if (typeof parsed === "object") return Object.keys(parsed as object).length > 0;
  return String(parsed).trim().length > 0;
}

function estadoRespuestaFicha(
  postulacion: PostulacionItem,
  preguntas: PreguntaFiltro[],
): EstadoRespuestaFicha {
  if (
    postulacion.estado === "CON_OBSERVACIONES" ||
    postulacion.asignaciones.some((item) => item.estado === "CON_OBSERVACIONES")
  ) {
    return "observaciones";
  }

  const porPregunta = new Map(
    postulacion.respuestas.map((item) => [item.preguntaId, item.valor] as const),
  );
  const respondidas = preguntas.filter((pregunta) =>
    respuestaConValor(porPregunta.get(pregunta.id) ?? ""),
  ).length;

  if (respondidas === 0) return "pendiente";

  const obligatorias = preguntas.filter((pregunta) => pregunta.obligatoria);
  const base = obligatorias.length > 0 ? obligatorias : preguntas;
  const completa =
    Boolean(postulacion.enviadaAt) ||
    base.every((pregunta) => respuestaConValor(porPregunta.get(pregunta.id) ?? ""));

  return completa ? "completa" : "pendiente";
}

function etiquetaEstadoRespuesta(estado: EstadoRespuestaFicha) {
  if (estado === "observaciones") return "Respondiendo observaciones";
  if (estado === "completa") return "Completa";
  return "Pendiente";
}

function claseEstadoAsignacion(estado: string) {
  if (estado === "FINALIZADA") return "eval-avatar-finalizada";
  if (estado === "CON_OBSERVACIONES" || estado === "REPARADA") return "eval-avatar-observada";
  return "eval-avatar-pendiente";
}

function estadoAsignacionFicha(estado: string) {
  if (estado === "FINALIZADA") return "finalizada";
  if (estado === "CON_OBSERVACIONES" || estado === "REPARADA") return "observada";
  return "pendiente";
}

function etiquetaEstadoAsignacion(estado: string) {
  const key = estadoAsignacionFicha(estado);
  if (key === "finalizada") return "Finalizada";
  if (key === "observada") return "Observada";
  return "Pendiente";
}

function IconoAlerta() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.5 1.8 20.5h20.4L12 2.5zm0 5.2c.7 0 1.2.5 1.2 1.2v4.4c0 .7-.5 1.2-1.2 1.2s-1.2-.5-1.2-1.2V8.9c0-.7.5-1.2 1.2-1.2zm0 10.1a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6z"
      />
    </svg>
  );
}

function IconoAmpolleta() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 21h6v-1.5H9V21zm3-19a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2zm2.5 13h-5v-.6c0-.5.2-.9.6-1.3A5 5 0 1 1 12 4a5 5 0 0 1 1.9 9.1c.4.4.6.8.6 1.3v.6z"
      />
    </svg>
  );
}

function IconoCheck() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9.55 17.3 4.8 12.55l1.4-1.4 3.35 3.35 7.25-7.25 1.4 1.4z"
      />
    </svg>
  );
}

function IconoEstadoEvaluacion(estado: string) {
  const key = estadoAsignacionFicha(estado);
  if (key === "finalizada") return <IconoCheck />;
  if (key === "observada") return <IconoAmpolleta />;
  return <IconoAlerta />;
}

function IconoLapiz() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconoBasurero() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const DRAG_EVALUADOR = "application/x-evaluador-id";

export function ConvocatoriaEvaluacion({
  convocatoriaId,
  estadoConvocatoria,
  evaluacionesPorPostulacion,
  preguntas,
  pool,
  evaluadoresDisponibles,
  postulaciones,
  onMutated,
}: {
  convocatoriaId: string;
  estadoConvocatoria: string;
  evaluacionesPorPostulacion: number;
  preguntas: PreguntaFiltro[];
  pool: PoolItem[];
  evaluadoresDisponibles: Evaluador[];
  postulaciones: PostulacionItem[];
  onMutated?: () => Promise<void> | void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [poolError, setPoolError] = useState<string | null>(null);
  const [poolMensaje, setPoolMensaje] = useState<string | null>(null);
  const [agregarOpen, setAgregarOpen] = useState(false);
  const [agregarError, setAgregarError] = useState<string | null>(null);
  const [agregarMensaje, setAgregarMensaje] = useState<string | null>(null);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroEmprendedor, setFiltroEmprendedor] = useState("");
  const [filtroCorreo, setFiltroCorreo] = useState("");
  const [filtroPreguntaId, setFiltroPreguntaId] = useState("");
  const [filtroContiene, setFiltroContiene] = useState("");
  const [filtroEstadoRespuesta, setFiltroEstadoRespuesta] = useState("");
  const [filtroEstadoEvaluacion, setFiltroEstadoEvaluacion] = useState("");
  const [filtroEvaluadorId, setFiltroEvaluadorId] = useState("");
  const [portalListo, setPortalListo] = useState(false);
  const [agregando, setAgregando] = useState(false);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [asignando, setAsignando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [editandoCasos, setEditandoCasos] = useState(false);
  const [valorCasos, setValorCasos] = useState(String(evaluacionesPorPostulacion));
  const [guardandoCasos, setGuardandoCasos] = useState(false);
  const inputCasosRef = useRef<HTMLInputElement>(null);
  const cancelandoCasosRef = useRef(false);
  const abierta = estadoConvocatoria === "ABIERTA";
  const poolIds = useMemo(() => new Set(pool.map((item) => item.evaluadorId)), [pool]);
  const respuestas = useMemo(() => postulaciones, [postulaciones]);

  const respuestasFiltradas = useMemo(() => {
    return respuestas.filter((postulacion) => {
      if (
        !contiene(postulacion.emprendedorNombre, filtroEmprendedor) &&
        !contiene(postulacion.nombreCaso, filtroEmprendedor)
      ) {
        return false;
      }
      if (!contiene(postulacion.emprendedorEmail, filtroCorreo)) return false;
      if (filtroEstadoRespuesta) {
        if (estadoRespuestaFicha(postulacion, preguntas) !== filtroEstadoRespuesta) return false;
      }
      if (filtroEvaluadorId || filtroEstadoEvaluacion) {
        if (postulacion.asignaciones.length === 0) return false;
        const coincide = postulacion.asignaciones.some((asignacion) => {
          if (filtroEvaluadorId && asignacion.evaluadorId !== filtroEvaluadorId) return false;
          if (
            filtroEstadoEvaluacion &&
            estadoAsignacionFicha(asignacion.estado) !== filtroEstadoEvaluacion
          ) {
            return false;
          }
          return true;
        });
        if (!coincide) return false;
      }
      if (!filtroPreguntaId || !filtroContiene.trim()) return true;
      const respuesta = postulacion.respuestas.find((item) => item.preguntaId === filtroPreguntaId);
      return contiene(textoPlano(parseValor(respuesta?.valor ?? "")), filtroContiene);
    });
  }, [
    filtroContiene,
    filtroCorreo,
    filtroEmprendedor,
    filtroEstadoEvaluacion,
    filtroEstadoRespuesta,
    filtroEvaluadorId,
    filtroPreguntaId,
    preguntas,
    respuestas,
  ]);

  const evaluadoresFiltrados = useMemo(() => {
    const q = filtroNombre.trim().toLocaleLowerCase("es-CL");
    if (!q) return evaluadoresDisponibles;
    return evaluadoresDisponibles.filter((item) => item.name.toLocaleLowerCase("es-CL").includes(q));
  }, [evaluadoresDisponibles, filtroNombre]);

  const paraAgregar = useMemo(
    () => evaluadoresFiltrados.filter((item) => !poolIds.has(item.id)),
    [evaluadoresFiltrados, poolIds],
  );

  useEffect(() => {
    setPortalListo(true);
  }, []);

  useEffect(() => {
    setSeleccionados((ids) => ids.filter((id) => !poolIds.has(id)));
  }, [poolIds]);

  useEffect(() => {
    if (!editandoCasos) setValorCasos(String(evaluacionesPorPostulacion));
  }, [editandoCasos, evaluacionesPorPostulacion]);

  useEffect(() => {
    if (editandoCasos) {
      inputCasosRef.current?.focus();
      inputCasosRef.current?.select();
    }
  }, [editandoCasos]);

  function toggleSeleccion(id: string) {
    setSeleccionados((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  }

  function cancelarEdicionCasos() {
    cancelandoCasosRef.current = true;
    setValorCasos(String(evaluacionesPorPostulacion));
    setEditandoCasos(false);
  }

  async function confirmarCasos() {
    const n = Number.parseInt(valorCasos, 10);
    if (!Number.isFinite(n) || n < 1) {
      setError("Las evaluaciones por caso deben ser al menos 1.");
      cancelarEdicionCasos();
      return;
    }
    if (n === evaluacionesPorPostulacion) {
      setEditandoCasos(false);
      return;
    }
    setError(null);
    setMensaje(null);
    setGuardandoCasos(true);
    const formData = new FormData();
    formData.set("convocatoriaId", convocatoriaId);
    formData.set("evaluacionesPorPostulacion", String(n));
    const result = await guardarConfigEvaluacion(formData);
    setGuardandoCasos(false);
    if (result?.error) {
      setError(result.error);
      cancelarEdicionCasos();
      return;
    }
    setEditandoCasos(false);
    setMensaje("Configuración de evaluación guardada.");
    await onMutated?.();
  }

  function toggleTodos() {
    if (seleccionados.length === paraAgregar.length) {
      setSeleccionados([]);
      return;
    }
    setSeleccionados(paraAgregar.map((item) => item.id));
  }

  async function agregarUno(evaluadorId: string) {
    setAgregarError(null);
    setAgregarMensaje(null);
    setAgregando(true);
    const formData = new FormData();
    formData.set("convocatoriaId", convocatoriaId);
    formData.set("evaluadorId", evaluadorId);
    const result = await agregarEvaluadorAlPool(formData);
    setAgregando(false);
    if (result?.error) {
      setAgregarError(result.error);
      return;
    }
    setAgregarMensaje("Evaluador agregado.");
    setSeleccionados((ids) => ids.filter((id) => id !== evaluadorId));
    await onMutated?.();
  }

  async function agregarSeleccion() {
    if (seleccionados.length === 0) {
      setAgregarError("Selecciona al menos un evaluador.");
      return;
    }
    setAgregarError(null);
    setAgregarMensaje(null);
    setAgregando(true);
    const formData = new FormData();
    formData.set("convocatoriaId", convocatoriaId);
    for (const id of seleccionados) formData.append("evaluadorId", id);
    const result = await agregarEvaluadoresAlPool(formData);
    setAgregando(false);
    if (result?.error) {
      setAgregarError(result.error);
      return;
    }
    setAgregarMensaje(result?.mensaje ?? "Evaluadores agregados.");
    setSeleccionados([]);
    await onMutated?.();
  }

  async function soltarEvaluador(postulacionId: string, evaluadorId: string) {
    setError(null);
    setMensaje(null);
    setAsignando(true);
    const formData = new FormData();
    formData.set("postulacionId", postulacionId);
    formData.set("evaluadorId", evaluadorId);
    const result = await asignarEvaluadorAPostulacion(formData);
    setAsignando(false);
    setDropTargetId(null);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setMensaje(result?.mensaje ?? "Evaluador asignado.");
    await onMutated?.();
  }

  async function eliminarFicha(postulacion: PostulacionItem) {
    const confirmar = window.confirm(
      `¿Eliminar la postulación de ${postulacion.emprendedorNombre}?\n\nSe borrarán respuestas, archivos adjuntos y evaluaciones asociadas. Esta acción no se puede deshacer.`,
    );
    if (!confirmar) return;

    setError(null);
    setMensaje(null);
    setEliminandoId(postulacion.id);
    const formData = new FormData();
    formData.set("postulacionId", postulacion.id);
    const result = await eliminarPostulacion(formData);
    setEliminandoId(null);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setMensaje(result?.mensaje ?? "Postulación eliminada.");
    await onMutated?.();
  }

  return (
    <div className="eval-panel eval-shell-open">
      <div className="eval-shell">
      <aside className="eval-side" aria-label="Evaluadores de la convocatoria">
        <div className="eval-side-header">
          <h3 className="text-lg font-semibold text-navy">Evaluadores ({pool.length})</h3>
        </div>

        <div className="eval-side-body space-y-4">
          {poolError ? <p className="text-danger">{poolError}</p> : null}
          {poolMensaje ? <p className="font-semibold text-navy">{poolMensaje}</p> : null}

          {pool.length === 0 ? (
            <p className="text-muted">Todavía no hay evaluadores asignados a esta convocatoria.</p>
          ) : (
            <ul className="space-y-2">
              {pool.map((item) => (
                <li
                  key={item.evaluadorId}
                  className={`eval-side-item${abierta ? " eval-side-item-draggable" : ""}`}
                  draggable={abierta}
                  onDragStart={(event) => {
                    event.dataTransfer.setData(DRAG_EVALUADOR, item.evaluadorId);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  onDragEnd={() => setDropTargetId(null)}
                  title={abierta ? "Arrastra hacia una respuesta para asignar" : undefined}
                >
                  <div className="eval-side-item-top">
                    <p className="eval-side-item-name">{item.evaluador.name}</p>
                    <form
                      action={async (formData) => {
                        setPoolError(null);
                        setPoolMensaje(null);
                        const result = await quitarEvaluadorDelPool(formData);
                        if (result?.error) setPoolError(result.error);
                        else {
                          setPoolMensaje("Evaluador quitado.");
                          await onMutated?.();
                        }
                      }}
                    >
                      <input type="hidden" name="convocatoriaId" value={convocatoriaId} />
                      <input type="hidden" name="evaluadorId" value={item.evaluadorId} />
                      <button
                        className="eval-side-remove"
                        type="submit"
                        draggable={false}
                        onMouseDown={(event) => event.stopPropagation()}
                        aria-label={`Quitar a ${item.evaluador.name}`}
                        title="Quitar"
                      >
                        ×
                      </button>
                    </form>
                  </div>
                  <div className="eval-side-metrics" aria-label="Resumen de evaluaciones">
                    <span>
                      <strong>{item.asignadas}</strong> asignadas
                    </span>
                    <span>
                      <strong>{item.revisadas}</strong> observadas
                    </span>
                    <span>
                      <strong>{item.finalizadas}</strong> finalizadas
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="eval-side-footer">
          <div className="eval-side-config">
            <span className="eval-side-config-label" id="label-evaluaciones-caso">
              Evaluaciones por caso:
            </span>
            {editandoCasos ? (
              <input
                ref={inputCasosRef}
                className="input eval-side-config-input"
                id="evaluacionesPorPostulacion"
                type="number"
                min={1}
                aria-labelledby="label-evaluaciones-caso"
                value={valorCasos}
                disabled={guardandoCasos}
                onChange={(event) => setValorCasos(event.target.value)}
                onBlur={() => {
                  if (cancelandoCasosRef.current) {
                    cancelandoCasosRef.current = false;
                    return;
                  }
                  if (!guardandoCasos) void confirmarCasos();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    (event.target as HTMLInputElement).blur();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelarEdicionCasos();
                  }
                }}
              />
            ) : (
              <div className="eval-side-config-value group">
                <span className="eval-side-config-num" aria-labelledby="label-evaluaciones-caso">
                  {evaluacionesPorPostulacion}
                </span>
                <button
                  className="eval-side-config-edit"
                  type="button"
                  aria-label="Editar evaluaciones por caso"
                  onClick={() => {
                    setValorCasos(String(evaluacionesPorPostulacion));
                    setEditandoCasos(true);
                  }}
                >
                  <IconoLapiz />
                </button>
              </div>
            )}
          </div>

          <form
            action={async (formData) => {
              setError(null);
              setMensaje(null);
              const result = await asignarEvaluadoresAutomatico(formData);
              if (result && "error" in result && result.error) {
                setError(result.error);
              } else {
                setMensaje(
                  result && "mensaje" in result && result.mensaje
                    ? result.mensaje
                    : "Asignación automática lista.",
                );
                await onMutated?.();
              }
            }}
          >
            <input type="hidden" name="convocatoriaId" value={convocatoriaId} />
            <button
              className="btn btn-sm btn-navy w-full"
              type="submit"
              disabled={!abierta || pool.length === 0}
            >
              Asignación automática
            </button>
          </form>

          <button
            className="btn btn-sm btn-primary w-full"
            type="button"
            onClick={() => {
              setAgregarOpen(true);
              setAgregarError(null);
              setAgregarMensaje(null);
            }}
          >
            Incorporar evaluadores
          </button>
        </div>
      </aside>

      <div className="eval-main" aria-label="Respuestas de la convocatoria">
        <div className="respuestas-filtros space-y-3">
          <div
            className={`eval-filtros-row${filtroPreguntaId ? " has-contiene" : ""}`}
          >
            <div className="field">
              <label htmlFor="filtro-nombre">Nombre</label>
              <input
                className="input"
                id="filtro-nombre"
                value={filtroEmprendedor}
                onChange={(event) => setFiltroEmprendedor(event.target.value)}
                placeholder="Buscar por nombre"
              />
            </div>
            <div className="field">
              <label htmlFor="filtro-correo">Correo</label>
              <input
                className="input"
                id="filtro-correo"
                value={filtroCorreo}
                onChange={(event) => setFiltroCorreo(event.target.value)}
                placeholder="Buscar por correo"
              />
            </div>
            <div className="field">
              <label htmlFor="filtro-pregunta">Pregunta</label>
              <select
                className="input"
                id="filtro-pregunta"
                value={filtroPreguntaId}
                onChange={(event) => {
                  setFiltroPreguntaId(event.target.value);
                  if (!event.target.value) setFiltroContiene("");
                }}
              >
                <option value="">Todas</option>
                {preguntas.map((pregunta) => (
                  <option key={pregunta.id} value={pregunta.id}>
                    {pregunta.enunciado}
                  </option>
                ))}
              </select>
            </div>
            {filtroPreguntaId ? (
              <div className="field">
                <label htmlFor="filtro-contiene">Contiene</label>
                <input
                  className="input"
                  id="filtro-contiene"
                  value={filtroContiene}
                  onChange={(event) => setFiltroContiene(event.target.value)}
                  placeholder="Texto a buscar"
                />
              </div>
            ) : null}
            <div className="field">
              <label htmlFor="filtro-estado-respuesta">Estado respuesta</label>
              <select
                className="input"
                id="filtro-estado-respuesta"
                value={filtroEstadoRespuesta}
                onChange={(event) => setFiltroEstadoRespuesta(event.target.value)}
              >
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="observaciones">Respondiendo observaciones</option>
                <option value="completa">Completa</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="filtro-estado-evaluacion">Estado evaluación</label>
              <select
                className="input"
                id="filtro-estado-evaluacion"
                value={filtroEstadoEvaluacion}
                onChange={(event) => setFiltroEstadoEvaluacion(event.target.value)}
              >
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="observada">Observada</option>
                <option value="finalizada">Finalizada</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="filtro-evaluador">Evaluador</label>
              <select
                className="input"
                id="filtro-evaluador"
                value={filtroEvaluadorId}
                onChange={(event) => setFiltroEvaluadorId(event.target.value)}
              >
                <option value="">Todos</option>
                {pool.map((item) => (
                  <option key={item.evaluadorId} value={item.evaluadorId}>
                    {item.evaluador.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? <p className="text-danger">{error}</p> : null}
          {mensaje ? <p className="font-semibold text-navy">{mensaje}</p> : null}
        </div>

        <div className="respuestas-lista space-y-3">
          {respuestasFiltradas.length > 0 ? (
            <div className="eval-lista-cabecera" aria-hidden="true">
              <span>Estado respuestas</span>
              <span>Estado evaluaciones</span>
              <span className="eval-lista-cabecera-accion">
                <span className="sr-only">Acciones</span>
              </span>
            </div>
          ) : null}
          {respuestas.length === 0 ? (
            <p className="text-muted">Todavía no hay respuestas en esta convocatoria.</p>
          ) : respuestasFiltradas.length === 0 ? (
            <p className="text-muted">Ninguna ficha coincide con los filtros.</p>
          ) : null}
          {respuestasFiltradas.map((postulacion) => {
            const estadoRespuesta = estadoRespuestaFicha(postulacion, preguntas);
            const completa = estadoRespuesta === "completa";
            const puedeAsignar =
              abierta && !asignando && completa && postulacion.estado !== "FINALIZADA";
            const esDestino = dropTargetId === postulacion.id;
            return (
              <article
                key={postulacion.id}
                className={`eval-ficha${esDestino ? " is-drop-target" : ""}${
                  puedeAsignar ? "" : " is-locked"
                }${eliminandoId === postulacion.id ? " is-deleting" : ""}`}
                onDragOver={(event) => {
                  if (!puedeAsignar) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                  setDropTargetId(postulacion.id);
                }}
                onDragLeave={(event) => {
                  if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                  setDropTargetId((id) => (id === postulacion.id ? null : id));
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!puedeAsignar) return;
                  const evaluadorId = event.dataTransfer.getData(DRAG_EVALUADOR);
                  if (!evaluadorId) return;
                  void soltarEvaluador(postulacion.id, evaluadorId);
                }}
              >
                <div className="eval-ficha-respuesta">
                  <div className="eval-ficha-respuesta-top">
                    <span className={`eval-ficha-pill is-${estadoRespuesta}`}>
                      {etiquetaEstadoRespuesta(estadoRespuesta)}
                    </span>
                    <span className="eval-ficha-id" title={postulacion.id}>
                      ID#{idCorto(postulacion.id)}
                    </span>
                  </div>
                  <div className="eval-ficha-meta">
                    <div className="eval-ficha-caso">
                      <span className="eval-ficha-label">Nombre del caso</span>
                      <span className="eval-ficha-value">{etiquetaNombreCaso(postulacion.nombreCaso)}</span>
                    </div>
                    <div className="eval-ficha-nombre">
                      <span className="eval-ficha-label">Emprendedor</span>
                      <span className="eval-ficha-value">{postulacion.emprendedorNombre}</span>
                    </div>
                  </div>
                </div>
                <div className="eval-ficha-evaluacion">
                  {postulacion.asignaciones.length === 0 ? (
                    <p className="eval-ficha-empty">
                      {estadoRespuesta === "observaciones"
                        ? "Respondiendo observaciones"
                        : estadoRespuesta === "pendiente"
                          ? "Respuesta pendiente"
                          : puedeAsignar
                            ? "Arrastra un evaluador aquí"
                            : "Sin evaluadores asignados"}
                    </p>
                  ) : (
                    <ul className="eval-ficha-avatars">
                      {postulacion.asignaciones.map((asignacion) => {
                        const estadoEval = estadoAsignacionFicha(asignacion.estado);
                        return (
                          <li
                            key={`${postulacion.id}-${asignacion.evaluadorId}`}
                            className={`eval-avatar ${claseEstadoAsignacion(asignacion.estado)}`}
                            title={`${asignacion.evaluadorNombre} · ${etiquetaEstadoAsignacion(
                              asignacion.estado,
                            )}`}
                          >
                            <span className={`eval-avatar-pill is-${estadoEval}`}>
                              {etiquetaEstadoAsignacion(asignacion.estado)}
                            </span>
                            <span className="eval-avatar-icon">
                              {IconoEstadoEvaluacion(asignacion.estado)}
                            </span>
                            <span className="eval-avatar-name">{asignacion.evaluadorNombre}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="eval-ficha-acciones">
                  <button
                    className="eval-ficha-eliminar"
                    type="button"
                    disabled={eliminandoId !== null}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void eliminarFicha(postulacion);
                    }}
                    aria-label={`Eliminar postulación de ${postulacion.emprendedorNombre}`}
                    title="Eliminar postulación"
                  >
                    <IconoBasurero />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {portalListo
        ? createPortal(
            <Modal
              open={agregarOpen}
              title="Incorporar evaluadores"
              wide
              onClose={() => {
                setAgregarOpen(false);
                setAgregarError(null);
                setAgregarMensaje(null);
                setSeleccionados([]);
                setFiltroNombre("");
              }}
            >
              <div className="space-y-4">
                <p className="text-muted">
                  Elige evaluadores registrados para sumarlos a esta convocatoria. Puedes agregar uno o varios a
                  la vez.
                </p>
                {agregarError ? <p className="text-danger">{agregarError}</p> : null}
                {agregarMensaje ? <p className="font-semibold text-navy">{agregarMensaje}</p> : null}

                <div className="field">
                  <label htmlFor="filtro-evaluador-nombre">Filtrar por nombre</label>
                  <input
                    className="input"
                    id="filtro-evaluador-nombre"
                    value={filtroNombre}
                    onChange={(event) => setFiltroNombre(event.target.value)}
                    placeholder="Buscar por nombre"
                  />
                </div>

                {evaluadoresDisponibles.length === 0 ? (
                  <p className="text-muted">No hay evaluadores registrados en el sistema.</p>
                ) : evaluadoresFiltrados.length === 0 ? (
                  <p className="text-muted">Ningún evaluador coincide con el filtro.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={paraAgregar.length > 0 && seleccionados.length === paraAgregar.length}
                          disabled={paraAgregar.length === 0 || agregando}
                          onChange={toggleTodos}
                        />
                        Seleccionar todos los disponibles
                      </label>
                      <button
                        className="btn btn-sm btn-primary"
                        type="button"
                        disabled={seleccionados.length === 0 || agregando}
                        onClick={() => void agregarSeleccion()}
                      >
                        Agregar seleccionados ({seleccionados.length})
                      </button>
                    </div>

                    <div className="eval-add-table-wrap">
                      <table className="eval-add-table">
                        <thead>
                          <tr>
                            <th scope="col" className="eval-add-check">
                              <span className="sr-only">Seleccionar</span>
                            </th>
                            <th scope="col" className="eval-add-name">
                              Nombre
                            </th>
                            <th scope="col" className="eval-add-email">
                              Correo
                            </th>
                            <th scope="col" className="eval-add-status">
                              En convocatoria
                            </th>
                            <th scope="col" className="eval-add-action">
                              Acción
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {evaluadoresFiltrados.map((evaluador) => {
                            const yaEnPool = poolIds.has(evaluador.id);
                            const checked = seleccionados.includes(evaluador.id);
                            return (
                              <tr key={evaluador.id} className={yaEnPool ? "is-in-pool" : undefined}>
                                <td className="eval-add-check">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={yaEnPool || agregando}
                                    aria-label={`Seleccionar ${evaluador.name}`}
                                    onChange={() => toggleSeleccion(evaluador.id)}
                                  />
                                </td>
                                <td className="eval-add-name">
                                  <span className="font-semibold">{evaluador.name}</span>
                                </td>
                                <td className="eval-add-email">
                                  <span className="text-muted">{evaluador.email}</span>
                                </td>
                                <td className="eval-add-status">
                                  {yaEnPool ? (
                                    <span
                                      className="eval-status-icon eval-status-yes"
                                      title="Ya está en la convocatoria"
                                      aria-label="Ya está en la convocatoria"
                                    >
                                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                                        <path
                                          fill="currentColor"
                                          d="M9.55 17.3 4.8 12.55l1.4-1.4 3.35 3.35 7.25-7.25 1.4 1.4z"
                                        />
                                      </svg>
                                    </span>
                                  ) : (
                                    <span
                                      className="eval-status-icon eval-status-no"
                                      title="No está en la convocatoria"
                                      aria-label="No está en la convocatoria"
                                    >
                                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                                        <path
                                          fill="currentColor"
                                          d="M6.4 17.65 5.35 16.6 10.95 11 5.35 5.4 6.4 4.35 12 9.95 17.6 4.35 18.65 5.4 13.05 11 18.65 16.6 17.6 17.65 12 12.05z"
                                        />
                                      </svg>
                                    </span>
                                  )}
                                </td>
                                <td className="eval-add-action">
                                  <button
                                    className="btn btn-sm btn-secondary"
                                    type="button"
                                    disabled={yaEnPool || agregando}
                                    onClick={() => void agregarUno(evaluador.id)}
                                  >
                                    {yaEnPool ? "Agregado" : "Agregar"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </Modal>,
            document.body,
          )
        : null}
      </div>
    </div>
  );
}
