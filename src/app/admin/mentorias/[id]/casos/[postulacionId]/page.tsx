import { BotonAtras } from "@/components/boton-atras";
import { FormularioCasoAdmin } from "@/components/formulario-caso-admin";
import { PreguntaCampo } from "@/components/pregunta-campo";
import { prisma } from "@/lib/db";
import { etiquetaNombreCaso, extraerNombreCaso } from "@/lib/nombre-caso";
import { esMentoriaContenido } from "@/lib/tipo-formulario";
import { requireUser } from "@/lib/session";
import { notFound } from "next/navigation";

export default async function EditarCasoAdminPage({
  params,
}: {
  params: Promise<{ id: string; postulacionId: string }>;
}) {
  await requireUser("ADMIN");
  const { id: convocatoriaId, postulacionId } = await params;

  const postulacion = await prisma.postulacion.findUnique({
    where: { id: postulacionId },
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
      respuestas: true,
      postulante: { select: { name: true } },
    },
  });

  if (!postulacion || postulacion.convocatoriaId !== convocatoriaId) notFound();
  if (esMentoriaContenido(postulacion.convocatoria.tipo)) notFound();

  const nombreCaso = etiquetaNombreCaso(
    postulacion.nombreCaso ||
      extraerNombreCaso(postulacion.convocatoria.formulario.preguntas, postulacion.respuestas),
  );

  return (
    <FormularioCasoAdmin
      postulacionId={postulacion.id}
      back={<BotonAtras href={`/admin/mentorias?panel=${convocatoriaId}`} />}
      title={
        <h1 className="formulario-caso-titulo text-3xl font-extrabold text-navy">
          {nombreCaso} · {postulacion.postulante.name}
        </h1>
      }
    >
      {postulacion.convocatoria.formulario.preguntas.map((pregunta) => {
        const respuesta = postulacion.respuestas.find((item) => item.preguntaId === pregunta.id);
        return <PreguntaCampo key={pregunta.id} pregunta={pregunta} respuesta={respuesta} />;
      })}
    </FormularioCasoAdmin>
  );
}
