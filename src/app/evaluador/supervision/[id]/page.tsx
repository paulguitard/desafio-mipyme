import { FormularioSupervision } from "@/components/formulario-supervision";
import { getDetalleFichaAdmin } from "@/lib/convocatoria-admin-data";
import { prisma } from "@/lib/db";
import {
  modoRevisionDeConvocatoria,
  publicaDirectoAlParticipante,
  supervisorActuaComoEvaluador,
  usaSupervisores,
} from "@/lib/modo-revision";
import { requireUser } from "@/lib/session";
import { notFound, redirect } from "next/navigation";

export default async function SupervisionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser("SUPERVISOR");
  const { id } = await params;
  const asignada = await prisma.asignacionSupervisor.findFirst({
    where: { postulacionId: id, supervisorId: user.id },
    select: {
      postulacionId: true,
      postulacion: {
        select: {
          convocatoria: {
            select: {
              tipo: true,
              evaluadoresHabilitados: true,
              supervisoresHabilitados: true,
            },
          },
          asignaciones: {
            where: { evaluadorId: user.id },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });
  if (!asignada) notFound();

  const modo = modoRevisionDeConvocatoria(asignada.postulacion.convocatoria);
  if (supervisorActuaComoEvaluador(modo)) {
    const evaluacionId = asignada.postulacion.asignaciones[0]?.id;
    if (evaluacionId) {
      redirect(`/evaluador/evaluaciones/${evaluacionId}`);
    }
    notFound();
  }
  if (!usaSupervisores(modo) || publicaDirectoAlParticipante(modo)) {
    notFound();
  }

  const detalle = await getDetalleFichaAdmin(id);
  if (!detalle) notFound();

  return <FormularioSupervision data={detalle} />;
}
