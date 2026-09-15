import type { EstadoAsignacion, EstadoPostulacion } from "@/lib/estado";
import { ESTADO_ASIGNACION_LABEL, ESTADO_POSTULACION_LABEL } from "@/lib/estado";

const POSTULACION_CLASS: Record<EstadoPostulacion, string> = {
  BORRADOR: "bg-slate-100 text-navy",
  ENVIADA: "bg-navy-soft text-navy",
  EN_EVALUACION: "bg-amber-100 text-amber-950",
  CON_OBSERVACIONES: "bg-red/10 text-red",
  REPARADA_POR_EL_EMPRENDEDOR: "bg-violet-100 text-violet-950",
  FINALIZADA: "bg-emerald-100 text-emerald-900",
};

const ASIGNACION_CLASS: Record<EstadoAsignacion, string> = {
  PENDIENTE: "bg-slate-100 text-navy",
  EN_REVISION: "bg-amber-100 text-amber-950",
  CON_OBSERVACIONES: "bg-red/10 text-red",
  REPARADA: "bg-violet-100 text-violet-950",
  FINALIZADA: "bg-emerald-100 text-emerald-900",
};

export function BadgePostulacion({ estado }: { estado: string }) {
  const key = (
    estado === "REPARADA_POR_EL_POSTULANTE" ? "REPARADA_POR_EL_EMPRENDEDOR" : estado
  ) as EstadoPostulacion;
  const label = ESTADO_POSTULACION_LABEL[key] ?? estado;
  const cls = POSTULACION_CLASS[key] ?? "bg-slate-100";
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function BadgeAsignacion({ estado }: { estado: string }) {
  const key = estado as EstadoAsignacion;
  const label = ESTADO_ASIGNACION_LABEL[key] ?? estado;
  const cls = ASIGNACION_CLASS[key] ?? "bg-slate-100";
  return <span className={`badge ${cls}`}>{label}</span>;
}
