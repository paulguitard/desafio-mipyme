import { BotonAtras } from "@/components/boton-atras";
import { ConvocatoriaEvaluacion } from "@/components/convocatoria-evaluacion";
import { prisma } from "@/lib/db";
import { formatoRangoFechas, parseImagenConvocatoria, parseImagenPosicion } from "@/lib/convocatoria";
import { getPanelEvaluacion } from "@/lib/convocatoria-admin-data";
import { directStoredImageUrl } from "@/lib/storage/image-url";
import { notFound } from "next/navigation";

export default async function MentoriaDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: pageRaw } = await searchParams;
  const page = Number(pageRaw ?? "1");
  const [mentoria, panel] = await Promise.all([
    prisma.convocatoria.findUnique({
      where: { id },
      include: { formulario: true },
    }),
    getPanelEvaluacion(id, page),
  ]);
  if (!mentoria || !panel) notFound();

  const imagen = parseImagenConvocatoria(mentoria.imagen);
  const imagenPos = parseImagenPosicion(mentoria.imagen);
  const rango = formatoRangoFechas(mentoria.fechaInicio, mentoria.fechaCierre);

  return (
    <div className="page-scroll h-full space-y-8 overflow-y-auto">
      <header className="flex flex-wrap items-start gap-5" data-tour="mentoria-ficha">
        {imagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={directStoredImageUrl(imagen)}
            alt=""
            className="h-28 w-28 rounded-2xl object-cover"
            style={{ objectPosition: `${imagenPos.x}% ${imagenPos.y}%` }}
          />
        ) : null}
        <div>
          <div className="flex items-center gap-2">
            <BotonAtras href="/admin/mentorias" />
            <h1 className="text-3xl font-extrabold text-navy">{mentoria.titulo}</h1>
          </div>
          <p className="text-muted">
            Formulario: {mentoria.formulario.titulo} · Estado: {mentoria.estado}
          </p>
          {rango ? <p className="text-muted">{rango}</p> : null}
          <p>{mentoria.descripcion}</p>
        </div>
      </header>

      <ConvocatoriaEvaluacion
        convocatoriaId={panel.id}
        estadoConvocatoria={panel.estado}
        tipo={panel.tipo}
        piezas={panel.piezas}
        evaluacionesPorPostulacion={panel.evaluacionesPorPostulacion}
        preguntas={panel.preguntas}
        pool={panel.pool}
        evaluadoresDisponibles={panel.evaluadoresDisponibles}
        poolSupervisores={panel.poolSupervisores}
        supervisoresDisponibles={panel.supervisoresDisponibles}
        postulaciones={panel.postulaciones}
        page={panel.page}
        pageSize={panel.pageSize}
        totalPostulaciones={panel.totalPostulaciones}
      />
    </div>
  );
}
