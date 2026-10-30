import { FormularioContenidoBuilder } from "@/components/formulario-contenido-builder";
import { FormularioEditor } from "@/components/formulario-editor";
import { leerConfigApp } from "@/lib/config-app";
import { prisma } from "@/lib/db";
import { asegurarPreguntaNombreCaso } from "@/lib/nombre-caso";
import { mapearRubricaFila } from "@/lib/rubrica";
import { esMentoriaContenido, parseTipoFormulario } from "@/lib/tipo-formulario";
import { notFound } from "next/navigation";

export default async function FormularioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const previo = await prisma.formulario.findUnique({
    where: { id },
    select: { tipo: true },
  });
  if (!previo) notFound();

  if (esMentoriaContenido(previo.tipo)) {
    const formulario = await prisma.formulario.findUnique({
      where: { id },
      include: {
        piezasContenido: {
          orderBy: { orden: "asc" },
          include: { medios: { orderBy: { orden: "asc" } } },
        },
      },
    });
    if (!formulario) notFound();
    return (
      <div className="relative h-full min-h-0 overflow-hidden">
        <FormularioContenidoBuilder
          modo="existente"
          formulario={{
            id: formulario.id,
            titulo: formulario.titulo,
            piezas: formulario.piezasContenido,
          }}
        />
      </div>
    );
  }

  await asegurarPreguntaNombreCaso(id);
  const [formulario, configApp] = await Promise.all([
    prisma.formulario.findUnique({
      where: { id },
      include: {
        preguntas: { orderBy: { orden: "asc" } },
        rubrica: { include: { criterios: { orderBy: { orden: "asc" } } } },
        _count: { select: { convocatorias: true } },
      },
    }),
    leerConfigApp(),
  ]);
  if (!formulario) notFound();
  const estructuraBloqueada = Boolean(
    formulario.rubrica &&
      (await prisma.revisionCriterio.count({
        where: { criterio: { rubricaId: formulario.rubrica.id } },
      })) > 0,
  );
  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <FormularioEditor
        permitirEvaluacionPorPregunta={configApp.permitirEvaluacionPorPregunta}
        formulario={{
          ...formulario,
          tipo: parseTipoFormulario(formulario.tipo),
          puedeCambiarModo: formulario._count.convocatorias === 0,
          rubrica: mapearRubricaFila(formulario.rubrica, estructuraBloqueada),
        }}
      />
    </div>
  );
}
