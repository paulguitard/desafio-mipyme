import { FormularioBuilder } from "@/components/formulario-builder";

export default function NuevoFormularioPage() {
  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <FormularioBuilder modo="nuevo" />
    </div>
  );
}
