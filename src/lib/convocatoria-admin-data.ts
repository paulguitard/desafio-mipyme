import { prisma } from "@/lib/db";
import { normalizarCorreo } from "@/lib/correo";
import { esEvaluacionObservada } from "@/lib/cupo-asignacion";
import { extraerNombreCaso } from "@/lib/nombre-caso";
import { USER_PUBLIC_SELECT } from "@/lib/user-public";
import { medioDesdeFila } from "@/lib/contenido";
import { parseTipoFormulario, esMentoriaContenido } from "@/lib/tipo-formulario";
import { esTokenPublicoValido } from "@/lib/ficha-publica";

export type CasoPoolResumen = {
  postulacionId: string;
  nombreCaso: string;
  emprendedorNombre: string;
};

type ResumenPool = {
  asignadas: number;
  revisadas: number;
  finalizadas: number;
  casosAsignados: CasoPoolResumen[];
  casosObservados: CasoPoolResumen[];
  casosFinalizados: CasoPoolResumen[];
};

function resumenVacio(): ResumenPool {
  return {
    asignadas: 0,
    revisadas: 0,
    finalizadas: 0,
    casosAsignados: [],
    casosObservados: [],
    casosFinalizados: [],
  };
}

export const PANEL_PAGE_SIZE = 40;

export async function getRespuestasConvocatoria(id: string) {
  const convocatoria = await prisma.convocatoria.findUnique({
    where: { id },
    include: {
      formulario: {
        include: { preguntas: { orderBy: { orden: "asc" } } },
      },
      postulaciones: {
        include: {
          postulante: { select: USER_PUBLIC_SELECT },
          respuestas: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!convocatoria) return null;

  return {
    id: convocatoria.id,
    titulo: convocatoria.titulo,
    preguntas: convocatoria.formulario.preguntas.map((pregunta) => ({
      id: pregunta.id,
      enunciado: pregunta.enunciado,
      ayuda: pregunta.ayuda,
      tipo: pregunta.tipo,
      opciones: pregunta.opciones,
      obligatoria: pregunta.obligatoria,
      permiteArchivo: pregunta.permiteArchivo,
      permiteImagen: pregunta.permiteImagen,
      permiteVideoLink: pregunta.permiteVideoLink,
    })),
    postulaciones: convocatoria.postulaciones.map((postulacion) => ({
      id: postulacion.id,
      estado: postulacion.estado,
      enviadaAt: postulacion.enviadaAt?.toISOString() ?? null,
      emprendedorNombre: postulacion.postulante.name,
      emprendedorEmail: normalizarCorreo(postulacion.postulante.email),
      respuestas: postulacion.respuestas.map((respuesta) => ({
        preguntaId: respuesta.preguntaId,
        valor: respuesta.valor,
        archivos: respuesta.archivos,
      })),
    })),
  };
}

export async function getPanelEvaluacion(id: string, page = 1) {
  const existente = await prisma.convocatoria.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existente) return null;

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const skip = (safePage - 1) * PANEL_PAGE_SIZE;

  const [convocatoria, totalPostulaciones, evaluadores, supervisores, asignacionesStats, supervisionStats] =
    await Promise.all([
    prisma.convocatoria.findUnique({
      where: { id },
      include: {
        formulario: {
          include: {
            preguntas: { orderBy: { orden: "asc" } },
            piezasContenido: {
              orderBy: { orden: "asc" },
              include: { medios: { orderBy: { orden: "asc" } } },
            },
          },
        },
        evaluadores: {
          include: { evaluador: { select: USER_PUBLIC_SELECT } },
          orderBy: { evaluador: { name: "asc" } },
        },
        supervisores: {
          include: { supervisor: { select: USER_PUBLIC_SELECT } },
          orderBy: { supervisor: { name: "asc" } },
        },
        postulaciones: {
          include: {
            postulante: { select: USER_PUBLIC_SELECT },
            respuestas: { select: { preguntaId: true, valor: true } },
            vistasContenido: { select: { piezaId: true } },
            asignaciones: {
              include: { evaluador: { select: USER_PUBLIC_SELECT } },
              orderBy: { orden: "asc" },
            },
            supervision: { include: { supervisor: { select: USER_PUBLIC_SELECT } } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: PANEL_PAGE_SIZE,
        },
      },
    }),
    prisma.postulacion.count({ where: { convocatoriaId: id } }),
    prisma.user.findMany({
      where: { role: "EVALUADOR" },
      orderBy: { name: "asc" },
      select: USER_PUBLIC_SELECT,
    }),
    prisma.user.findMany({
      where: { role: "SUPERVISOR" },
      orderBy: { name: "asc" },
      select: USER_PUBLIC_SELECT,
    }),
    prisma.asignacionEvaluador.findMany({
      where: { postulacion: { convocatoriaId: id } },
      select: {
        evaluadorId: true,
        estado: true,
        postulacion: {
          select: {
            id: true,
            nombreCaso: true,
            postulante: { select: { name: true } },
          },
        },
      },
    }),
    prisma.asignacionSupervisor.findMany({
      where: { postulacion: { convocatoriaId: id } },
      select: {
        supervisorId: true,
        postulacion: {
          select: {
            id: true,
            nombreCaso: true,
            postulante: { select: { name: true } },
            asignaciones: { select: { estado: true } },
          },
        },
      },
    }),
  ]);
  if (!convocatoria) return null;

  const stats = new Map<string, ResumenPool>();
  for (const asignacion of asignacionesStats) {
    const actual = stats.get(asignacion.evaluadorId) ?? resumenVacio();
    const caso: CasoPoolResumen = {
      postulacionId: asignacion.postulacion.id,
      nombreCaso: asignacion.postulacion.nombreCaso,
      emprendedorNombre: asignacion.postulacion.postulante.name,
    };
    actual.asignadas += 1;
    actual.casosAsignados.push(caso);
    if (asignacion.estado === "FINALIZADA") {
      actual.finalizadas += 1;
      actual.casosFinalizados.push(caso);
    } else if (esEvaluacionObservada(asignacion.estado)) {
      actual.revisadas += 1;
      actual.casosObservados.push(caso);
    }
    stats.set(asignacion.evaluadorId, actual);
  }

  const statsSup = new Map<string, ResumenPool>();
  for (const item of supervisionStats) {
    const sid = item.supervisorId;
    const actual = statsSup.get(sid) ?? resumenVacio();
    const caso: CasoPoolResumen = {
      postulacionId: item.postulacion.id,
      nombreCaso: item.postulacion.nombreCaso,
      emprendedorNombre: item.postulacion.postulante.name,
    };
    actual.asignadas += 1;
    actual.casosAsignados.push(caso);
    const evals = item.postulacion.asignaciones;
    if (evals.length > 0 && evals.every((a) => a.estado === "FINALIZADA")) {
      actual.finalizadas += 1;
      actual.casosFinalizados.push(caso);
    } else if (evals.some((a) => a.estado === "DEVUELTA_SUPERVISOR")) {
      actual.revisadas += 1;
      actual.casosObservados.push(caso);
    }
    statsSup.set(sid, actual);
  }

  return {
    id: convocatoria.id,
    titulo: convocatoria.titulo,
    estado: convocatoria.estado,
    tipo: parseTipoFormulario(convocatoria.tipo),
    evaluacionesPorPostulacion: convocatoria.evaluacionesPorPostulacion,
    page: safePage,
    pageSize: PANEL_PAGE_SIZE,
    totalPostulaciones,
    preguntas: convocatoria.formulario.preguntas.map((pregunta) => ({
      id: pregunta.id,
      enunciado: pregunta.enunciado,
      obligatoria: pregunta.obligatoria,
      opciones: pregunta.opciones,
    })),
    piezas: convocatoria.formulario.piezasContenido.map((pieza) => ({
      id: pieza.id,
      titulo: pieza.titulo,
    })),
    pool: convocatoria.evaluadores.map((item) => {
      const resumen = stats.get(item.evaluadorId) ?? resumenVacio();
      return {
        evaluadorId: item.evaluadorId,
        maxEvaluaciones: item.maxEvaluaciones,
        evaluador: {
          id: item.evaluador.id,
          name: item.evaluador.name,
          email: normalizarCorreo(item.evaluador.email),
          escuela: item.evaluador.escuela,
        },
        carga: resumen.asignadas,
        asignadas: resumen.asignadas,
        revisadas: resumen.revisadas,
        finalizadas: resumen.finalizadas,
        casosAsignados: resumen.casosAsignados,
        casosObservados: resumen.casosObservados,
        casosFinalizados: resumen.casosFinalizados,
      };
    }),
    evaluadoresDisponibles: evaluadores.map((user) => ({
      id: user.id,
      name: user.name,
      email: normalizarCorreo(user.email),
      escuela: user.escuela,
    })),
    poolSupervisores: convocatoria.supervisores.map((item) => {
      const resumen = statsSup.get(item.supervisorId) ?? resumenVacio();
      return {
        evaluadorId: item.supervisorId,
        maxEvaluaciones: item.maxSupervisiones,
        evaluador: {
          id: item.supervisor.id,
          name: item.supervisor.name,
          email: normalizarCorreo(item.supervisor.email),
          escuela: item.supervisor.escuela,
        },
        carga: resumen.asignadas,
        asignadas: resumen.asignadas,
        revisadas: resumen.revisadas,
        finalizadas: resumen.finalizadas,
        casosAsignados: resumen.casosAsignados,
        casosObservados: resumen.casosObservados,
        casosFinalizados: resumen.casosFinalizados,
      };
    }),
    supervisoresDisponibles: supervisores.map((user) => ({
      id: user.id,
      name: user.name,
      email: normalizarCorreo(user.email),
      escuela: user.escuela,
    })),
    postulaciones: convocatoria.postulaciones.map((postulacion) => ({
      id: postulacion.id,
      estado: postulacion.estado,
      enviadaAt: postulacion.enviadaAt?.toISOString() ?? null,
      emprendedorNombre: postulacion.postulante.name,
      emprendedorEmail: normalizarCorreo(postulacion.postulante.email),
      respuestas: postulacion.respuestas.map((respuesta) => ({
        preguntaId: respuesta.preguntaId,
        valor: respuesta.valor,
      })),
      vistasPiezaIds: postulacion.vistasContenido.map((item) => item.piezaId),
      nombreCaso: postulacion.nombreCaso || extraerNombreCaso(convocatoria.formulario.preguntas, postulacion.respuestas),
      tokenPublico: postulacion.tokenPublico,
      asignaciones: postulacion.asignaciones.map((asignacion) => ({
        evaluadorId: asignacion.evaluadorId,
        evaluadorNombre: asignacion.evaluador.name,
        orden: asignacion.orden,
        estado: asignacion.estado,
        rondaActual: asignacion.rondaActual,
        intencionPendiente: asignacion.intencionPendiente,
      })),
      supervision: postulacion.supervision
        ? {
            supervisorId: postulacion.supervision.supervisorId,
            supervisorNombre: postulacion.supervision.supervisor.name,
          }
        : null,
    })),
  };
}

export async function getDetalleFichaAdmin(postulacionId: string) {
  const postulacion = await prisma.postulacion.findUnique({
    where: { id: postulacionId },
    include: {
      postulante: { select: USER_PUBLIC_SELECT },
      respuestas: {
        include: { versiones: { orderBy: { createdAt: "desc" } } },
      },
      asignaciones: {
        include: {
          evaluador: { select: USER_PUBLIC_SELECT },
          revisiones: { orderBy: [{ ronda: "asc" }, { ciclo: "asc" }, { createdAt: "asc" }] },
          revisionesGenerales: { orderBy: [{ ronda: "asc" }, { ciclo: "asc" }, { createdAt: "asc" }] },
          supervisionesPregunta: { orderBy: [{ ronda: "asc" }, { ciclo: "asc" }, { createdAt: "asc" }] },
          supervisionesGenerales: { orderBy: [{ ronda: "asc" }, { ciclo: "asc" }, { createdAt: "asc" }] },
        },
        orderBy: { orden: "asc" },
      },
      supervision: { include: { supervisor: { select: USER_PUBLIC_SELECT } } },
      convocatoria: {
        include: {
          formulario: {
            include: {
              preguntas: { orderBy: { orden: "asc" } },
              piezasContenido: {
                orderBy: { orden: "asc" },
                include: { medios: { orderBy: { orden: "asc" } } },
              },
            },
          },
        },
      },
      vistasContenido: { select: { piezaId: true } },
    },
  });
  if (!postulacion) return null;

  const preguntas = postulacion.convocatoria.formulario.preguntas;

  return {
    id: postulacion.id,
    estado: postulacion.estado,
    enviadaAt: postulacion.enviadaAt?.toISOString() ?? null,
    emprendedorNombre: postulacion.postulante.name,
    emprendedorEmail: normalizarCorreo(postulacion.postulante.email),
    nombreCaso: postulacion.nombreCaso || extraerNombreCaso(preguntas, postulacion.respuestas),
    convocatoriaTitulo: postulacion.convocatoria.titulo,
    convocatoriaEstado: postulacion.convocatoria.estado,
    tipo: parseTipoFormulario(postulacion.convocatoria.tipo),
    modoEvaluacion: postulacion.convocatoria.formulario.modoEvaluacion,
    supervisorNombre: postulacion.supervision?.supervisor.name ?? null,
    supervisorEmail: postulacion.supervision?.supervisor.email
      ? normalizarCorreo(postulacion.supervision.supervisor.email)
      : null,
    preguntas: preguntas.map((pregunta) => ({
      id: pregunta.id,
      enunciado: pregunta.enunciado,
      ayuda: pregunta.ayuda,
      tipo: pregunta.tipo,
      opciones: pregunta.opciones,
      obligatoria: pregunta.obligatoria,
      permiteArchivo: pregunta.permiteArchivo,
      permiteImagen: pregunta.permiteImagen,
      permiteVideoLink: pregunta.permiteVideoLink,
      conNotas: pregunta.conNotas,
      escalaNotas: pregunta.escalaNotas,
    })),
    piezas: postulacion.convocatoria.formulario.piezasContenido.map((pieza) => ({
      id: pieza.id,
      orden: pieza.orden,
      titulo: pieza.titulo,
      descripcion: pieza.descripcion,
      marcada: postulacion.vistasContenido.some((item) => item.piezaId === pieza.id),
      medios: pieza.medios
        .map(medioDesdeFila)
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    })),
    respuestas: postulacion.respuestas.map((respuesta) => ({
      preguntaId: respuesta.preguntaId,
      valor: respuesta.valor,
      archivos: respuesta.archivos,
      versiones: respuesta.versiones.map((version) => ({
        id: version.id,
        valor: version.valor,
        archivos: version.archivos,
        createdAt: version.createdAt.toISOString(),
      })),
    })),
    asignaciones: postulacion.asignaciones.map((asignacion) => ({
      id: asignacion.id,
      evaluadorId: asignacion.evaluadorId,
      evaluadorNombre: asignacion.evaluador.name,
      evaluadorEmail: normalizarCorreo(asignacion.evaluador.email),
      estado: asignacion.estado,
      rondaActual: asignacion.rondaActual,
      cicloSupervision: asignacion.cicloSupervision,
      intencionPendiente: asignacion.intencionPendiente,
      orden: asignacion.orden,
      revisiones: asignacion.revisiones.map((revision) => ({
        id: revision.id,
        preguntaId: revision.preguntaId,
        ronda: revision.ronda,
        ciclo: revision.ciclo,
        veredicto: revision.veredicto,
        comentario: revision.comentario,
        nota: revision.nota,
        createdAt: revision.createdAt.toISOString(),
      })),
      revisionesGenerales: asignacion.revisionesGenerales.map((revision) => ({
        id: revision.id,
        ronda: revision.ronda,
        ciclo: revision.ciclo,
        veredicto: revision.veredicto,
        comentario: revision.comentario,
        createdAt: revision.createdAt.toISOString(),
      })),
      supervisionesPregunta: asignacion.supervisionesPregunta.map((item) => ({
        id: item.id,
        preguntaId: item.preguntaId,
        ronda: item.ronda,
        ciclo: item.ciclo,
        veredicto: item.veredicto,
        comentario: item.comentario,
        createdAt: item.createdAt.toISOString(),
      })),
      supervisionesGenerales: asignacion.supervisionesGenerales.map((item) => ({
        id: item.id,
        ronda: item.ronda,
        ciclo: item.ciclo,
        veredicto: item.veredicto,
        comentario: item.comentario,
        createdAt: item.createdAt.toISOString(),
      })),
    })),
  };
}

export async function getDetalleFichaPorToken(token: string) {
  if (!esTokenPublicoValido(token)) return null;
  const fila = await prisma.postulacion.findUnique({
    where: { tokenPublico: token },
    select: { id: true, convocatoria: { select: { tipo: true } } },
  });
  if (!fila) return null;
  if (esMentoriaContenido(fila.convocatoria.tipo)) return null;
  return getDetalleFichaAdmin(fila.id);
}

export type RespuestasConvocatoria = NonNullable<Awaited<ReturnType<typeof getRespuestasConvocatoria>>>;
export type PanelEvaluacion = NonNullable<Awaited<ReturnType<typeof getPanelEvaluacion>>>;
export type DetalleFichaAdmin = NonNullable<Awaited<ReturnType<typeof getDetalleFichaAdmin>>>;
