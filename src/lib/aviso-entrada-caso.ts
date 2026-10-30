import { textoIntencionEvaluador } from "@/lib/intencion-evaluador";

export type AvisoEntradaCaso = {
  title: string;
  parrafos: string[];
  pasos?: string[];
  claseModal?: string;
};

/** Solo al entrar a otra ruta. Un envío cambia el texto del aviso, pero no es una visita nueva. */
export function reabrirAvisoEntrada(rutaActual: string, rutaVisitada: string) {
  return rutaActual !== rutaVisitada;
}

export function parrafosDescripcionMentoria(descripcion: string): string[] {
  const texto = descripcion.trim();
  if (!texto) return ["Esta asesoría no tiene descripción."];
  return [texto];
}

const EXTRA_HISTORIAL =
  "Si una pregunta dice Modificada, ábrela para ver qué cambió.";
const PANELES_EVALUACION =
  "En Caso ves las respuestas. En Evaluación y Supervisión ves los comentarios.";
const PANELES_PARTICIPANTE =
  "En Evaluación ves los comentarios. En Tu caso ves tu respuesta.";

export function avisoEntradaEvaluador(
  estado: string,
  opciones?: { publicaDirecto?: boolean },
): AvisoEntradaCaso {
  const publicaDirecto = Boolean(opciones?.publicaDirecto);
  const panelEval = publicaDirecto
    ? "En Caso ves las respuestas. En Evaluación escribes tu comentario."
    : PANELES_EVALUACION;

  if (estado === "EN_SUPERVISION" && !publicaDirecto) {
    return {
      title: "Esperando al supervisor",
      parrafos: [
        "El supervisor todavía no revisa esta evaluación. Puedes leer el caso, pero no editar hasta que responda.",
      ],
      pasos: [PANELES_EVALUACION, EXTRA_HISTORIAL],
    };
  }
  if (estado === "DEVUELTA_SUPERVISOR" && !publicaDirecto) {
    return {
      title: "El supervisor devolvió la evaluación",
      parrafos: [
        "Hay observaciones del supervisor. Revísalas y vuelve a enviar tu evaluación.",
      ],
      pasos: [
        "Léelas en Evaluación y Supervisión.",
        "Ajusta tu comentario y pulsa Pedir cambios al participante, o Finalizar evaluación si corresponde cerrar el caso.",
        EXTRA_HISTORIAL,
      ],
    };
  }
  if (estado === "CON_OBSERVACIONES") {
    return {
      title: "Esperando al participante",
      parrafos: [
        "El participante todavía no corrige. Puedes consultar el caso, pero no editar.",
      ],
      pasos: [
        panelEval,
        "Cuando reenvíe, lo que cambió dirá Modificada.",
      ],
    };
  }
  if (estado === "REPARADA") {
    return {
      title: "El participante ya corrigió",
      parrafos: ["Revisa qué cambió y actualiza tu evaluación."],
      pasos: [
        "En Caso, abre Modificada en las preguntas que cambiaron.",
        "Luego pulsa Pedir cambios al participante o Finalizar evaluación.",
      ],
    };
  }
  if (estado === "FINALIZADA") {
    return {
      title: "Evaluación finalizada",
      parrafos: ["Este caso está cerrado. Puedes consultarlo, pero ya no se edita."],
      pasos: [panelEval, EXTRA_HISTORIAL],
    };
  }
  return {
    title: "Revisar el caso",
    parrafos: ["Lee las respuestas y escribe tu evaluación."],
    pasos: [
      panelEval,
      publicaDirecto
        ? "Puedes usar Guardar borrador, Pedir cambios al participante y Finalizar evaluación. Tus comentarios llegan directo al participante."
        : "Puedes usar Guardar borrador, Pedir cambios al participante y Finalizar evaluación.",
      EXTRA_HISTORIAL,
    ],
  };
}

export function avisoEntradaSupervisor(
  estado: string,
  intencionPendiente?: string | null,
): AvisoEntradaCaso {
  if (estado === "EN_SUPERVISION") {
    const pidioFinalizar = intencionPendiente === "FINALIZAR";
    return {
      title: "Toca revisar esta evaluación",
      parrafos: [
        textoIntencionEvaluador(intencionPendiente),
        pidioFinalizar
          ? "Revisa el comentario y decide si apruebas el cierre o le pides cambios al evaluador."
          : "Revisa el comentario y decide si apruebas los cambios al participante o le pides correcciones al evaluador.",
      ],
      pasos: [
        PANELES_EVALUACION,
        "Aprobar aplica lo que eligió el evaluador. Pedir cambios al evaluador abre el campo para devolverle la evaluación.",
        EXTRA_HISTORIAL,
      ],
    };
  }
  if (estado === "DEVUELTA_SUPERVISOR") {
    return {
      title: "Esperando al evaluador",
      parrafos: [
        "Devolviste esta evaluación. El evaluador todavía no responde. Puedes consultar; podrás editar cuando vuelva a enviar.",
      ],
      pasos: [PANELES_EVALUACION],
    };
  }
  if (estado === "FINALIZADA") {
    return {
      title: "Supervisión cerrada",
      parrafos: [
        "Esta evaluación está cerrada. Puedes consultar el caso y los comentarios.",
      ],
      pasos: [PANELES_EVALUACION, EXTRA_HISTORIAL],
    };
  }
  return {
    title: "Consultar el caso",
    parrafos: [
      "Todavía no es tu turno. Puedes leer el caso y los comentarios, pero no editar.",
    ],
    pasos: [PANELES_EVALUACION, EXTRA_HISTORIAL],
  };
}

export function avisoEntradaParticipante(args: {
  estado: string;
  esCorreccion: boolean;
  canEdit: boolean;
  mentoriaAbierta: boolean;
  descripcionMentoria?: string;
  conEvaluacionVisible?: boolean;
  procesoTerminaAlEnviar?: boolean;
}): AvisoEntradaCaso {
  if (args.estado === "FINALIZADA") {
    return {
      title: "Tu caso fue aprobado",
      parrafos: [
        "¡Felicidades! Los evaluadores aprobaron tu caso. El equipo del desafío te avisará los siguientes pasos.",
      ],
      pasos: [PANELES_PARTICIPANTE, EXTRA_HISTORIAL],
    };
  }
  if (!args.mentoriaAbierta && !args.canEdit) {
    return {
      title: "Asesoría cerrada",
      parrafos: [
        "Esta asesoría ya no recibe cambios. Solo puedes consultar lo que enviaste.",
      ],
      pasos: args.conEvaluacionVisible
        ? [PANELES_PARTICIPANTE, EXTRA_HISTORIAL]
        : [EXTRA_HISTORIAL],
    };
  }
  if (args.esCorreccion) {
    return {
      title: "Hay observaciones para corregir",
      parrafos: [
        "El evaluador dejó comentarios. Revísalos y corrige tu caso.",
      ],
      pasos: [
        "En Evaluación lees qué cambiar. En Tu caso editas tu respuesta.",
        "Luego usa Guardar borrador o Enviar correcciones.",
        EXTRA_HISTORIAL,
      ],
    };
  }
  if (args.canEdit) {
    return {
      title: args.procesoTerminaAlEnviar ? "Completa la información" : "Completa tu caso",
      parrafos: parrafosDescripcionMentoria(args.descripcionMentoria ?? ""),
      claseModal: "modal-aviso-completa-caso",
    };
  }
  if (args.procesoTerminaAlEnviar) {
    return {
      title: "Información enviada",
      parrafos: ["Puedes consultarla, pero ya no puedes editarla."],
    };
  }
  if (args.conEvaluacionVisible) {
    return {
      title: args.estado === "REPARADA_POR_EL_EMPRENDEDOR"
        ? "Ya enviaste tus correcciones"
        : "Caso enviado",
      parrafos: [
        args.estado === "REPARADA_POR_EL_EMPRENDEDOR"
          ? "El evaluador las está revisando. Puedes consultar el caso y los comentarios, pero no editar hasta que haya nuevas observaciones."
          : "Tu caso ya está en evaluación. Si hay observaciones, podrás corregirlas desde aquí.",
      ],
      pasos: [PANELES_PARTICIPANTE, EXTRA_HISTORIAL],
    };
  }
  return {
    title: "Caso enviado",
    parrafos: [
      "Tu caso ya está en evaluación. Si hay observaciones, podrás corregirlas desde aquí.",
    ],
    pasos: [EXTRA_HISTORIAL],
  };
}
