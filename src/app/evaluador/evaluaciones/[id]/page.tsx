import { BotonAtras } from "@/components/boton-atras";
import { FormularioEvaluacion } from "@/components/formulario-evaluacion";
import { HistorialVersionesRespuesta } from "@/components/historial-versiones-respuesta";
import { PanelEvaluacionPregunta } from "@/components/panel-evaluacion-pregunta";
import { PanelObservacionGeneral, PanelSupervisionPendiente } from "@/components/panel-observacion-general";
import { PreguntaCampo } from "@/components/pregunta-campo";
import { prisma } from "@/lib/db";
import { evaluadorPuedeEditar } from "@/lib/estado";
import { parseModoEvaluacion } from "@/lib/modo-evaluacion";
import { etiquetaNombreCaso, extraerNombreCaso } from "@/lib/nombre-caso";
import { notasParaEvaluacionGeneral, parseEscalaNotas } from "@/lib/preguntas";
import { requireUser } from "@/lib/session";
import { historialSupervision } from "@/lib/supervision-ui";
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
      revisionesGenerales: { orderBy: [{ ronda: "asc" }, { createdAt: "asc" }] },
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
        },
      },
    },
  });
  if (!asignacion) notFound();

  const abierta = asignacion.postulacion.convocatoria.estado === "ABIERTA";
  const canEdit = abierta && evaluadorPuedeEditar(asignacion.estado);
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
  const revisionGeneralActual = asignacion.revisionesGenerales.find((item) => item.ronda === ronda);
  const supervisionGeneralActual = asignacion.supervisionesGenerales.find(
    (item) => item.ronda === ronda && item.ciclo === ciclo,
  );

  return (
    <FormularioEvaluacion
      asignacionId={asignacion.id}
      canEdit={canEdit}
      modoEvaluacion={modoEvaluacion}
      back={<BotonAtras href="/evaluador" />}
      title={
        <h1 className="text-3xl font-extrabold text-navy">
          {nombreCaso} · {asignacion.postulacion.convocatoria.titulo}
        </h1>
      }
      headerEvaluacion={esGeneral ? "Tu observación general" : "Tu revisión por pregunta"}
      headerSupervision={
        asignacion.postulacion.supervision
          ? `Revisión de ${asignacion.postulacion.supervision.supervisor.name}`
          : "Sin supervisor asignado"
      }
      meta={
        <div className="space-y-2">
          <p className="text-muted">Emprendedor: {asignacion.postulacion.postulante.name}</p>
          {!abierta ? (
            <p className="font-semibold text-danger">Convocatoria cerrada. Solo lectura.</p>
          ) : null}
          {asignacion.estado === "EN_SUPERVISION" ? (
            <p>Esperando que el supervisor revise esta evaluación.</p>
          ) : null}
          {asignacion.estado === "DEVUELTA_SUPERVISOR" ? (
            <p>El supervisor devolvió esta evaluación. Revisa sus observaciones y vuelve a enviar.</p>
          ) : null}
          {asignacion.estado === "CON_OBSERVACIONES" ? (
            <p>Esperando que el emprendedor corrija las observaciones de esta evaluación.</p>
          ) : null}
          {asignacion.estado === "REPARADA" ? (
            <p>El emprendedor ya corrigió. Revisa los cambios en el historial de cada pregunta.</p>
          ) : null}
        </div>
      }
      observacionGeneral={
        esGeneral ? (
          <PanelObservacionGeneral
            canEdit={canEdit}
            ronda={ronda}
            veredictoInicial={revisionGeneralActual?.veredicto}
            comentarioInicial={revisionGeneralActual?.comentario}
            notasPreguntas={notasParaEvaluacionGeneral(
              asignacion.postulacion.convocatoria.formulario.preguntas,
              asignacion.revisiones,
              ronda,
            )}
            historial={asignacion.revisionesGenerales.map((item) => ({
              id: item.id,
              ronda: item.ronda,
              veredicto: item.veredicto,
              comentario: item.comentario,
              createdAt: item.createdAt.toISOString(),
            }))}
          />
        ) : null
      }
      observacionGeneralSupervision={
        esGeneral ? (
          asignacion.supervisionesGenerales.length === 0 ? (
            <PanelSupervisionPendiente />
          ) : (
            <PanelObservacionGeneral
              canEdit={false}
              ronda={ciclo}
              tipo="supervision"
              namePrefix="sup-"
              veredictoInicial={supervisionGeneralActual?.veredicto}
              comentarioInicial={supervisionGeneralActual?.comentario}
              historial={historialSupervision(
                asignacion.supervisionesGenerales.map((item) => ({
                  ...item,
                  createdAt: item.createdAt.toISOString(),
                })),
              )}
            />
          )
        ) : null
      }
    >
      {asignacion.postulacion.convocatoria.formulario.preguntas.map((pregunta) => {
        const respuesta = asignacion.postulacion.respuestas.find((r) => r.preguntaId === pregunta.id);
        const actual = asignacion.revisiones.find(
          (r) => r.preguntaId === pregunta.id && r.ronda === ronda,
        );
        const historialRevisiones = asignacion.revisiones.filter((r) => r.preguntaId === pregunta.id);
        const escala = pregunta.conNotas ? parseEscalaNotas(pregunta.escalaNotas) : [];
        const supervisiones = asignacion.supervisionesPregunta.filter(
          (item) => item.preguntaId === pregunta.id,
        );
        const actualSup = supervisiones.find((item) => item.ronda === ronda && item.ciclo === ciclo);

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
              {esGeneral ? null : (
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
                    createdAt: item.createdAt.toISOString(),
                  }))}
                />
              )}
            </div>
            <div className="eval-detalle-cell is-sup">
              {esGeneral ? null : (
                <PanelEvaluacionPregunta
                  preguntaId={pregunta.id}
                  canEdit={false}
                  ronda={ciclo}
                  veredictoInicial={actualSup?.veredicto}
                  comentarioInicial={actualSup?.comentario}
                  escala={[]}
                  tipo="supervision"
                  namePrefix="sup-"
                  historial={historialSupervision(
                    supervisiones.map((item) => ({
                      ...item,
                      createdAt: item.createdAt.toISOString(),
                    })),
                  )}
                />
              )}
            </div>
          </article>
        );
      })}
    </FormularioEvaluacion>
  );
}
