import { BotonAtras } from "@/components/boton-atras";
import { FichaCasoMeta } from "@/components/ficha-caso-meta";
import { FormularioPostulante } from "@/components/formulario-postulante";
import { PreguntaCampo } from "@/components/pregunta-campo";
import { VistaCorreccionParticipante } from "@/components/vista-correccion-participante";
import { VisorContenidoParticipante } from "@/components/visor-contenido-participante";
import { prisma } from "@/lib/db";
import { postulacionEditable, type EstadoPostulacion } from "@/lib/estado";
import { convocatoriaAbiertaParaPostular } from "@/lib/convocatoria";
import { medioDesdeFila } from "@/lib/contenido";
import { parseModoEvaluacion } from "@/lib/modo-evaluacion";
import { etiquetaNombreCaso, extraerNombreCaso } from "@/lib/nombre-caso";
import { preguntasModificadasEnUltimoEnvio } from "@/lib/cambios-reenvio";
import { esMentoriaContenido } from "@/lib/tipo-formulario";
import { coincideRevisionCiclo, revisionesParaParticipante } from "@/lib/revision-ciclo";
import { avisoEntradaParticipante } from "@/lib/aviso-entrada-caso";
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
    select: { postulanteId: true, convocatoria: { select: { tipo: true } } },
  });
  if (!previa || previa.postulanteId !== user.id) notFound();

  if (esMentoriaContenido(previa.convocatoria.tipo)) {
    const postulacion = await prisma.postulacion.findUnique({
      where: { id },
      include: {
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
    if (!postulacion || postulacion.postulanteId !== user.id) notFound();
    const vistas = new Set(postulacion.vistasContenido.map((item) => item.piezaId));
    return (
      <VisorContenidoParticipante
        postulacionId={postulacion.id}
        titulo={postulacion.convocatoria.titulo}
        piezas={postulacion.convocatoria.formulario.piezasContenido.map((pieza) => ({
          id: pieza.id,
          orden: pieza.orden,
          titulo: pieza.titulo,
          descripcion: pieza.descripcion,
          marcada: vistas.has(pieza.id),
          medios: pieza.medios
            .map(medioDesdeFila)
            .filter((item): item is NonNullable<typeof item> => Boolean(item)),
        }))}
      />
    );
  }

  const postulacion = await prisma.postulacion.findUnique({
    where: { id },
    include: {
      convocatoria: {
        include: {
          formulario: {
            include: {
              preguntas: { orderBy: { orden: "asc" } },
            },
          },
        },
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

  const nombreCaso = etiquetaNombreCaso(
    postulacion.nombreCaso ||
      extraerNombreCaso(postulacion.convocatoria.formulario.preguntas, postulacion.respuestas),
  );
  const evaluadorNombre = postulacion.asignaciones[0]?.evaluador.name ?? "";

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
  const conEvaluacionVisible = esCorreccion || asignacionesVista.length > 0;
  const idsModificadas = new Set(
    preguntasModificadasEnUltimoEnvio({
      respuestas: postulacion.respuestas.map((respuesta) => ({
        preguntaId: respuesta.preguntaId,
        tipo:
          postulacion.convocatoria.formulario.preguntas.find(
            (pregunta) => pregunta.id === respuesta.preguntaId,
          )?.tipo ?? "texto_corto",
        versiones: respuesta.versiones.map((version) => ({
          valor: version.valor,
          archivos: version.archivos,
          createdAt: version.createdAt.toISOString(),
        })),
      })),
      asignaciones: postulacion.asignaciones.map((asignacion) => ({
        rondaActual: asignacion.rondaActual,
        revisiones: [
          ...asignacion.revisiones.map((revision) => ({
            ronda: revision.ronda,
            createdAt: revision.createdAt.toISOString(),
          })),
          ...asignacion.revisionesGenerales.map((revision) => ({
            ronda: revision.ronda,
            createdAt: revision.createdAt.toISOString(),
          })),
        ],
      })),
    }),
  );

  return (
    <FormularioPostulante
      postulacionId={postulacion.id}
      canEdit={canEdit}
      esCorreccion={esCorreccion}
      layout={conEvaluacionVisible ? "paneles" : "formulario"}
      back={<BotonAtras href="/participante" />}
      title={
        <h1 className="formulario-caso-titulo text-3xl font-extrabold text-navy">
          {nombreCaso} · {postulacion.convocatoria.titulo}
        </h1>
      }
      meta={
        <FichaCasoMeta participante={user.name} evaluador={evaluadorNombre} />
      }
      avisoEntrada={avisoEntradaParticipante({
        estado,
        esCorreccion,
        canEdit,
        mentoriaAbierta: abierta,
        descripcionMentoria: postulacion.convocatoria.descripcion,
        conEvaluacionVisible,
      })}
    >
      {conEvaluacionVisible ? (
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
          modificadas={[...idsModificadas]}
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
