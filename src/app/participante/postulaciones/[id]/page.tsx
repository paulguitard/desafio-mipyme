import { BadgePostulacion } from "@/components/badges";
import { BotonAtras } from "@/components/boton-atras";
import { FormularioPostulante } from "@/components/formulario-postulante";
import { PreguntaCampo } from "@/components/pregunta-campo";
import { VistaCorreccionParticipante } from "@/components/vista-correccion-participante";
import { prisma } from "@/lib/db";
import { postulacionEditable, type EstadoPostulacion } from "@/lib/estado";
import { convocatoriaAbiertaParaPostular } from "@/lib/convocatoria";
import { parseModoEvaluacion } from "@/lib/modo-evaluacion";
import { coincideRevisionCiclo, revisionesParaParticipante } from "@/lib/revision-ciclo";
import { requireUser } from "@/lib/session";
import { notFound } from "next/navigation";

export default async function PostulacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser("EMPRENDEDOR");
  const { id } = await params;
  const previa = await prisma.postulacion.findUnique({
    where: { id },
    select: { postulanteId: true, convocatoria: { select: { formularioId: true } } },
  });
  if (!previa || previa.postulanteId !== user.id) notFound();

  const postulacion = await prisma.postulacion.findUnique({
    where: { id },
    include: {
      convocatoria: {
        include: { formulario: { include: { preguntas: { orderBy: { orden: "asc" } } } } },
      },
      respuestas: {
        include: { versiones: { orderBy: { createdAt: "desc" } } },
      },
      asignaciones: {
        include: { evaluador: true, revisiones: true, revisionesGenerales: true },
        orderBy: { orden: "asc" },
      },
    },
  });
  if (!postulacion || postulacion.postulanteId !== user.id) notFound();

  const estado = postulacion.estado as EstadoPostulacion;
  const abierta = convocatoriaAbiertaParaPostular(postulacion.convocatoria);
  const canEdit = postulacionEditable(estado, abierta);
  const esCorreccion = estado === "CON_OBSERVACIONES";
  const modoEvaluacion = parseModoEvaluacion(postulacion.convocatoria.formulario.modoEvaluacion);
  const esGeneral = modoEvaluacion === "GENERAL";

  const observadas = new Set<string>();
  if (esCorreccion) {
    for (const asignacion of postulacion.asignaciones) {
      if (asignacion.estado !== "CON_OBSERVACIONES") continue;
      if (esGeneral) continue;
      for (const revision of asignacion.revisiones) {
        if (
          !coincideRevisionCiclo(revision, asignacion.rondaActual, asignacion.cicloSupervision) ||
          revision.veredicto !== "OBSERVACION"
        )
          continue;
        observadas.add(revision.preguntaId);
      }
    }
  }

  const asignacionesVista = postulacion.asignaciones
    .map((asignacion) => ({
      id: asignacion.id,
      orden: asignacion.orden,
      estado: asignacion.estado,
      evaluadorNombre: asignacion.evaluador.name,
      rondaActual: asignacion.rondaActual,
      cicloSupervision: asignacion.cicloSupervision,
      revisiones: revisionesParaParticipante(asignacion.revisiones, asignacion).map((revision) => ({
        id: revision.id,
        preguntaId: revision.preguntaId,
        ronda: revision.ronda,
        ciclo: revision.ciclo,
        veredicto: revision.veredicto,
        comentario: revision.comentario,
        nota: revision.nota,
        createdAt: revision.createdAt.toISOString(),
      })),
      revisionesGenerales: revisionesParaParticipante(asignacion.revisionesGenerales, asignacion).map(
        (revision) => ({
          id: revision.id,
          ronda: revision.ronda,
          ciclo: revision.ciclo,
          veredicto: revision.veredicto,
          comentario: revision.comentario,
          createdAt: revision.createdAt.toISOString(),
        }),
      ),
    }))
    .filter(
      (asignacion) =>
        asignacion.revisiones.length > 0 || asignacion.revisionesGenerales.length > 0,
    );

  return (
    <FormularioPostulante
      postulacionId={postulacion.id}
      canEdit={canEdit}
      esCorreccion={esCorreccion}
      layout={esCorreccion ? "paneles" : "formulario"}
      back={<BotonAtras href="/participante" />}
      title={<h1 className="text-3xl font-extrabold text-navy">{postulacion.convocatoria.formulario.titulo}</h1>}
      meta={
        <div className="space-y-2">
          <p className="text-muted">{postulacion.convocatoria.titulo}</p>
          {!esCorreccion && postulacion.convocatoria.formulario.descripcion ? (
            <p>{postulacion.convocatoria.formulario.descripcion}</p>
          ) : null}
          <BadgePostulacion estado={postulacion.estado} />
          {!canEdit && !abierta ? (
            <p className="font-semibold text-danger">La mentoría está cerrada. Solo puedes consultar.</p>
          ) : null}
        </div>
      }
    >
      {esCorreccion ? (
        <VistaCorreccionParticipante
          preguntas={postulacion.convocatoria.formulario.preguntas}
          respuestas={postulacion.respuestas.map((respuesta) => ({
            preguntaId: respuesta.preguntaId,
            valor: respuesta.valor,
            archivos: respuesta.archivos,
            versiones: respuesta.versiones.map((version) => ({
              id: version.id,
              valor: version.valor,
              archivos: version.archivos,
              createdAt: version.createdAt.toISOString(),
            })),
          }))}
          asignaciones={asignacionesVista}
          observadas={[...observadas]}
          esGeneral={esGeneral}
          canEdit={canEdit}
        />
      ) : (
        postulacion.convocatoria.formulario.preguntas.map((pregunta) => {
          const respuesta = postulacion.respuestas.find((item) => item.preguntaId === pregunta.id);
          return (
            <PreguntaCampo
              key={pregunta.id}
              pregunta={pregunta}
              respuesta={respuesta}
              disabled={!canEdit}
            />
          );
        })
      )}
    </FormularioPostulante>
  );
}
