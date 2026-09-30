import { BotonAtras } from "@/components/boton-atras";
import { EvalDetalleCelda } from "@/components/eval-detalle-head";
import { FichaCasoMeta } from "@/components/ficha-caso-meta";
import { FormularioEvaluacion } from "@/components/formulario-evaluacion";
import { HistorialVersionesRespuesta } from "@/components/historial-versiones-respuesta";
import { PanelEvaluacionPregunta } from "@/components/panel-evaluacion-pregunta";
import { PanelObservacionGeneral, PanelSupervisionPendiente } from "@/components/panel-observacion-general";
import { PreguntaCampo } from "@/components/pregunta-campo";
import { prisma } from "@/lib/db";
import { evaluadorPuedeEditar } from "@/lib/estado";
import { avisoEntradaEvaluador } from "@/lib/aviso-entrada-caso";
import { parseModoEvaluacion } from "@/lib/modo-evaluacion";
import { etiquetaNombreCaso, extraerNombreCaso } from "@/lib/nombre-caso";
import { notasParaEvaluacionGeneral, parseEscalaNotas } from "@/lib/preguntas";
import { historialEvaluacion, revisionParaEditar } from "@/lib/revision-ciclo";
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
  const revisionGeneralActual = revisionParaEditar(asignacion.revisionesGenerales, ronda, ciclo);
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
        <h1 className="formulario-caso-titulo text-3xl font-extrabold text-navy">
          {nombreCaso} · {asignacion.postulacion.convocatoria.titulo}
        </h1>
      }
      headerEvaluacion={esGeneral ? "Tu revisión de la respuesta" : "Tu revisión por pregunta"}
      headerSupervision={
        asignacion.postulacion.supervision
          ? `Revisión de ${asignacion.postulacion.supervision.supervisor.name}`
          : "Sin supervisor asignado"
      }
      avisoEntrada={avisoEntradaEvaluador(asignacion.estado)}
      meta={
        <FichaCasoMeta
          participante={asignacion.postulacion.postulante.name}
          evaluador={asignacion.evaluador.name}
        />
      }
      caso={asignacion.postulacion.convocatoria.formulario.preguntas.map((pregunta) => {
        const respuesta = asignacion.postulacion.respuestas.find((r) => r.preguntaId === pregunta.id);
        return (
          <EvalDetalleCelda key={pregunta.id} panel="caso">
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
          </EvalDetalleCelda>
        );
      })}
      evaluacion={
        esGeneral ? (
          <EvalDetalleCelda panel="eval">
            <PanelObservacionGeneral
              canEdit={canEdit}
              ronda={ronda}
              cicloActual={ciclo}
              veredictoInicial={revisionGeneralActual?.veredicto}
              comentarioInicial={revisionGeneralActual?.comentario}
              notasPreguntas={notasParaEvaluacionGeneral(
                asignacion.postulacion.convocatoria.formulario.preguntas,
                asignacion.revisiones,
                ronda,
                ciclo,
              )}
              nombreResponsable={asignacion.evaluador.name}
              historial={historialEvaluacion(
                asignacion.revisionesGenerales.map((item) => ({
                  ...item,
                  createdAt: item.createdAt.toISOString(),
                })),
              )}
            />
          </EvalDetalleCelda>
        ) : (
          asignacion.postulacion.convocatoria.formulario.preguntas.map((pregunta) => {
            const actual = revisionParaEditar(
              asignacion.revisiones.filter((r) => r.preguntaId === pregunta.id),
              ronda,
              ciclo,
            );
            const historialRevisiones = asignacion.revisiones.filter((r) => r.preguntaId === pregunta.id);
            const escala = pregunta.conNotas ? parseEscalaNotas(pregunta.escalaNotas) : [];
            return (
              <EvalDetalleCelda key={pregunta.id} panel="eval">
                <PanelEvaluacionPregunta
                  preguntaId={pregunta.id}
                  canEdit={canEdit}
                  ronda={ronda}
                  cicloActual={ciclo}
                  veredictoInicial={actual?.veredicto}
                  comentarioInicial={actual?.comentario}
                  notaInicial={actual?.nota}
                  escala={escala}
                  nombreResponsable={asignacion.evaluador.name}
                  historial={historialEvaluacion(
                    historialRevisiones.map((item) => ({
                      ...item,
                      createdAt: item.createdAt.toISOString(),
                    })),
                  )}
                />
              </EvalDetalleCelda>
            );
          })
        )
      }
      supervision={
        esGeneral ? (
          <EvalDetalleCelda panel="sup">
            {asignacion.supervisionesGenerales.length === 0 ? (
              <PanelSupervisionPendiente />
            ) : (
              <PanelObservacionGeneral
                canEdit={false}
                ronda={ciclo}
                tipo="supervision"
                namePrefix="sup-"
                nombreResponsable={asignacion.postulacion.supervision?.supervisor.name}
                veredictoInicial={supervisionGeneralActual?.veredicto}
                comentarioInicial={supervisionGeneralActual?.comentario}
                historial={historialSupervision(
                  asignacion.supervisionesGenerales.map((item) => ({
                    ...item,
                    createdAt: item.createdAt.toISOString(),
                  })),
                )}
              />
            )}
          </EvalDetalleCelda>
        ) : (
          asignacion.postulacion.convocatoria.formulario.preguntas.map((pregunta) => {
            const supervisiones = asignacion.supervisionesPregunta.filter(
              (item) => item.preguntaId === pregunta.id,
            );
            const actualSup = supervisiones.find((item) => item.ronda === ronda && item.ciclo === ciclo);
            return (
              <EvalDetalleCelda key={pregunta.id} panel="sup">
                <PanelEvaluacionPregunta
                  preguntaId={pregunta.id}
                  canEdit={false}
                  ronda={ciclo}
                  veredictoInicial={actualSup?.veredicto}
                  comentarioInicial={actualSup?.comentario}
                  escala={[]}
                  tipo="supervision"
                  namePrefix="sup-"
                  nombreResponsable={asignacion.postulacion.supervision?.supervisor.name}
                  historial={historialSupervision(
                    supervisiones.map((item) => ({
                      ...item,
                      createdAt: item.createdAt.toISOString(),
                    })),
                  )}
                />
              </EvalDetalleCelda>
            );
          })
        )
      }
    />
  );
}
