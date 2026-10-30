"use client";

import { FormularioBuilder } from "@/components/formulario-builder";
import type { RubricaVista } from "@/lib/rubrica";
import type { TipoFormulario } from "@/lib/tipo-formulario";

export function FormularioEditor({
  formulario,
  permitirEvaluacionPorPregunta,
}: {
  formulario: {
    id: string;
    titulo: string;
    tipo?: TipoFormulario;
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
    rubrica?: RubricaVista | null;
  };
  permitirEvaluacionPorPregunta: boolean;
}) {
  return (
    <FormularioBuilder
      modo="existente"
      tipo={formulario.tipo}
      formulario={formulario}
      permitirEvaluacionPorPregunta={permitirEvaluacionPorPregunta}
    />
  );
}
