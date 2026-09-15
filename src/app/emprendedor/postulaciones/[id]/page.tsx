import { BadgePostulacion } from "@/components/badges";
import { BotonAtras } from "@/components/boton-atras";
import { FormularioPostulante } from "@/components/formulario-postulante";
import { PreguntaCampo } from "@/components/pregunta-campo";
import { prisma } from "@/lib/db";
import { postulacionEditable, type EstadoPostulacion } from "@/lib/estado";
import { convocatoriaAbiertaParaPostular } from "@/lib/convocatoria";
import { asegurarPreguntaNombreCaso } from "@/lib/nombre-caso";
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
  await asegurarPreguntaNombreCaso(previa.convocatoria.formularioId);

  const postulacion = await prisma.postulacion.findUnique({
    where: { id },
    include: {
      convocatoria: {
        include: { formulario: { include: { preguntas: { orderBy: { orden: "asc" } } } } },
      },
      respuestas: true,
      asignaciones: {
        include: { evaluador: true, revisiones: true },
        orderBy: { orden: "asc" },
      },
    },
  });
  if (!postulacion || postulacion.postulanteId !== user.id) notFound();

  const estado = postulacion.estado as EstadoPostulacion;
  const abierta = convocatoriaAbiertaParaPostular(postulacion.convocatoria);
  const canEdit = postulacionEditable(estado, abierta);
  const esCorreccion = estado === "CON_OBSERVACIONES";

  const observadas = new Set<string>();
  const comentariosPorPregunta = new Map<string, { evaluacion: number; nombre: string; comentario: string }[]>();
  if (esCorreccion) {
    for (const asignacion of postulacion.asignaciones) {
      if (asignacion.estado !== "CON_OBSERVACIONES") continue;
      for (const revision of asignacion.revisiones) {
        if (revision.ronda !== asignacion.rondaActual || revision.veredicto !== "OBSERVACION") continue;
        observadas.add(revision.preguntaId);
        const list = comentariosPorPregunta.get(revision.preguntaId) ?? [];
        list.push({
          evaluacion: asignacion.orden,
          nombre: asignacion.evaluador.name,
          comentario: revision.comentario,
        });
        comentariosPorPregunta.set(revision.preguntaId, list);
      }
    }
  }

  return (
    <FormularioPostulante
      postulacionId={postulacion.id}
      canEdit={canEdit}
      esCorreccion={esCorreccion}
      back={<BotonAtras href="/emprendedor" />}
      title={<h1 className="text-3xl font-extrabold text-navy">{postulacion.convocatoria.formulario.titulo}</h1>}
      meta={
        <div className="space-y-2">
          <p className="text-muted">{postulacion.convocatoria.titulo}</p>
          {postulacion.convocatoria.formulario.descripcion ? <p>{postulacion.convocatoria.formulario.descripcion}</p> : null}
          <BadgePostulacion estado={postulacion.estado} />
          {!abierta ? (
            <p className="font-semibold text-danger">La convocatoria está cerrada. Solo puedes consultar.</p>
          ) : null}
          {esCorreccion ? (
            <p>Hay observaciones. Corrige solo las preguntas marcadas y vuelve a enviar.</p>
          ) : null}
        </div>
      }
    >
        {postulacion.convocatoria.formulario.preguntas.map((pregunta) => {
          const respuesta = postulacion.respuestas.find((r) => r.preguntaId === pregunta.id);
          const locked = esCorreccion && observadas.size > 0 && !observadas.has(pregunta.id);
          const comentarios = comentariosPorPregunta.get(pregunta.id) ?? [];
          return (
            <div key={pregunta.id} className="space-y-2">
              <PreguntaCampo
                pregunta={pregunta}
                respuesta={respuesta}
                disabled={!canEdit || locked}
              />
              {comentarios.map((item) => (
                <p key={`${item.evaluacion}-${item.comentario}`} className="rounded-lg bg-orange-50 p-3">
                  <strong>
                    Evaluación {item.evaluacion} ({item.nombre}):
                  </strong>{" "}
                  {item.comentario}
                </p>
              ))}
            </div>
          );
        })}
      </FormularioPostulante>
  );
}
