import { FormularioBuilder } from "@/components/formulario-builder";
import { leerConfigApp } from "@/lib/config-app";

export default async function NuevoFormularioPage() {
  const { permitirEvaluacionPorPregunta } = await leerConfigApp();
  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <FormularioBuilder
        modo="nuevo"
        permitirEvaluacionPorPregunta={permitirEvaluacionPorPregunta}
      />
    </div>
  );
}
