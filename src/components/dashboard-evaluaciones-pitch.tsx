"use client";

import { useMemo, useState } from "react";
import { DashboardDetalleEvaluacionesPitch } from "@/components/dashboard-detalle-evaluaciones-pitch";
import { DashboardTablaEvaluacionesPitch } from "@/components/dashboard-tabla-evaluaciones-pitch";
import type { EvaluacionesPitchPayload } from "@/lib/dashboard-evaluaciones-pitch";

export function DashboardEvaluacionesPitch({ data }: { data: EvaluacionesPitchPayload }) {
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const caso = useMemo(
    () => data.casos.find((item) => item.postulacionId === seleccionadoId) ?? null,
    [data.casos, seleccionadoId],
  );

  return (
    <main className="dashboard-pitch-main grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 md:grid-cols-[minmax(0,32%)_minmax(0,68%)] md:p-4">
      <DashboardDetalleEvaluacionesPitch caso={caso} criterios={data.criterios} />
      <DashboardTablaEvaluacionesPitch
        criterios={data.criterios}
        casos={data.casos}
        seleccionadoId={seleccionadoId}
        onVerDetalles={setSeleccionadoId}
      />
    </main>
  );
}
