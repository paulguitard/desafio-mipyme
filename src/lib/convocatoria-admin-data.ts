import { prisma } from "@/lib/db";
import { asegurarPreguntaNombreCaso, extraerNombreCaso } from "@/lib/nombre-caso";

export async function getRespuestasConvocatoria(id: string) {
  const convocatoria = await prisma.convocatoria.findUnique({
    where: { id },
    include: {
      formulario: {
        include: { preguntas: { orderBy: { orden: "asc" } } },
      },
      postulaciones: {
        include: {
          postulante: true,
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
      emprendedorEmail: postulacion.postulante.email,
      respuestas: postulacion.respuestas.map((respuesta) => ({
        preguntaId: respuesta.preguntaId,
        valor: respuesta.valor,
        archivos: respuesta.archivos,
      })),
    })),
  };
}

export async function getPanelEvaluacion(id: string) {
  const existente = await prisma.convocatoria.findUnique({
    where: { id },
    select: { formularioId: true },
  });
  if (!existente) return null;
  await asegurarPreguntaNombreCaso(existente.formularioId);

  const [convocatoria, evaluadores] = await Promise.all([
    prisma.convocatoria.findUnique({
      where: { id },
      include: {
        formulario: {
          include: { preguntas: { orderBy: { orden: "asc" } } },
        },
        evaluadores: { include: { evaluador: true }, orderBy: { evaluador: { name: "asc" } } },
        postulaciones: {
          include: {
            postulante: true,
            respuestas: true,
            asignaciones: { include: { evaluador: true }, orderBy: { orden: "asc" } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.user.findMany({ where: { role: "EVALUADOR" }, orderBy: { name: "asc" } }),
  ]);
  if (!convocatoria) return null;

  const stats = new Map<string, { asignadas: number; revisadas: number; finalizadas: number }>();
  for (const postulacion of convocatoria.postulaciones) {
    for (const asignacion of postulacion.asignaciones) {
      const actual = stats.get(asignacion.evaluadorId) ?? {
        asignadas: 0,
        revisadas: 0,
        finalizadas: 0,
      };
      actual.asignadas += 1;
      if (asignacion.estado === "FINALIZADA") {
        actual.finalizadas += 1;
      } else if (
        asignacion.estado === "CON_OBSERVACIONES" ||
        asignacion.estado === "REPARADA"
      ) {
        // Ya envió observaciones al emprendedor (pendiente o ya reparada).
        actual.revisadas += 1;
      }
      stats.set(asignacion.evaluadorId, actual);
    }
  }

  return {
    id: convocatoria.id,
    titulo: convocatoria.titulo,
    estado: convocatoria.estado,
    evaluacionesPorPostulacion: convocatoria.evaluacionesPorPostulacion,
    preguntas: convocatoria.formulario.preguntas.map((pregunta) => ({
      id: pregunta.id,
      enunciado: pregunta.enunciado,
      obligatoria: pregunta.obligatoria,
      opciones: pregunta.opciones,
    })),
    pool: convocatoria.evaluadores.map((item) => {
      const resumen = stats.get(item.evaluadorId) ?? {
        asignadas: 0,
        revisadas: 0,
        finalizadas: 0,
      };
      return {
        evaluadorId: item.evaluadorId,
        maxEvaluaciones: item.maxEvaluaciones,
        evaluador: {
          id: item.evaluador.id,
          name: item.evaluador.name,
          email: item.evaluador.email,
        },
        carga: resumen.asignadas,
        asignadas: resumen.asignadas,
        revisadas: resumen.revisadas,
        finalizadas: resumen.finalizadas,
      };
    }),
    evaluadoresDisponibles: evaluadores.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
    })),
    postulaciones: convocatoria.postulaciones.map((postulacion) => ({
      id: postulacion.id,
      estado: postulacion.estado,
      enviadaAt: postulacion.enviadaAt?.toISOString() ?? null,
      emprendedorNombre: postulacion.postulante.name,
      emprendedorEmail: postulacion.postulante.email,
      respuestas: postulacion.respuestas.map((respuesta) => ({
        preguntaId: respuesta.preguntaId,
        valor: respuesta.valor,
      })),
      nombreCaso: extraerNombreCaso(convocatoria.formulario.preguntas, postulacion.respuestas),
      asignaciones: postulacion.asignaciones.map((asignacion) => ({
        evaluadorId: asignacion.evaluadorId,
        evaluadorNombre: asignacion.evaluador.name,
        orden: asignacion.orden,
        estado: asignacion.estado,
      })),
    })),
  };
}

export type RespuestasConvocatoria = NonNullable<Awaited<ReturnType<typeof getRespuestasConvocatoria>>>;
export type PanelEvaluacion = NonNullable<Awaited<ReturnType<typeof getPanelEvaluacion>>>;
