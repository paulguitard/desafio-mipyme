import { FormularioSupervision } from "@/components/formulario-supervision";
import { getDetalleFichaAdmin } from "@/lib/convocatoria-admin-data";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { notFound } from "next/navigation";

export default async function SupervisionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser("SUPERVISOR");
  const { id } = await params;
  const asignada = await prisma.asignacionSupervisor.findFirst({
    where: { postulacionId: id, supervisorId: user.id },
    select: { postulacionId: true },
  });
  if (!asignada) notFound();

  const detalle = await getDetalleFichaAdmin(id);
  if (!detalle) notFound();

  return <FormularioSupervision data={detalle} />;
}
