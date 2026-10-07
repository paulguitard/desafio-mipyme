"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IndicadorGuardando } from "@/components/indicador-guardando";
import { useDatoOptimista } from "@/lib/use-dato-optimista";
import {
  agregarEvaluadorAlPool,
  agregarEvaluadoresAlPool,
  agregarSupervisorAlPool,
  agregarSupervisoresAlPool,
  asignarEvaluadorAPostulacion,
  asignarEvaluadoresAutomatico,
  asignarSupervisorAPostulacion,
  asignarSupervisoresAutomatico,
  cargarDetalleFichaAdmin,
  asegurarTokensPublicos,
  eliminarPostulacion,
  guardarConfigEvaluacion,
  guardarCupoPool,
  quitarEvaluadorDelPool,
  quitarSupervisorDelPool,
} from "@/actions/convocatorias";
import {
  enviarRecordatorioEvaluadorCaso,
  enviarRecordatorioEvaluadoresResumen,
  enviarRecordatorioParticipante,
  enviarRecordatorioSupervisorCaso,
  enviarRecordatorioSupervisoresResumen,
} from "@/actions/recordatorios";
import { FichaDetalleAdmin } from "@/components/ficha-detalle-admin";
import { Modal } from "@/components/modal";
import { PoolPersonaModal } from "@/components/pool-persona-modal";
import type { CasoPoolResumen } from "@/lib/convocatoria-admin-data";
import type { DetalleFichaAdmin } from "@/lib/convocatoria-admin-data";
import { rondaRespuestaEmprendedor } from "@/lib/estado";
import { normalizarCorreo } from "@/lib/correo";
import { parseValor } from "@/lib/preguntas";
import { ESCUELAS } from "@/lib/escuelas";
import { etiquetaNombreCaso } from "@/lib/nombre-caso";
import { rutaFichaPublica } from "@/lib/ficha-publica";
import { filasExcelLinks } from "@/lib/excel-links";
import { esMentoriaContenido, parseTipoFormulario, type TipoFormulario } from "@/lib/tipo-formulario";
import { workbookXlsx } from "@/lib/xlsx-workbook";
import {
  contiene,
  estadoAsignacionFicha,
  estadoRespuestaFicha,
  estadoSupervisionFicha,
  etiquetaEstadoAsignacionFicha,
  etiquetaEstadoRespuestaFicha,
  etiquetaEstadoSupervisionFicha,
  ESTADOS_RESPUESTA_FICHA,
  resumenNumerosAsesoria,
  type EstadoEvaluacionFicha,
  type EstadoSupervisionFicha,
} from "@/lib/convocatoria-evaluacion-filtros";
import {
  cantidadesPendientesEvaluadores,
  cantidadesPendientesSupervisores,
  recordatorioEvaluadorCaso,
  recordatorioParticipante,
  recordatorioSupervisorCaso,
} from "@/lib/correo-recordatorio";

type Evaluador = { id: string; name: string; email: string; escuela: string | null };

type PoolItem = {
  evaluadorId: string;
  maxEvaluaciones: number;
  evaluador: Evaluador;
  carga: number;
  asignadas: number;
  revisadas: number;
  finalizadas: number;
  casosAsignados: CasoPoolResumen[];
  casosObservados: CasoPoolResumen[];
  casosFinalizados: CasoPoolResumen[];
};

type Asignacion = {
  evaluadorId: string;
  evaluadorNombre: string;
  orden: number;
  estado: string;
  rondaActual: number;
  intencionPendiente?: string | null;
};

type SupervisionFicha = {
  supervisorId: string;
  supervisorNombre: string;
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
  tokenPublico?: string | null;
  respuestas: RespuestaFiltro[];
  vistasPiezaIds?: string[];
  asignaciones: Asignacion[];
  supervision?: SupervisionFicha | null;
};

type PanelEval = {
  evaluacionesPorPostulacion: number;
  pool: PoolItem[];
  poolSupervisores: PoolItem[];
  postulaciones: PostulacionItem[];
};

function itemPoolVacio(evaluador: Evaluador): PoolItem {
  return {
    evaluadorId: evaluador.id,
    maxEvaluaciones: 0,
    evaluador,
    carga: 0,
    asignadas: 0,
    revisadas: 0,
    finalizadas: 0,
    casosAsignados: [],
    casosObservados: [],
    casosFinalizados: [],
  };
}

function casoResumen(postulacion: PostulacionItem): CasoPoolResumen {
  return {
    postulacionId: postulacion.id,
    nombreCaso: postulacion.nombreCaso,
    emprendedorNombre: postulacion.emprendedorNombre,
  };
}

function descargarExcelLinks(filas: PostulacionItem[], preguntas: PreguntaFiltro[]) {
  const bytes = workbookXlsx("Links", filasExcelLinks(filas, window.location.origin, preguntas));
  const blob = new Blob([new Uint8Array(bytes)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "links-casos.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

function conPersonasEnPool(
  panel: PanelEval,
  ids: string[],
  disponibles: Evaluador[],
  esSupervisores: boolean,
): PanelEval {
  const actuales = esSupervisores ? panel.poolSupervisores : panel.pool;
  const ya = new Set(actuales.map((item) => item.evaluadorId));
  const nuevos = ids
    .map((id) => disponibles.find((item) => item.id === id))
    .filter((item): item is Evaluador => item != null && !ya.has(item.id))
    .map(itemPoolVacio);
  if (nuevos.length === 0) return panel;
  if (esSupervisores) return { ...panel, poolSupervisores: [...actuales, ...nuevos] };
  return { ...panel, pool: [...actuales, ...nuevos] };
}

function sinPersonaDelPool(panel: PanelEval, personaId: string, esSupervisores: boolean): PanelEval {
  if (esSupervisores) {
    return {
      ...panel,
      poolSupervisores: panel.poolSupervisores.filter((item) => item.evaluadorId !== personaId),
    };
  }
  return { ...panel, pool: panel.pool.filter((item) => item.evaluadorId !== personaId) };
}

function conCupoPersona(panel: PanelEval, personaId: string, cupo: number, esSupervisores: boolean): PanelEval {
  const actualizar = (lista: PoolItem[]) =>
    lista.map((item) => (item.evaluadorId === personaId ? { ...item, maxEvaluaciones: cupo } : item));
  if (esSupervisores) return { ...panel, poolSupervisores: actualizar(panel.poolSupervisores) };
  return { ...panel, pool: actualizar(panel.pool) };
}

function conAsignacionEvaluador(panel: PanelEval, postulacionId: string, evaluadorId: string): PanelEval {
  const persona = panel.pool.find((item) => item.evaluadorId === evaluadorId);
  const postulacion = panel.postulaciones.find((item) => item.id === postulacionId);
  if (!persona || !postulacion) return panel;
  if (postulacion.asignaciones.some((item) => item.evaluadorId === evaluadorId)) return panel;
  const caso = casoResumen(postulacion);
  return {
    ...panel,
    postulaciones: panel.postulaciones.map((item) =>
      item.id !== postulacionId
        ? item
        : {
            ...item,
            asignaciones: [
              ...item.asignaciones,
              {
                evaluadorId,
                evaluadorNombre: persona.evaluador.name,
                orden: item.asignaciones.length + 1,
                estado: "PENDIENTE",
                rondaActual: 1,
              },
            ],
          },
    ),
    pool: panel.pool.map((item) =>
      item.evaluadorId !== evaluadorId
        ? item
        : {
            ...item,
            carga: item.carga + 1,
            asignadas: item.asignadas + 1,
            casosAsignados: [...item.casosAsignados, caso],
          },
    ),
  };
}

function conAsignacionSupervisor(panel: PanelEval, postulacionId: string, supervisorId: string): PanelEval {
  const persona = panel.poolSupervisores.find((item) => item.evaluadorId === supervisorId);
  const postulacion = panel.postulaciones.find((item) => item.id === postulacionId);
  if (!persona || !postulacion || postulacion.supervision) return panel;
  const caso = casoResumen(postulacion);
  return {
    ...panel,
    postulaciones: panel.postulaciones.map((item) =>
      item.id !== postulacionId
        ? item
        : {
            ...item,
            supervision: { supervisorId, supervisorNombre: persona.evaluador.name },
          },
    ),
    poolSupervisores: panel.poolSupervisores.map((item) =>
      item.evaluadorId !== supervisorId
        ? item
        : {
            ...item,
            carga: item.carga + 1,
            asignadas: item.asignadas + 1,
            casosAsignados: [...item.casosAsignados, caso],
          },
    ),
  };
}

function textoPlano(valor: unknown) {
  if (Array.isArray(valor)) return valor.join(" ");
  if (valor == null) return "";
  return String(valor);
}

function TablaNumeros({
  titulo,
  variante,
  filas,
  accion,
}: {
  titulo: string;
  variante: "respuestas" | "evaluadores" | "supervisores";
  filas: { etiqueta: string; valor: number; total?: boolean }[];
  accion?: ReactNode;
}) {
  return (
    <section className={`eval-numeros-card is-${variante}`}>
      <h3 className="eval-numeros-titulo">{titulo}</h3>
      <table className="eval-numeros-tabla">
        <caption className="sr-only">{titulo}</caption>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.etiqueta} className={fila.total ? "eval-numeros-total" : undefined}>
              <th scope="row">{fila.etiqueta}</th>
              <td>{fila.valor}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {accion}
    </section>
  );
}

function IconoLupa() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
      />
    </svg>
  );
}

function AccionesCasoModal({
  postulacion,
  preguntas,
  enviando,
  error,
  mensaje,
  onVerCaso,
  onRecordatorioParticipante,
  onRecordatorioEvaluador,
  onRecordatorioSupervisor,
}: {
  postulacion: PostulacionItem;
  preguntas: PreguntaFiltro[];
  enviando: string | null;
  error: string | null;
  mensaje: string | null;
  onVerCaso: () => void;
  onRecordatorioParticipante: () => void;
  onRecordatorioEvaluador: () => void;
  onRecordatorioSupervisor: () => void;
}) {
  const participante = recordatorioParticipante(postulacion, preguntas);
  const evaluador = recordatorioEvaluadorCaso(postulacion.asignaciones);
  const supervisor = recordatorioSupervisorCaso(postulacion.asignaciones, postulacion.supervision);
  const ocupado = enviando != null;
  return (
    <div className="eval-acciones-caso">
      <button className="btn btn-sm btn-secondary" type="button" onClick={onVerCaso}>
        Ver caso
      </button>
      <button
        className="btn btn-sm btn-secondary"
        type="button"
        disabled={ocupado || !participante.habilitado}
        onClick={onRecordatorioParticipante}
      >
        {enviando === "participante" ? "Enviando…" : "Enviar recordatorio a Participante"}
      </button>
      {participante.habilitado ? null : (
        <p className="eval-acciones-hint">{participante.motivo}</p>
      )}
      <button
        className="btn btn-sm btn-secondary"
        type="button"
        disabled={ocupado || !evaluador.habilitado}
        onClick={onRecordatorioEvaluador}
      >
        {enviando === "evaluador" ? "Enviando…" : "Enviar recordatorio al evaluador"}
      </button>
      {evaluador.habilitado ? null : <p className="eval-acciones-hint">{evaluador.motivo}</p>}
      <button
        className="btn btn-sm btn-secondary"
        type="button"
        disabled={ocupado || !supervisor.habilitado}
        onClick={onRecordatorioSupervisor}
      >
        {enviando === "supervisor" ? "Enviando…" : "Enviar recordatorio al supervisor"}
      </button>
      {supervisor.habilitado ? null : <p className="eval-acciones-hint">{supervisor.motivo}</p>}
      {error ? <p className="eval-acciones-aviso text-danger">{error}</p> : null}
      {mensaje ? <p className="eval-acciones-aviso">{mensaje}</p> : null}
    </div>
  );
}

function claseAvatarEstado(estado: EstadoEvaluacionFicha | EstadoSupervisionFicha) {
  return `eval-avatar-${estado}`;
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

function IconoReloj() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm.8 3.2h-1.6v5.1l3.9 2.3.8-1.3-3.1-1.8V7.2z"
      />
    </svg>
  );
}

function IconoEstadoFicha(estado: EstadoEvaluacionFicha | EstadoSupervisionFicha) {
  if (estado === "finalizada") return <IconoCheck />;
  if (estado === "esperando-respuesta") return <IconoAmpolleta />;
  if (estado === "esperando-evaluacion" || estado === "esperando-supervision") return <IconoReloj />;
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
const DRAG_SUPERVISOR = "application/x-supervisor-id";
const DRAG_TEXTO = "text/plain";

type DragPoolPayload = { tipo: "evaluador" | "supervisor"; id: string };

function leerDragPool(event: DragEvent, payload: DragPoolPayload | null): DragPoolPayload | null {
  if (payload) return payload;
  const tipos = Array.from(event.dataTransfer.types);
  if (tipos.includes(DRAG_SUPERVISOR)) {
    const id = event.dataTransfer.getData(DRAG_SUPERVISOR);
    return id ? { tipo: "supervisor", id } : null;
  }
  if (tipos.includes(DRAG_EVALUADOR)) {
    const id = event.dataTransfer.getData(DRAG_EVALUADOR);
    return id ? { tipo: "evaluador", id } : null;
  }
  const texto = event.dataTransfer.getData(DRAG_TEXTO);
  if (texto.startsWith("supervisor:")) return { tipo: "supervisor", id: texto.slice("supervisor:".length) };
  if (texto.startsWith("evaluador:")) return { tipo: "evaluador", id: texto.slice("evaluador:".length) };
  return null;
}

export function ConvocatoriaEvaluacion({
  convocatoriaId,
  evaluacionesPorPostulacion,
  preguntas,
  pool,
  evaluadoresDisponibles,
  postulaciones,
  poolSupervisores = [],
  supervisoresDisponibles = [],
  onMutated,
  tipo = "FEEDBACK",
  piezas = [],
  vista = "lista",
}: {
  convocatoriaId: string;
  estadoConvocatoria: string;
  evaluacionesPorPostulacion: number;
  preguntas: PreguntaFiltro[];
  pool: PoolItem[];
  evaluadoresDisponibles: Evaluador[];
  postulaciones: PostulacionItem[];
  poolSupervisores?: PoolItem[];
  supervisoresDisponibles?: Evaluador[];
  onMutated?: () => Promise<void> | void;
  tipo?: TipoFormulario;
  piezas?: { id: string; titulo: string }[];
  vista?: "lista" | "numeros" | "links";
}) {
  const servidor = useMemo(
    () => ({
      evaluacionesPorPostulacion,
      pool,
      poolSupervisores,
      postulaciones,
    }),
    [evaluacionesPorPostulacion, pool, poolSupervisores, postulaciones],
  );
  const panel = useDatoOptimista(servidor);
  const {
    evaluacionesPorPostulacion: evalsPorCaso,
    pool: poolLocal,
    poolSupervisores: poolSupLocal,
    postulaciones: postulacionesLocal,
  } = panel.dato;
  const error = panel.error;
  const mensaje = panel.mensaje;
  const setError = panel.setError;
  const setMensaje = panel.setMensaje;
  const [poolError, setPoolError] = useState<string | null>(null);
  const [poolMensaje, setPoolMensaje] = useState<string | null>(null);
  const [agregarOpen, setAgregarOpen] = useState(false);
  const [agregarError, setAgregarError] = useState<string | null>(null);
  const [agregarMensaje, setAgregarMensaje] = useState<string | null>(null);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroEscuela, setFiltroEscuela] = useState("");
  const [filtroEmprendedor, setFiltroEmprendedor] = useState("");
  const [filtroCorreo, setFiltroCorreo] = useState("");
  const [filtroPreguntaId, setFiltroPreguntaId] = useState("");
  const [filtroContiene, setFiltroContiene] = useState("");
  const [filtroEstadoRespuesta, setFiltroEstadoRespuesta] = useState("");
  const [filtroEstadoEvaluacion, setFiltroEstadoEvaluacion] = useState("");
  const [filtroEvaluadorId, setFiltroEvaluadorId] = useState("");
  const [filtroEstadoSupervision, setFiltroEstadoSupervision] = useState("");
  const [filtroSupervisorId, setFiltroSupervisorId] = useState("");
  const [filtroPiezas, setFiltroPiezas] = useState<Record<string, string>>({});
  const esContenido = esMentoriaContenido(parseTipoFormulario(tipo));
  const columnasContenido = { "--casillas": String(piezas.length) } as CSSProperties;
  const [panelLateral, setPanelLateral] = useState<"evaluadores" | "supervisores">("evaluadores");
  const [portalListo, setPortalListo] = useState(false);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [editandoCasos, setEditandoCasos] = useState(false);
  const [valorCasos, setValorCasos] = useState(String(evaluacionesPorPostulacion));
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleLoadingId, setDetalleLoadingId] = useState<string | null>(null);
  const [detalleError, setDetalleError] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<DetalleFichaAdmin | null>(null);
  const [accionesCaso, setAccionesCaso] = useState<PostulacionItem | null>(null);
  const [recordatorioEnviando, setRecordatorioEnviando] = useState<string | null>(null);
  const [recordatorioError, setRecordatorioError] = useState<string | null>(null);
  const [recordatorioMensaje, setRecordatorioMensaje] = useState<string | null>(null);
  const [poolModalId, setPoolModalId] = useState<string | null>(null);
  const inputCasosRef = useRef<HTMLInputElement>(null);
  const cancelandoCasosRef = useRef(false);
  const arrastrandoPoolRef = useRef(false);
  const dragPoolRef = useRef<DragPoolPayload | null>(null);
  const esSupervisores = panelLateral === "supervisores";
  const poolActivo = esSupervisores ? poolSupLocal : poolLocal;
  const disponiblesActivos = esSupervisores ? supervisoresDisponibles : evaluadoresDisponibles;
  const poolIds = useMemo(() => new Set(poolActivo.map((item) => item.evaluadorId)), [poolActivo]);
  const poolModalItem =
    poolLocal.find((item) => item.evaluadorId === poolModalId) ??
    poolSupLocal.find((item) => item.evaluadorId === poolModalId) ??
    null;
  const respuestas = postulacionesLocal;
  const resumenNumeros = useMemo(
    () => resumenNumerosAsesoria(respuestas, preguntas),
    [preguntas, respuestas],
  );
  const nEvalPendientes = useMemo(
    () => cantidadesPendientesEvaluadores(respuestas).size,
    [respuestas],
  );
  const nSupPendientes = useMemo(
    () => cantidadesPendientesSupervisores(respuestas).size,
    [respuestas],
  );
  const esNumeros = vista === "numeros";
  const esLinks = vista === "links";
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const onMutatedRef = useRef(onMutated);
  onMutatedRef.current = onMutated;

  useEffect(() => {
    if (!esLinks || esContenido) return;
    let cancelado = false;
    void asegurarTokensPublicos(convocatoriaId).then((result) => {
      if (cancelado) return;
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      if (result && "creados" in result && result.creados > 0) {
        void onMutatedRef.current?.();
      }
    });
    return () => {
      cancelado = true;
    };
  }, [convocatoriaId, esContenido, esLinks, setError]);

  const respuestasFiltradas = useMemo(() => {
    return respuestas.filter((postulacion) => {
      if (
        !contiene(postulacion.emprendedorNombre, filtroEmprendedor) &&
        !contiene(postulacion.nombreCaso, filtroEmprendedor)
      ) {
        return false;
      }
      if (!contiene(postulacion.emprendedorEmail, filtroCorreo)) return false;
      if (esContenido) {
        for (const pieza of piezas) {
          const modo = filtroPiezas[pieza.id];
          if (!modo) continue;
          const marcada = (postulacion.vistasPiezaIds ?? []).includes(pieza.id);
          if (modo === "marcada" && !marcada) return false;
          if (modo === "sin" && marcada) return false;
        }
        return true;
      }
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
      if (filtroSupervisorId || filtroEstadoSupervision) {
        if (filtroSupervisorId && postulacion.supervision?.supervisorId !== filtroSupervisorId) {
          return false;
        }
        if (
          filtroEstadoSupervision &&
          estadoSupervisionFicha(postulacion.asignaciones) !== filtroEstadoSupervision
        ) {
          return false;
        }
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
    filtroEstadoSupervision,
    filtroSupervisorId,
    filtroPreguntaId,
    preguntas,
    respuestas,
    esContenido,
    piezas,
    filtroPiezas,
  ]);

  const evaluadoresFiltrados = useMemo(() => {
    const q = filtroNombre.trim().toLocaleLowerCase("es-CL");
    return disponiblesActivos.filter((item) => {
      if (q && !item.name.toLocaleLowerCase("es-CL").includes(q)) return false;
      if (filtroEscuela === "__none__") {
        if (item.escuela) return false;
      } else if (filtroEscuela && item.escuela !== filtroEscuela) {
        return false;
      }
      return true;
    });
  }, [disponiblesActivos, filtroNombre, filtroEscuela]);

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
    if (!editandoCasos) setValorCasos(String(evalsPorCaso));
  }, [editandoCasos, evalsPorCaso]);

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
    setValorCasos(String(evalsPorCaso));
    setEditandoCasos(false);
  }

  function confirmarCasos() {
    const n = Number.parseInt(valorCasos, 10);
    if (!Number.isFinite(n) || n < 1) {
      setError("Las evaluaciones por caso deben ser al menos 1.");
      cancelarEdicionCasos();
      return;
    }
    if (n === evalsPorCaso) {
      setEditandoCasos(false);
      return;
    }
    setEditandoCasos(false);
    const formData = new FormData();
    formData.set("convocatoriaId", convocatoriaId);
    formData.set("evaluacionesPorPostulacion", String(n));
    void panel
      .aplicar(
        (actual) => ({ ...actual, evaluacionesPorPostulacion: n }),
        () => guardarConfigEvaluacion(formData),
        { mensajeOk: "Configuración de evaluación guardada." },
      )
      .then((result) => {
        if (!result || !("error" in result) || !result.error) void onMutated?.();
      });
  }

  function toggleTodos() {
    if (seleccionados.length === paraAgregar.length) {
      setSeleccionados([]);
      return;
    }
    setSeleccionados(paraAgregar.map((item) => item.id));
  }

  function agregarUno(evaluadorId: string) {
    setAgregarError(null);
    const formData = new FormData();
    formData.set("convocatoriaId", convocatoriaId);
    formData.set("evaluadorId", evaluadorId);
    setSeleccionados((ids) => ids.filter((id) => id !== evaluadorId));
    void panel
      .aplicar(
        (actual) => conPersonasEnPool(actual, [evaluadorId], disponiblesActivos, esSupervisores),
        () => (esSupervisores ? agregarSupervisorAlPool(formData) : agregarEvaluadorAlPool(formData)),
      )
      .then((result) => {
        if (result && "error" in result && result.error) {
          setAgregarError(result.error);
          return;
        }
        setAgregarMensaje(esSupervisores ? "Supervisor agregado." : "Evaluador agregado.");
        void onMutated?.();
      });
  }

  function agregarSeleccion() {
    if (seleccionados.length === 0) {
      setAgregarError(esSupervisores ? "Selecciona al menos un supervisor." : "Selecciona al menos un evaluador.");
      return;
    }
    setAgregarError(null);
    const ids = [...seleccionados];
    const formData = new FormData();
    formData.set("convocatoriaId", convocatoriaId);
    for (const id of ids) formData.append("evaluadorId", id);
    setSeleccionados([]);
    void panel
      .aplicar(
        (actual) => conPersonasEnPool(actual, ids, disponiblesActivos, esSupervisores),
        () => (esSupervisores ? agregarSupervisoresAlPool(formData) : agregarEvaluadoresAlPool(formData)),
      )
      .then((result) => {
        if (result && "error" in result && result.error) {
          setAgregarError(result.error);
          return;
        }
        setAgregarMensaje(
          result && "mensaje" in result && result.mensaje
            ? result.mensaje
            : esSupervisores
              ? "Supervisores agregados."
              : "Evaluadores agregados.",
        );
        void onMutated?.();
      });
  }

  function soltarEvaluador(postulacionId: string, evaluadorId: string) {
    setDropTargetId(null);
    const formData = new FormData();
    formData.set("postulacionId", postulacionId);
    formData.set("evaluadorId", evaluadorId);
    void panel
      .aplicar(
        (actual) => conAsignacionEvaluador(actual, postulacionId, evaluadorId),
        () => asignarEvaluadorAPostulacion(formData),
        { mensajeOk: "Evaluador asignado." },
      )
      .then((result) => {
        if (!result || !("error" in result) || !result.error) void onMutated?.();
      });
  }

  function soltarSupervisor(postulacionId: string, supervisorId: string) {
    setDropTargetId(null);
    const formData = new FormData();
    formData.set("postulacionId", postulacionId);
    formData.set("supervisorId", supervisorId);
    void panel
      .aplicar(
        (actual) => conAsignacionSupervisor(actual, postulacionId, supervisorId),
        () => asignarSupervisorAPostulacion(formData),
        { mensajeOk: "Supervisor asignado." },
      )
      .then((result) => {
        if (!result || !("error" in result) || !result.error) void onMutated?.();
      });
  }

  function eliminarFicha(postulacion: PostulacionItem) {
    const confirmar = window.confirm(
      `¿Eliminar la participación de ${postulacion.emprendedorNombre}?\n\nSe borrarán respuestas, archivos adjuntos y evaluaciones asociadas. Esta acción no se puede deshacer.`,
    );
    if (!confirmar) return;
    const formData = new FormData();
    formData.set("postulacionId", postulacion.id);
    void panel
      .aplicar(
        (actual) => ({
          ...actual,
          postulaciones: actual.postulaciones.filter((item) => item.id !== postulacion.id),
        }),
        () => eliminarPostulacion(formData),
        { mensajeOk: "Participación eliminada." },
      )
      .then((result) => {
        if (!result || !("error" in result) || !result.error) void onMutated?.();
      });
  }

  function quitarDelPool(personaId: string) {
    const formData = new FormData();
    formData.set("convocatoriaId", convocatoriaId);
    formData.set("evaluadorId", personaId);
    formData.set("supervisorId", personaId);
    setPoolError(null);
    void panel
      .aplicar(
        (actual) => sinPersonaDelPool(actual, personaId, esSupervisores),
        () => (esSupervisores ? quitarSupervisorDelPool(formData) : quitarEvaluadorDelPool(formData)),
      )
      .then((result) => {
        if (result && "error" in result && result.error) {
          setPoolError(result.error);
          return;
        }
        setPoolMensaje(esSupervisores ? "Supervisor quitado." : "Evaluador quitado.");
        void onMutated?.();
      });
  }

  function guardarCupoPersona(personaId: string, cupo: number, esSupervisor: boolean) {
    const formData = new FormData();
    formData.set("convocatoriaId", convocatoriaId);
    formData.set("evaluadorId", personaId);
    formData.set("supervisorId", personaId);
    formData.set("rol", esSupervisor ? "supervisor" : "evaluador");
    formData.set("maxEvaluaciones", String(cupo));
    void panel
      .aplicar(
        (actual) => conCupoPersona(actual, personaId, cupo, esSupervisor),
        () => guardarCupoPool(formData),
        { mensajeOk: "Cupo actualizado." },
      )
      .then((result) => {
        if (!result || !("error" in result) || !result.error) void onMutated?.();
      });
  }

  async function abrirDetalle(postulacion: PostulacionItem) {
    setDetalleOpen(true);
    setDetalle(null);
    setDetalleError(null);
    setDetalleLoadingId(postulacion.id);
    const result = await cargarDetalleFichaAdmin(postulacion.id);
    setDetalleLoadingId(null);
    if (result?.error) {
      setDetalleError(result.error);
      return;
    }
    if (result?.data) setDetalle(result.data);
  }

  function cerrarDetalle() {
    setDetalleOpen(false);
    setDetalle(null);
    setDetalleError(null);
    setDetalleLoadingId(null);
  }

  function abrirAccionesCaso(postulacion: PostulacionItem) {
    setAccionesCaso(postulacion);
    setRecordatorioError(null);
    setRecordatorioMensaje(null);
  }

  function cerrarAccionesCaso() {
    setAccionesCaso(null);
    setRecordatorioError(null);
    setRecordatorioMensaje(null);
  }

  async function ejecutarRecordatorio(
    clave: string,
    confirmar: string,
    accion: () => Promise<{ ok?: true; enviados?: number; error?: string } | void>,
  ) {
    if (!window.confirm(confirmar)) return;
    setRecordatorioError(null);
    setRecordatorioMensaje(null);
    setRecordatorioEnviando(clave);
    try {
      const result = await accion();
      if (result && "error" in result && result.error) {
        setRecordatorioError(result.error);
        return;
      }
      const n = result && "enviados" in result && result.enviados ? result.enviados : 0;
      setRecordatorioMensaje(n === 1 ? "Se envió 1 correo." : `Se enviaron ${n} correos.`);
    } finally {
      setRecordatorioEnviando(null);
    }
  }

  return (
    <div className="eval-panel eval-shell-open">
      <div className={`eval-shell${esContenido ? " is-contenido" : ""}${esNumeros ? " is-numeros" : ""}${esLinks ? " is-links" : ""}`}>
      <aside className="eval-side" aria-label="Evaluadores y supervisores de la asesoría">
        <div className="eval-side-header">
          <h3 className="text-lg font-semibold text-navy">
            {esSupervisores ? `Supervisores (${poolActivo.length})` : `Evaluadores (${poolActivo.length})`}
          </h3>
        </div>
        <div className="eval-side-tabs">
          <button
            type="button"
            className={`eval-side-tab${esSupervisores ? "" : " is-active"}`}
            data-tour="pool-evaluadores"
            onClick={() => {
              setPanelLateral("evaluadores");
              setSeleccionados([]);
            }}
          >
            Evaluadores
          </button>
          <button
            type="button"
            className={`eval-side-tab${esSupervisores ? " is-active" : ""}`}
            data-tour="pool-supervisores"
            onClick={() => {
              setPanelLateral("supervisores");
              setSeleccionados([]);
            }}
          >
            Supervisores
          </button>
        </div>

        <div className="eval-side-body space-y-4">
          {poolError ? <p className="text-danger">{poolError}</p> : null}
          {poolMensaje ? <p className="font-semibold text-navy">{poolMensaje}</p> : null}

          {poolActivo.length === 0 ? (
            <p className="text-muted">
              {esSupervisores
                ? "Todavía no hay supervisores asignados a esta asesoría."
                : "Todavía no hay evaluadores asignados a esta asesoría."}
            </p>
          ) : (
            <ul className="space-y-2">
              {poolActivo.map((item) => (
                <li
                  key={item.evaluadorId}
                  className="eval-side-item eval-side-item-clickable eval-side-item-draggable"
                  draggable
                  onClick={() => {
                    if (arrastrandoPoolRef.current) {
                      arrastrandoPoolRef.current = false;
                      return;
                    }
                    setPoolModalId(item.evaluadorId);
                  }}
                  onDragStart={(event) => {
                    arrastrandoPoolRef.current = true;
                    const payload: DragPoolPayload = {
                      tipo: esSupervisores ? "supervisor" : "evaluador",
                      id: item.evaluadorId,
                    };
                    dragPoolRef.current = payload;
                    event.dataTransfer.setData(
                      payload.tipo === "supervisor" ? DRAG_SUPERVISOR : DRAG_EVALUADOR,
                      payload.id,
                    );
                    event.dataTransfer.setData(DRAG_TEXTO, `${payload.tipo}:${payload.id}`);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  onDragEnd={() => {
                    dragPoolRef.current = null;
                    setDropTargetId(null);
                    window.setTimeout(() => {
                      arrastrandoPoolRef.current = false;
                    }, 0);
                  }}
                  title="Clic para ver casos y cupo. Arrastra hacia una respuesta para asignar."
                >
                  <div className="eval-side-item-top">
                    <p className="eval-side-item-name">{item.evaluador.name}</p>
                    <button
                      className="eval-side-remove"
                      type="button"
                      draggable={false}
                      onClick={(event) => {
                        event.stopPropagation();
                        quitarDelPool(item.evaluadorId);
                      }}
                      onMouseDown={(event) => event.stopPropagation()}
                      aria-label={`Quitar a ${item.evaluador.name}`}
                      title="Quitar"
                    >
                      ×
                    </button>
                  </div>
                  <div className="eval-side-metrics" aria-label="Resumen">
                    <span>
                      <strong>
                        {item.maxEvaluaciones > 0 ? `${item.asignadas}/${item.maxEvaluaciones}` : item.asignadas}
                      </strong>{" "}
                      asignadas
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
          {esSupervisores ? (
            <div className="eval-side-config">
              <span className="eval-side-config-label">Supervisiones por caso:</span>
              <div className="eval-side-config-value">
                <span className="eval-side-config-num">1</span>
              </div>
            </div>
          ) : (
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
                onChange={(event) => setValorCasos(event.target.value)}
                onBlur={() => {
                  if (cancelandoCasosRef.current) {
                    cancelandoCasosRef.current = false;
                    return;
                  }
                  void confirmarCasos();
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
                  {evalsPorCaso}
                </span>
                <button
                  className="eval-side-config-edit"
                  type="button"
                  aria-label="Editar evaluaciones por caso"
                  onClick={() => {
                    setValorCasos(String(evalsPorCaso));
                    setEditandoCasos(true);
                  }}
                >
                  <IconoLapiz />
                </button>
              </div>
            )}
          </div>
          )}

          <form
            action={(formData) => {
              void (esSupervisores
                ? asignarSupervisoresAutomatico(formData)
                : asignarEvaluadoresAutomatico(formData)
              ).then((result) => {
                if (result && "error" in result && result.error) {
                  setError(result.error);
                  return;
                }
                setMensaje(
                  result && "mensaje" in result && result.mensaje
                    ? result.mensaje
                    : "Asignación automática lista.",
                );
                void onMutated?.();
              });
            }}
          >
            <input type="hidden" name="convocatoriaId" value={convocatoriaId} />
            <button
              className="btn btn-sm btn-navy w-full"
              type="submit"
              disabled={poolActivo.length === 0}
              data-tour="asignacion-automatica"
            >
              Asignación automática
            </button>
          </form>

          <button
            className="btn btn-sm btn-primary w-full"
            type="button"
            data-tour="pool-incorporar"
            onClick={() => {
              setAgregarOpen(true);
              setAgregarError(null);
              setAgregarMensaje(null);
            }}
          >
            {esSupervisores ? "Incorporar supervisores" : "Incorporar evaluadores"}
          </button>
        </div>
      </aside>


      <div
        className="eval-main"
        aria-label={
          esLinks
            ? "Links públicos de las respuestas"
            : esNumeros
            ? "Números de la asesoría"
            : esContenido
              ? "Participantes de la asesoría"
              : "Respuestas de la asesoría"
        }
        data-tour="lista-casos"
      >
        {esNumeros ? (
          <div className="eval-numeros">
            <TablaNumeros
              titulo={esContenido ? "Participantes" : "Respuestas"}
              variante="respuestas"
              filas={[
                {
                  etiqueta: esContenido ? "Total de participantes" : "Total de respuestas",
                  valor: resumenNumeros.total,
                  total: true,
                },
                ...(esContenido
                  ? []
                  : ESTADOS_RESPUESTA_FICHA.map((estado) => ({
                      etiqueta: etiquetaEstadoRespuestaFicha(estado),
                      valor: resumenNumeros.porEstado[estado],
                    }))),
              ]}
            />
            {esContenido ? null : (
              <>
                <TablaNumeros
                  titulo="Evaluadores"
                  variante="evaluadores"
                  filas={[
                    { etiqueta: "Con evaluador asignado", valor: resumenNumeros.conEvaluador },
                    { etiqueta: "Sin evaluador asignado", valor: resumenNumeros.sinEvaluador },
                  ]}
                  accion={
                    <div className="eval-numeros-accion">
                      <button
                        className="btn btn-sm btn-secondary"
                        type="button"
                        disabled={nEvalPendientes === 0 || recordatorioEnviando != null}
                        onClick={() =>
                          void ejecutarRecordatorio(
                            "eval-resumen",
                            `Se enviará un correo a ${nEvalPendientes} ${nEvalPendientes === 1 ? "evaluador" : "evaluadores"} con casos pendientes. ¿Continuar?`,
                            () => enviarRecordatorioEvaluadoresResumen(convocatoriaId),
                          )
                        }
                      >
                        {recordatorioEnviando === "eval-resumen"
                          ? "Enviando…"
                          : "Enviar recordatorio a evaluadores"}
                      </button>
                      {nEvalPendientes === 0 ? (
                        <p className="eval-numeros-hint">Nadie tiene casos pendientes de evaluar.</p>
                      ) : null}
                    </div>
                  }
                />
                <TablaNumeros
                  titulo="Supervisores"
                  variante="supervisores"
                  filas={[
                    { etiqueta: "Con supervisor asignado", valor: resumenNumeros.conSupervisor },
                    { etiqueta: "Sin supervisor asignado", valor: resumenNumeros.sinSupervisor },
                  ]}
                  accion={
                    <div className="eval-numeros-accion">
                      <button
                        className="btn btn-sm btn-secondary"
                        type="button"
                        disabled={nSupPendientes === 0 || recordatorioEnviando != null}
                        onClick={() =>
                          void ejecutarRecordatorio(
                            "sup-resumen",
                            `Se enviará un correo a ${nSupPendientes} ${nSupPendientes === 1 ? "supervisor" : "supervisores"} con casos pendientes. ¿Continuar?`,
                            () => enviarRecordatorioSupervisoresResumen(convocatoriaId),
                          )
                        }
                      >
                        {recordatorioEnviando === "sup-resumen"
                          ? "Enviando…"
                          : "Enviar recordatorio a supervisores"}
                      </button>
                      {nSupPendientes === 0 ? (
                        <p className="eval-numeros-hint">Nadie tiene casos pendientes de supervisar.</p>
                      ) : null}
                    </div>
                  }
                />
                {recordatorioError && esNumeros ? (
                  <p className="eval-numeros-aviso text-danger">{recordatorioError}</p>
                ) : null}
                {recordatorioMensaje && esNumeros && !accionesCaso ? (
                  <p className="eval-numeros-aviso">{recordatorioMensaje}</p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
        {esLinks && !esContenido ? (
          <div className="eval-links">
            <div className="eval-links-toolbar">
              <button
                className="btn btn-sm btn-secondary"
                type="button"
                disabled={respuestas.length === 0}
                onClick={() => descargarExcelLinks(respuestas, preguntas)}
              >
                Descargar excel
              </button>
            </div>
            {respuestas.length === 0 ? (
              <p className="text-muted">Todavía no hay respuestas en esta asesoría.</p>
            ) : (
              <ul className="eval-links-lista">
                {respuestas.map((postulacion) => {
                  const path = postulacion.tokenPublico
                    ? rutaFichaPublica(postulacion.tokenPublico)
                    : null;
                  return (
                    <li key={postulacion.id} className="eval-links-item">
                      <div className="eval-links-meta">
                        <span className="eval-links-caso">{etiquetaNombreCaso(postulacion.nombreCaso)}</span>
                        <span className="eval-links-nombre">{postulacion.emprendedorNombre}</span>
                        <span className="eval-links-correo">
                          {normalizarCorreo(postulacion.emprendedorEmail)}
                        </span>
                      </div>
                      {path ? (
                        <div className="eval-links-url">
                          <code>{path}</code>
                          <button
                            className="btn btn-sm btn-secondary"
                            type="button"
                            onClick={() => {
                              const absoluto = `${window.location.origin}${path}`;
                              void navigator.clipboard.writeText(absoluto).then(() => {
                                setCopiadoId(postulacion.id);
                                window.setTimeout(() => {
                                  setCopiadoId((actual) => (actual === postulacion.id ? null : actual));
                                }, 1600);
                              });
                            }}
                          >
                            {copiadoId === postulacion.id ? "Copiado" : "Copiar"}
                          </button>
                        </div>
                      ) : (
                        <p className="text-muted">Generando link…</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}
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
            {esContenido
              ? piezas.map((pieza) => (
                  <div className="field" key={pieza.id}>
                    <label htmlFor={`filtro-pieza-${pieza.id}`}>{pieza.titulo}</label>
                    <select
                      className="input"
                      id={`filtro-pieza-${pieza.id}`}
                      value={filtroPiezas[pieza.id] ?? ""}
                      onChange={(event) =>
                        setFiltroPiezas((prev) => ({ ...prev, [pieza.id]: event.target.value }))
                      }
                    >
                      <option value="">Todas</option>
                      <option value="marcada">Marcada</option>
                      <option value="sin">Sin marcar</option>
                    </select>
                  </div>
                ))
              : (
              <>
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
                {ESTADOS_RESPUESTA_FICHA.map((estado) => (
                  <option key={estado} value={estado}>
                    {etiquetaEstadoRespuestaFicha(estado)}
                  </option>
                ))}
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
                <option value="esperando-respuesta">Esperando respuesta</option>
                <option value="esperando-supervision">Esperando supervisión</option>
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
                {poolLocal.map((item) => (
                  <option key={item.evaluadorId} value={item.evaluadorId}>
                    {item.evaluador.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="filtro-estado-supervision">Estado supervisión</label>
              <select
                className="input"
                id="filtro-estado-supervision"
                value={filtroEstadoSupervision}
                onChange={(event) => setFiltroEstadoSupervision(event.target.value)}
              >
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="esperando-respuesta">Esperando respuesta</option>
                <option value="esperando-evaluacion">Esperando evaluación</option>
                <option value="finalizada">Finalizada</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="filtro-supervisor">Supervisor</label>
              <select
                className="input"
                id="filtro-supervisor"
                value={filtroSupervisorId}
                onChange={(event) => setFiltroSupervisorId(event.target.value)}
              >
                <option value="">Todos</option>
                {poolSupLocal.map((item) => (
                  <option key={item.evaluadorId} value={item.evaluadorId}>
                    {item.evaluador.name}
                  </option>
                ))}
              </select>
            </div>
              </>
              )}
          </div>

          {error ? <p className="text-danger">{error}</p> : null}
          {mensaje ? <p className="font-semibold text-navy">{mensaje}</p> : null}
          <IndicadorGuardando visible={panel.guardando} />
        </div>

        <div className="respuestas-lista space-y-3">
          {respuestasFiltradas.length > 0 ? (
            esContenido ? (
            <div className="eval-lista-cabecera is-contenido" style={columnasContenido} aria-hidden="true">
              <span className="eval-lista-cabecera-ver">Ver</span>
              <span>Participante</span>
              {piezas.map((pieza) => (
                <span key={pieza.id}>{pieza.titulo}</span>
              ))}
              <span className="eval-lista-cabecera-accion">
                <span className="sr-only">Acciones</span>
              </span>
            </div>
            ) : (
            <div className="eval-lista-cabecera" aria-hidden="true">
              <span>Estado respuestas</span>
              <span>Estado evaluaciones</span>
              <span>Estado supervisión</span>
              <span className="eval-lista-cabecera-accion">
                <span className="sr-only">Acciones</span>
              </span>
            </div>
            )
          ) : null}
          {respuestas.length === 0 ? (
            <p className="text-muted">
              {esContenido
                ? "Todavía no hay participantes en esta asesoría."
                : "Todavía no hay respuestas en esta asesoría."}
            </p>
          ) : respuestasFiltradas.length === 0 ? (
            <p className="text-muted">
              {esContenido
                ? "Ningún participante coincide con los filtros."
                : "Ninguna ficha coincide con los filtros."}
            </p>
          ) : null}
          {respuestasFiltradas.map((postulacion) => {
            const estadoRespuesta = estadoRespuestaFicha(postulacion, preguntas);
            const respuestaAsignable =
              Boolean(postulacion.enviadaAt) && postulacion.estado !== "FINALIZADA";
            const puedeAsignarEval = !esContenido && respuestaAsignable;
            const puedeAsignarSup = !esContenido && respuestaAsignable && !postulacion.supervision;
            const esDestino = dropTargetId === postulacion.id;
            return (
              <article
                key={postulacion.id}
                className={`eval-ficha${esContenido ? " is-contenido" : ""}${esDestino ? " is-drop-target" : ""}${
                  puedeAsignarEval || puedeAsignarSup || esContenido ? "" : " is-locked"
                }`}
                style={esContenido ? columnasContenido : undefined}
                onDragOver={(event) => {
                  const payload = dragPoolRef.current;
                  const esSup =
                    payload?.tipo === "supervisor" ||
                    Array.from(event.dataTransfer.types).includes(DRAG_SUPERVISOR);
                  const esEval =
                    payload?.tipo === "evaluador" ||
                    Array.from(event.dataTransfer.types).includes(DRAG_EVALUADOR);
                  if (esSup && !puedeAsignarSup) return;
                  if (esEval && !puedeAsignarEval) return;
                  if (!esSup && !esEval && !puedeAsignarEval && !puedeAsignarSup) return;
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
                  const payload = leerDragPool(event, dragPoolRef.current);
                  dragPoolRef.current = null;
                  if (!payload) return;
                  if (payload.tipo === "supervisor") {
                    if (!puedeAsignarSup) return;
                    void soltarSupervisor(postulacion.id, payload.id);
                    return;
                  }
                  if (!puedeAsignarEval) return;
                  void soltarEvaluador(postulacion.id, payload.id);
                }}
              >
                {esContenido ? (
                  <>
                    <div className="eval-ficha-ver-col">
                      <button
                        className="btn btn-sm btn-secondary eval-ficha-ver"
                        type="button"
                        disabled={detalleLoadingId === postulacion.id}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void abrirDetalle(postulacion);
                        }}
                      >
                        Ver
                      </button>
                    </div>
                    <div className="eval-ficha-nombre">
                      <span className="eval-ficha-value">{postulacion.emprendedorNombre}</span>
                    </div>
                    {piezas.map((pieza) => {
                      const marcada = (postulacion.vistasPiezaIds ?? []).includes(pieza.id);
                      return (
                        <div key={pieza.id} className="eval-ficha-casilla">
                          <input
                            className="pieza-contenido-check"
                            type="checkbox"
                            checked={marcada}
                            disabled
                            readOnly
                            aria-label={`${pieza.titulo}: ${marcada ? "vista" : "sin ver"}`}
                          />
                        </div>
                      );
                    })}
                    <div className="eval-ficha-acciones">
                      <button
                        className="eval-ficha-eliminar"
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void eliminarFicha(postulacion);
                        }}
                        aria-label={`Eliminar participación de ${postulacion.emprendedorNombre}`}
                        title="Eliminar participación"
                      >
                        <IconoBasurero />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                <div className="eval-ficha-respuesta">
                  <span className="eval-ficha-ronda">
                    Ronda {rondaRespuestaEmprendedor(postulacion.asignaciones)}
                  </span>
                  <div className="eval-ficha-ver-col">
                    <button
                      className="btn btn-sm btn-secondary eval-ficha-ver eval-ficha-lupa"
                      type="button"
                      aria-label={`Acciones del caso de ${postulacion.emprendedorNombre}`}
                      title="Acciones del caso"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        abrirAccionesCaso(postulacion);
                      }}
                    >
                      <IconoLupa />
                    </button>
                  </div>
                  <div className="eval-ficha-respuesta-body">
                    <div className="eval-ficha-meta-row">
                      <div className="eval-ficha-caso">
                        <span className="eval-ficha-label">Nombre del caso</span>
                        <span className="eval-ficha-value">
                          {etiquetaNombreCaso(postulacion.nombreCaso)}
                        </span>
                      </div>
                      <div className="eval-ficha-nombre">
                        <span className="eval-ficha-label">Participante</span>
                        <span className="eval-ficha-value">{postulacion.emprendedorNombre}</span>
                      </div>
                      <div className="eval-ficha-estado">
                        <span className="eval-ficha-label">Estado</span>
                        <span className={`eval-ficha-value is-${estadoRespuesta}`}>
                          {etiquetaEstadoRespuestaFicha(estadoRespuesta)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="eval-ficha-evaluacion">
                  {postulacion.asignaciones.length === 0 ? (
                    <p className="eval-ficha-empty">
                      {estadoRespuesta === "observaciones"
                        ? "Esperando respuesta"
                        : estadoRespuesta === "pendiente"
                          ? "Respuesta pendiente"
                          : estadoRespuesta === "borrador"
                            ? "Respuesta en borrador"
                            : puedeAsignarEval
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
                            className={`eval-avatar ${claseAvatarEstado(estadoEval)}`}
                            title={`${asignacion.evaluadorNombre} · ${etiquetaEstadoAsignacionFicha(
                              estadoEval,
                            )}`}
                          >
                            <span className={`eval-avatar-pill is-${estadoEval}`}>
                              {etiquetaEstadoAsignacionFicha(estadoEval)}
                            </span>
                            <span className="eval-avatar-icon">{IconoEstadoFicha(estadoEval)}</span>
                            <span className="eval-avatar-name">{asignacion.evaluadorNombre}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="eval-ficha-supervision">
                  {!postulacion.supervision ? (
                    <p className="eval-ficha-empty">
                      {puedeAsignarSup ? "Arrastra un supervisor aquí" : "Sin supervisor"}
                    </p>
                  ) : (
                    <ul className="eval-ficha-avatars">
                      {(() => {
                        const estadoSup = estadoSupervisionFicha(postulacion.asignaciones);
                        return (
                          <li
                            className={`eval-avatar ${claseAvatarEstado(estadoSup)}`}
                            title={`${postulacion.supervision.supervisorNombre} · ${etiquetaEstadoSupervisionFicha(estadoSup)}`}
                          >
                            <span className={`eval-avatar-pill is-${estadoSup}`}>
                              {etiquetaEstadoSupervisionFicha(estadoSup)}
                            </span>
                            <span className="eval-avatar-icon">{IconoEstadoFicha(estadoSup)}</span>
                            <span className="eval-avatar-name">
                              {postulacion.supervision.supervisorNombre}
                            </span>
                          </li>
                        );
                      })()}
                    </ul>
                  )}
                </div>
                <div className="eval-ficha-acciones">
                  <button
                    className="eval-ficha-eliminar"
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void eliminarFicha(postulacion);
                    }}
                    aria-label={`Eliminar participación de ${postulacion.emprendedorNombre}`}
                    title="Eliminar participación"
                  >
                    <IconoBasurero />
                  </button>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {portalListo
        ? createPortal(
            <Modal
              open={agregarOpen}
              title={esSupervisores ? "Incorporar supervisores" : "Incorporar evaluadores"}
              wide
              onClose={() => {
                setAgregarOpen(false);
                setAgregarError(null);
                setAgregarMensaje(null);
                setSeleccionados([]);
                setFiltroNombre("");
                setFiltroEscuela("");
              }}
            >
              <div className="space-y-4">
                <p className="text-muted">
                  {esSupervisores
                    ? "Elige supervisores registrados para sumarlos a esta asesoría. Puedes agregar uno o varios a la vez."
                    : "Elige evaluadores registrados para sumarlos a esta asesoría. Puedes agregar uno o varios a la vez."}
                </p>
                {agregarError ? <p className="text-danger">{agregarError}</p> : null}
                {agregarMensaje ? <p className="font-semibold text-navy">{agregarMensaje}</p> : null}

                <div className="grid gap-4 sm:grid-cols-2">
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
                  <div className="field">
                    <label htmlFor="filtro-evaluador-escuela">Filtrar por escuela</label>
                    <select
                      className="input"
                      id="filtro-evaluador-escuela"
                      value={filtroEscuela}
                      onChange={(event) => setFiltroEscuela(event.target.value)}
                    >
                      <option value="">Todas</option>
                      {ESCUELAS.map((escuela) => (
                        <option key={escuela} value={escuela}>
                          {escuela}
                        </option>
                      ))}
                      <option value="__none__">Sin escuela</option>
                    </select>
                  </div>
                </div>

                {disponiblesActivos.length === 0 ? (
                  <p className="text-muted">
                    {esSupervisores
                      ? "No hay supervisores registrados en el sistema."
                      : "No hay evaluadores registrados en el sistema."}
                  </p>
                ) : evaluadoresFiltrados.length === 0 ? (
                  <p className="text-muted">
                    {esSupervisores
                      ? "Ningún supervisor coincide con los filtros."
                      : "Ningún evaluador coincide con los filtros."}
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={paraAgregar.length > 0 && seleccionados.length === paraAgregar.length}
                          disabled={paraAgregar.length === 0}
                          onChange={toggleTodos}
                        />
                        Seleccionar todos los disponibles
                      </label>
                      <button
                        className="btn btn-sm btn-primary"
                        type="button"
                        disabled={seleccionados.length === 0}
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
                            <th scope="col" className="eval-add-escuela">
                              Escuela
                            </th>
                            <th scope="col" className="eval-add-status">
                              En asesoría
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
                                    disabled={yaEnPool}
                                    aria-label={`Seleccionar ${evaluador.name}`}
                                    onChange={() => toggleSeleccion(evaluador.id)}
                                  />
                                </td>
                                <td className="eval-add-name">
                                  <span className="font-semibold">{evaluador.name}</span>
                                </td>
                                <td className="eval-add-email">
                                  <span className="text-muted">{normalizarCorreo(evaluador.email)}</span>
                                </td>
                                <td className="eval-add-escuela">
                                  <span className="text-muted">{evaluador.escuela ?? "—"}</span>
                                </td>
                                <td className="eval-add-status">
                                  {yaEnPool ? (
                                    <span
                                      className="eval-status-icon eval-status-yes"
                                      title="Ya está en la asesoría"
                                      aria-label="Ya está en la asesoría"
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
                                      title="No está en la asesoría"
                                      aria-label="No está en la asesoría"
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
                                    disabled={yaEnPool}
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

      {portalListo
        ? createPortal(
            <PoolPersonaModal
              open={Boolean(poolModalId)}
              item={poolModalItem}
              convocatoriaId={convocatoriaId}
              esSupervisor={
                Boolean(poolModalId) && poolSupLocal.some((item) => item.evaluadorId === poolModalId)
              }
              onClose={() => setPoolModalId(null)}
              onGuardarCupo={(cupo, esSupervisor) => {
                if (!poolModalId) return;
                guardarCupoPersona(poolModalId, cupo, esSupervisor);
              }}
            />,
            document.body,
          )
        : null}

      {portalListo
        ? createPortal(
            <Modal
              open={Boolean(accionesCaso)}
              title={
                accionesCaso
                  ? `${etiquetaNombreCaso(accionesCaso.nombreCaso)} · ${accionesCaso.emprendedorNombre}`
                  : "Acciones del caso"
              }
              compact
              onClose={cerrarAccionesCaso}
            >
              {accionesCaso ? (
                <AccionesCasoModal
                  postulacion={accionesCaso}
                  preguntas={preguntas}
                  enviando={recordatorioEnviando}
                  error={recordatorioError}
                  mensaje={recordatorioMensaje}
                  onVerCaso={() => {
                    const caso = accionesCaso;
                    cerrarAccionesCaso();
                    void abrirDetalle(caso);
                  }}
                  onRecordatorioParticipante={() =>
                    void ejecutarRecordatorio(
                      "participante",
                      "¿Enviar recordatorio al participante de este caso?",
                      () => enviarRecordatorioParticipante(accionesCaso.id),
                    )
                  }
                  onRecordatorioEvaluador={() => {
                    const n = recordatorioEvaluadorCaso(accionesCaso.asignaciones);
                    const cuantos = n.habilitado ? n.asignaciones.length : 0;
                    void ejecutarRecordatorio(
                      "evaluador",
                      cuantos === 1
                        ? "¿Enviar recordatorio al evaluador de este caso?"
                        : `¿Enviar recordatorio a ${cuantos} evaluadores de este caso?`,
                      () => enviarRecordatorioEvaluadorCaso(accionesCaso.id),
                    );
                  }}
                  onRecordatorioSupervisor={() =>
                    void ejecutarRecordatorio(
                      "supervisor",
                      "¿Enviar recordatorio al supervisor de este caso?",
                      () => enviarRecordatorioSupervisorCaso(accionesCaso.id),
                    )
                  }
                />
              ) : null}
            </Modal>,
            document.body,
          )
        : null}

      {portalListo
        ? createPortal(
            <Modal
              open={detalleOpen}
              title={
                detalle
                  ? `${etiquetaNombreCaso(detalle.nombreCaso)} · ${detalle.convocatoriaTitulo}`
                  : "Detalle de la ficha"
              }
              wide
              tall
              toned
              onClose={cerrarDetalle}
            >
              {detalleLoadingId ? (
                <p className="respuestas-lista text-muted">Cargando ficha…</p>
              ) : null}
              {detalleError ? <p className="respuestas-lista text-danger">{detalleError}</p> : null}
              {detalle ? <FichaDetalleAdmin key={detalle.id} data={detalle} /> : null}
            </Modal>,
            document.body,
          )
        : null}
      </div>
    </div>
  );
}
