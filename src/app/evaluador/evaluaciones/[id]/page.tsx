import { BotonAtras } from "@/components/boton-atras";
import { EvalDetalleCelda } from "@/components/eval-detalle-head";
import { FichaCasoMeta } from "@/components/ficha-caso-meta";
import { FormularioEvaluacion } from "@/components/formulario-evaluacion";
import { HistorialVersionesRespuesta } from "@/components/historial-versiones-respuesta";
import { PanelHiloRevision } from "@/components/hilo-revision";
import { PreguntaCampo } from "@/components/pregunta-campo";
import { ResumenCambiosReenvio } from "@/components/resumen-cambios-reenvio";
import { preguntasModificadasEnUltimoEnvio } from "@/lib/cambios-reenvio";
import { prisma } from "@/lib/db";
import { evaluadorPuedeEditar } from "@/lib/estado";
import { avisoEntradaEvaluador } from "@/lib/aviso-entrada-caso";
import { parseModoEvaluacion } from "@/lib/modo-evaluacion";
import { etiquetaNombreCaso, extraerNombreCaso } from "@/lib/nombre-caso";
import { notasParaEvaluacionGeneral, parseEscalaNotas } from "@/lib/preguntas";
import { revisionParaEditar } from "@/lib/revision-ciclo";
import { requireUser } from "@/lib/session";
import { notFound } from "next/navigation";

export default async function EvaluacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser("EVALUADOR");
  const { id } = await params;
  const asignacion = await prisma.asignacionEvaluador.findFirst({
    where: { id, evaluadorId: user.id },
    include: {
      evaluador: true,
      revisiones: { orderBy: [{ ronda: "asc" }, { ciclo: "asc" }, { createdAt: "asc" }] },
      revisionesGenerales: { orderBy: [{ ronda: "asc" }, { ciclo: "asc" }, { createdAt: "asc" }] },
      supervisionesPregunta: { orderBy: [{ ronda: "asc" }, { ciclo: "asc" }, { createdAt: "asc" }] },
      supervisionesGenerales: { orderBy: [{ ronda: "asc" }, { ciclo: "asc" }, { createdAt: "asc" }] },
      postulacion: {
        include: {
          postulante: true,
          supervision: { include: { supervisor: true } },
          convocatoria: {
            include: { formulario: { include: { preguntas: { orderBy: { orden: "asc" } } } } },
          },
          respuestas: {
            include: { versiones: { orderBy: { createdAt: "desc" } } },
          },
          asignaciones: {
            select: {
              rondaActual: true,
              revisiones: { select: { ronda: true, createdAt: true } },
              revisionesGenerales: { select: { ronda: true, createdAt: true } },
            },
          },
        },
      },
    },
  });
  if (!asignacion) notFound();

  const canEdit = evaluadorPuedeEditar(asignacion.estado);
  const ronda = asignacion.rondaActual;
  const ciclo = asignacion.cicloSupervision;
  const modoEvaluacion = parseModoEvaluacion(
    asignacion.postulacion.convocatoria.formulario.modoEvaluacion,
  );
  const esGeneral = modoEvaluacion === "GENERAL";
  const nombreCaso = etiquetaNombreCaso(
    extraerNombreCaso(
      asignacion.postulacion.convocatoria.formulario.preguntas,
      asignacion.postulacion.respuestas,
    ),
  );
  const preguntas = asignacion.postulacion.convocatoria.formulario.preguntas;
  const idsModificadas = new Set(
    preguntasModificadasEnUltimoEnvio({
      respuestas: asignacion.postulacion.respuestas.map((respuesta) => ({
        preguntaId: respuesta.preguntaId,
        tipo: preguntas.find((pregunta) => pregunta.id === respuesta.preguntaId)?.tipo ?? "texto_corto",
        versiones: respuesta.versiones.map((version) => ({
          valor: version.valor,
          archivos: version.archivos,
          createdAt: version.createdAt.toISOString(),
        })),
      })),
      asignaciones: asignacion.postulacion.asignaciones.map((item) => ({
        rondaActual: item.rondaActual,
        revisiones: [
          ...item.revisiones.map((revision) => ({
            ronda: revision.ronda,
            createdAt: revision.createdAt.toISOString(),
          })),
          ...item.revisionesGenerales.map((revision) => ({
            ronda: revision.ronda,
            createdAt: revision.createdAt.toISOString(),
          })),
        ],
      })),
    }),
  );
  const preguntasModificadas = preguntas
    .filter((pregunta) => idsModificadas.has(pregunta.id))
    .map((pregunta) => ({ id: pregunta.id, enunciado: pregunta.enunciado }));
  const veredictosIniciales = esGeneral
    ? {
        general:
          revisionParaEditar(asignacion.revisionesGenerales, ronda, ciclo)?.veredicto ?? "",
      }
    : Object.fromEntries(
        preguntas.map((pregunta) => [
          pregunta.id,
          revisionParaEditar(
            asignacion.revisiones.filter((item) => item.preguntaId === pregunta.id),
            ronda,
            ciclo,
          )?.veredicto ?? "",
        ]),
      );
  const hiloAsignacion = {
    estado: asignacion.estado,
    rondaActual: ronda,
    cicloSupervision: ciclo,
  };

  return (
    <FormularioEvaluacion
      asignacionId={asignacion.id}
      canEdit={canEdit}
      modoEvaluacion={modoEvaluacion}
      back={<BotonAtras href="/evaluador" />}
      title={
        <h1 className="formulario-caso-titulo text-3xl font-extrabold text-navy">
          {nombreCaso} · {asignacion.postulacion.convocatoria.titulo}
        </h1>
      }
      headerEvaluacion={esGeneral ? "Comentario del caso" : "Comentarios por pregunta"}
      veredictosIniciales={veredictosIniciales}
      avisoEntrada={avisoEntradaEvaluador(asignacion.estado)}
      meta={
        <FichaCasoMeta
          participante={asignacion.postulacion.postulante.name}
          evaluador={asignacion.evaluador.name}
        />
      }
      caso={
        <>
          <ResumenCambiosReenvio preguntas={preguntasModificadas} />
          {asignacion.postulacion.convocatoria.formulario.preguntas.map((pregunta) => {
        const respuesta = asignacion.postulacion.respuestas.find((r) => r.preguntaId === pregunta.id);
        const modificada = idsModificadas.has(pregunta.id);
        return (
          <EvalDetalleCelda key={pregunta.id} panel="caso">
            <PreguntaCampo
              pregunta={pregunta}
              respuesta={respuesta}
              disabled
              modificada={modificada}
              acciones={
                respuesta?.versiones && respuesta.versiones.length > 0 ? (
                  <HistorialVersionesRespuesta
                    tipo={pregunta.tipo}
                    opciones={pregunta.opciones}
                    versiones={respuesta.versiones.map((version, index) => ({
                      id: version.id,
                      valor: version.valor,
                      archivos: version.archivos,
                      createdAt: version.createdAt.toISOString(),
                      numero: respuesta.versiones.length - index,
                    }))}
                    modificada={modificada}
                  />
                ) : null
              }
            />
          </EvalDetalleCelda>
        );
      })}
        </>
      }
      evaluacion={
        esGeneral ? (
          <EvalDetalleCelda panel="eval">
            <PanelHiloRevision
              audiencia="equipo"
              asignacion={hiloAsignacion}
              revisiones={asignacion.revisionesGenerales.map((item) => ({
                ...item,
                createdAt: item.createdAt.toISOString(),
              }))}
              supervisiones={asignacion.supervisionesGenerales.map((item) => ({
                ...item,
                createdAt: item.createdAt.toISOString(),
              }))}
              nombreEvaluador={asignacion.evaluador.name}
              nombreSupervisor={asignacion.postulacion.supervision?.supervisor.name}
              canEdit={canEdit}
              rolEditor={canEdit ? "evaluador" : null}
              notasPreguntas={notasParaEvaluacionGeneral(
                asignacion.postulacion.convocatoria.formulario.preguntas,
                asignacion.revisiones,
                ronda,
                ciclo,
              )}
              preguntasNotas={asignacion.postulacion.convocatoria.formulario.preguntas}
              revisionesNotas={asignacion.revisiones}
            />
          </EvalDetalleCelda>
        ) : (
          asignacion.postulacion.convocatoria.formulario.preguntas.map((pregunta) => {
            const escala = pregunta.conNotas ? parseEscalaNotas(pregunta.escalaNotas) : [];
            return (
              <EvalDetalleCelda key={pregunta.id} panel="eval">
                <PanelHiloRevision
                  audiencia="equipo"
                  asignacion={hiloAsignacion}
                  preguntaId={pregunta.id}
                  escala={escala}
                  revisiones={asignacion.revisiones
                    .filter((item) => item.preguntaId === pregunta.id)
                    .map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))}
                  supervisiones={asignacion.supervisionesPregunta
                    .filter((item) => item.preguntaId === pregunta.id)
                    .map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))}
                  nombreEvaluador={asignacion.evaluador.name}
                  nombreSupervisor={asignacion.postulacion.supervision?.supervisor.name}
                  canEdit={canEdit}
                  rolEditor={canEdit ? "evaluador" : null}
                  respuestaModificada={idsModificadas.has(pregunta.id)}
                />
              </EvalDetalleCelda>
            );
          })
        )
      }
    />
  );
}
