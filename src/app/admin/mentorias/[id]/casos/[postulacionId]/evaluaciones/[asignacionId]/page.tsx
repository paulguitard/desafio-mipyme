import { BotonAtras } from "@/components/boton-atras";
import { FichaEvaluacionVista } from "@/components/ficha-evaluacion-vista";
import { cargarFichaEvaluacion } from "@/lib/cargar-ficha-evaluacion";
import { requireUser } from "@/lib/session";
import { notFound } from "next/navigation";

export default async function EditarEvaluacionAdminPage({
  params,
}: {
  params: Promise<{ id: string; postulacionId: string; asignacionId: string }>;
}) {
  await requireUser("ADMIN");
  const { id: convocatoriaId, postulacionId, asignacionId } = await params;
  const asignacion = await cargarFichaEvaluacion({
    asignacionId,
    postulacionId,
    convocatoriaId,
  });
  if (!asignacion) notFound();

  return (
    <FichaEvaluacionVista
      asignacion={asignacion}
      canEdit
      rolAccion="admin"
      back={<BotonAtras href={`/admin/mentorias?panel=${convocatoriaId}`} />}
    />
  );
}
