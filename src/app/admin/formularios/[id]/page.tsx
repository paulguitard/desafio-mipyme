import { FormularioEditor } from "@/components/formulario-editor";
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
  const formulario = await prisma.formulario.findUnique({
    where: { id },
    include: { preguntas: { orderBy: { orden: "asc" } } },
  });
  if (!formulario) notFound();
  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <FormularioEditor formulario={formulario} />
    </div>
  );
}
