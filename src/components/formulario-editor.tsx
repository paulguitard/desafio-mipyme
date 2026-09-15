"use client";

import { FormularioBuilder } from "@/components/formulario-builder";

export function FormularioEditor({
  formulario,
}: {
  formulario: {
    id: string;
    titulo: string;
    descripcion: string;
    preguntas: {
      id: string;
      enunciado: string;
      ayuda: string;
      tipo: string;
      opciones: string;
      obligatoria: boolean;
      permiteArchivo: boolean;
      permiteImagen: boolean;
      permiteVideoLink: boolean;
      conNotas: boolean;
      escalaNotas: string;
    }[];
  };
}) {
  return <FormularioBuilder modo="existente" formulario={formulario} />;
}
