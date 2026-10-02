import type { EstadoAsignacion, EstadoPostulacion } from "@/lib/estado";
import { ESTADO_ASIGNACION_LABEL, ESTADO_POSTULACION_LABEL, ESTADO_POSTULACION_LABEL_CORTO } from "@/lib/estado";
import { etiquetaAvanceContenido, porcentajeVistoContenido } from "@/lib/contenido";

const POSTULACION_CLASS: Record<EstadoPostulacion, string> = {
  BORRADOR: "bg-slate-100 text-navy",
  ENVIADA: "bg-emerald-100 text-emerald-900",
  EN_EVALUACION: "bg-amber-100 text-amber-950",
  CON_OBSERVACIONES: "bg-red/10 text-red",
  REPARADA_POR_EL_EMPRENDEDOR: "bg-violet-100 text-violet-950",
  FINALIZADA: "bg-emerald-100 text-emerald-900",
};

const ASIGNACION_LABEL_CORTO: Record<EstadoAsignacion, string> = {
  PENDIENTE: "Pendiente",
  EN_REVISION: "Revisión",
  EN_SUPERVISION: "Supervisión",
  DEVUELTA_SUPERVISOR: "Devuelta",
  CON_OBSERVACIONES: "Respuesta",
  REPARADA: "Reparada",
  FINALIZADA: "Finalizada",
};

const ASIGNACION_CLASS: Record<EstadoAsignacion, string> = {
  PENDIENTE: "bg-slate-100 text-navy",
  EN_REVISION: "bg-amber-100 text-amber-950",
  EN_SUPERVISION: "bg-sky-100 text-sky-950",
  DEVUELTA_SUPERVISOR: "bg-orange-100 text-orange-950",
  CON_OBSERVACIONES: "bg-red/10 text-red",
  REPARADA: "bg-violet-100 text-violet-950",
  FINALIZADA: "bg-emerald-100 text-emerald-900",
};

export function BadgeAvanceContenido({
  vistas,
  total,
  cortoMovil = false,
}: {
  vistas: number;
  total: number;
  cortoMovil?: boolean;
}) {
  const pct = porcentajeVistoContenido(vistas, total);
  const label = etiquetaAvanceContenido(vistas, total);
  const cls =
    pct >= 100 ? "bg-emerald-100 text-emerald-900" : pct > 0 ? "bg-sky-100 text-sky-950" : "bg-slate-100 text-navy";
  if (!cortoMovil) {
    return <span className={`badge ${cls}`}>{label}</span>;
  }
  return (
    <span className={`badge ${cls}`}>
      <span className="badge-texto-largo">{label}</span>
      <span className="badge-texto-corto">{label}</span>
    </span>
  );
}

export function BadgePostulacion({
  estado,
  cortoMovil = false,
}: {
  estado: string;
  cortoMovil?: boolean;
}) {
  const key = (
    estado === "REPARADA_POR_EL_POSTULANTE" ? "REPARADA_POR_EL_EMPRENDEDOR" : estado
  ) as EstadoPostulacion;
  const label = ESTADO_POSTULACION_LABEL[key] ?? estado;
  const cls = POSTULACION_CLASS[key] ?? "bg-slate-100";
  if (!cortoMovil) {
    return <span className={`badge ${cls}`}>{label}</span>;
  }
  const corto = ESTADO_POSTULACION_LABEL_CORTO[key] ?? label;
  return (
    <span className={`badge ${cls}`}>
      <span className="badge-texto-largo">{label}</span>
      <span className="badge-texto-corto">{corto}</span>
    </span>
  );
}

export function BadgeAsignacion({
  estado,
  etiqueta,
  cortoMovil = false,
}: {
  estado: string;
  etiqueta?: string;
  cortoMovil?: boolean;
}) {
  const key = estado as EstadoAsignacion;
  const label = etiqueta ?? ESTADO_ASIGNACION_LABEL[key] ?? estado;
  const cls = ASIGNACION_CLASS[key] ?? "bg-slate-100";
  if (!cortoMovil) {
    return <span className={`badge ${cls}`}>{label}</span>;
  }
  const corto = ASIGNACION_LABEL_CORTO[key] ?? label;
  return (
    <span className={`badge ${cls}`}>
      <span className="badge-texto-largo">{label}</span>
      <span className="badge-texto-corto">{corto}</span>
    </span>
  );
}
