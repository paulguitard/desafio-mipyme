"use client";

import { FormularioBuilder } from "@/components/formulario-builder";

export function FormularioEditor({
  formulario,
  permitirEvaluacionPorPregunta,
}: {
  formulario: {
    id: string;
    titulo: string;
    modoEvaluacion: string;
    puedeCambiarModo: boolean;
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
  permitirEvaluacionPorPregunta: boolean;
}) {
  return (
    <FormularioBuilder
      modo="existente"
      formulario={formulario}
      permitirEvaluacionPorPregunta={permitirEvaluacionPorPregunta}
    />
  );
}
