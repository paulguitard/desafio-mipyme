import { BotonAtras } from "@/components/boton-atras";
import { ConvocatoriaEvaluacion } from "@/components/convocatoria-evaluacion";
import { prisma } from "@/lib/db";
import { formatoRangoFechas, parseImagenConvocatoria } from "@/lib/convocatoria";
import { getPanelEvaluacion } from "@/lib/convocatoria-admin-data";
import { publicUploadUrl } from "@/lib/preguntas";
import { notFound } from "next/navigation";

export default async function ConvocatoriaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [convocatoria, panel] = await Promise.all([
    prisma.convocatoria.findUnique({
      where: { id },
      include: { formulario: true },
    }),
    getPanelEvaluacion(id),
  ]);
  if (!convocatoria || !panel) notFound();

  const imagen = parseImagenConvocatoria(convocatoria.imagen);
  const rango = formatoRangoFechas(convocatoria.fechaInicio, convocatoria.fechaCierre);

  return (
    <div className="page-scroll h-full space-y-8 overflow-y-auto">
      <header className="flex flex-wrap items-start gap-5">
        {imagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publicUploadUrl(imagen)}
            alt=""
            className="h-28 w-28 rounded-2xl object-cover"
          />
        ) : null}
        <div>
          <div className="flex items-center gap-2">
            <BotonAtras href="/admin/convocatorias" />
            <h1 className="text-3xl font-extrabold text-navy">{convocatoria.titulo}</h1>
          </div>
          <p className="text-muted">
            Formulario: {convocatoria.formulario.titulo} · Estado: {convocatoria.estado}
          </p>
          {rango ? <p className="text-muted">{rango}</p> : null}
          <p>{convocatoria.descripcion}</p>
        </div>
      </header>

      <ConvocatoriaEvaluacion
        convocatoriaId={panel.id}
        estadoConvocatoria={panel.estado}
        evaluacionesPorPostulacion={panel.evaluacionesPorPostulacion}
        preguntas={panel.preguntas}
        pool={panel.pool}
        evaluadoresDisponibles={panel.evaluadoresDisponibles}
        postulaciones={panel.postulaciones}
      />
    </div>
  );
}
