import { FormularioEditor } from "@/components/formulario-editor";
import { leerConfigApp } from "@/lib/config-app";
import { prisma } from "@/lib/db";
import { asegurarPreguntaNombreCaso } from "@/lib/nombre-caso";
import { notFound } from "next/navigation";

export default async function FormularioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await asegurarPreguntaNombreCaso(id);
  const [formulario, configApp] = await Promise.all([
    prisma.formulario.findUnique({
      where: { id },
      include: {
        preguntas: { orderBy: { orden: "asc" } },
        _count: { select: { convocatorias: true } },
      },
    }),
    leerConfigApp(),
  ]);
  if (!formulario) notFound();
  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <FormularioEditor
        permitirEvaluacionPorPregunta={configApp.permitirEvaluacionPorPregunta}
        formulario={{
          ...formulario,
          puedeCambiarModo: formulario._count.convocatorias === 0,
        }}
      />
    </div>
  );
}
