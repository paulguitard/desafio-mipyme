import { BotonAtras } from "@/components/boton-atras";
import { FormularioEvaluacion } from "@/components/formulario-evaluacion";
import { HistorialVersionesRespuesta } from "@/components/historial-versiones-respuesta";
import { PanelEvaluacionPregunta } from "@/components/panel-evaluacion-pregunta";
import { PreguntaCampo } from "@/components/pregunta-campo";
import { prisma } from "@/lib/db";
import { etiquetaNombreCaso, extraerNombreCaso } from "@/lib/nombre-caso";
import { parseEscalaNotas } from "@/lib/preguntas";
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
      revisiones: { orderBy: [{ ronda: "asc" }, { createdAt: "asc" }] },
      postulacion: {
        include: {
          postulante: true,
          convocatoria: {
            include: { formulario: { include: { preguntas: { orderBy: { orden: "asc" } } } } },
          },
          respuestas: {
            include: { versiones: { orderBy: { createdAt: "desc" } } },
          },
        },
      },
    },
  });
  if (!asignacion) notFound();

  const abierta = asignacion.postulacion.convocatoria.estado === "ABIERTA";
  const canEdit =
    abierta &&
    asignacion.estado !== "FINALIZADA" &&
    asignacion.estado !== "CON_OBSERVACIONES";
  const ronda = asignacion.rondaActual;
  const nombreCaso = etiquetaNombreCaso(
    extraerNombreCaso(
      asignacion.postulacion.convocatoria.formulario.preguntas,
      asignacion.postulacion.respuestas,
    ),
  );

  return (
    <FormularioEvaluacion
      asignacionId={asignacion.id}
      canEdit={canEdit}
      back={<BotonAtras href="/evaluador" />}
      title={
        <h1 className="text-3xl font-extrabold text-navy">
          {nombreCaso} · {asignacion.postulacion.convocatoria.titulo}
        </h1>
      }
      meta={
        <div className="space-y-2">
          <p className="text-muted">Emprendedor: {asignacion.postulacion.postulante.name}</p>
          {!abierta ? (
            <p className="font-semibold text-danger">Convocatoria cerrada. Solo lectura.</p>
          ) : null}
          {asignacion.estado === "CON_OBSERVACIONES" ? (
            <p>Esperando que el emprendedor corrija las observaciones de esta evaluación.</p>
          ) : null}
          {asignacion.estado === "REPARADA" ? (
            <p>El emprendedor ya corrigió. Revisa los cambios en el historial de cada pregunta.</p>
          ) : null}
        </div>
      }
    >
      {asignacion.postulacion.convocatoria.formulario.preguntas.map((pregunta) => {
        const respuesta = asignacion.postulacion.respuestas.find((r) => r.preguntaId === pregunta.id);
        const actual = asignacion.revisiones.find(
          (r) => r.preguntaId === pregunta.id && r.ronda === ronda,
        );
        const historialRevisiones = asignacion.revisiones.filter((r) => r.preguntaId === pregunta.id);
        const escala = pregunta.conNotas ? parseEscalaNotas(pregunta.escalaNotas) : [];

        return (
          <article key={pregunta.id} className="eval-detalle-row">
            <div className="eval-detalle-cell is-caso">
              <PreguntaCampo
                pregunta={pregunta}
                respuesta={respuesta}
                disabled
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
                    />
                  ) : null
                }
              />
            </div>
            <div className="eval-detalle-cell is-eval">
              <PanelEvaluacionPregunta
                preguntaId={pregunta.id}
                canEdit={canEdit}
                ronda={ronda}
                veredictoInicial={actual?.veredicto}
                comentarioInicial={actual?.comentario}
                notaInicial={actual?.nota}
                escala={escala}
                historial={historialRevisiones.map((item) => ({
                  id: item.id,
                  ronda: item.ronda,
                  veredicto: item.veredicto,
                  comentario: item.comentario,
                  nota: item.nota,
                }))}
              />
            </div>
          </article>
        );
      })}
    </FormularioEvaluacion>
  );
}
