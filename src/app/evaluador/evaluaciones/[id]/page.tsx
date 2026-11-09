import { BotonAtras } from "@/components/boton-atras";
import { FichaEvaluacionVista } from "@/components/ficha-evaluacion-vista";
import { cargarFichaEvaluacion } from "@/lib/cargar-ficha-evaluacion";
import { evaluadorPuedeEditar } from "@/lib/estado";
import {
  modoRevisionDeConvocatoria,
  supervisorActuaComoEvaluador,
  usaEvaluadores,
} from "@/lib/modo-revision";
import { requireUser } from "@/lib/session";
import { notFound } from "next/navigation";

export default async function EvaluacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser("EVALUADOR");
  const { id } = await params;
  const asignacion = await cargarFichaEvaluacion({ asignacionId: id, evaluadorId: user.id });
  if (!asignacion) notFound();

  const modo = modoRevisionDeConvocatoria(asignacion.postulacion.convocatoria);
  const puedeVer =
    (user.role === "EVALUADOR" && usaEvaluadores(modo)) ||
    (user.role === "SUPERVISOR" && supervisorActuaComoEvaluador(modo));
  if (!puedeVer) notFound();

  return (
    <FichaEvaluacionVista
      asignacion={asignacion}
      canEdit={evaluadorPuedeEditar(asignacion.estado)}
      rolAccion="evaluador"
      back={<BotonAtras href="/evaluador" />}
    />
  );
}
