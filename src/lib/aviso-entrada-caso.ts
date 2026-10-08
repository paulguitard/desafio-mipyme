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

export function avisoEntradaEvaluador(estado: string): AvisoEntradaCaso {
  if (estado === "EN_SUPERVISION") {
    return {
      title: "Esperando al supervisor",
      parrafos: [
        "El supervisor todavía no revisa esta evaluación. Puedes leer el caso, pero no editar hasta que responda.",
      ],
      pasos: [PANELES_EVALUACION, EXTRA_HISTORIAL],
    };
  }
  if (estado === "DEVUELTA_SUPERVISOR") {
    return {
      title: "El supervisor devolvió la evaluación",
      parrafos: [
        "Hay observaciones del supervisor. Revísalas y vuelve a enviar tu evaluación.",
      ],
      pasos: [
        "Léelas en Evaluación y Supervisión.",
        "Ajusta tu evaluación y pulsa Enviar a supervisor, o Finalizar evaluación si ya no hay nada que corregir.",
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
        PANELES_EVALUACION,
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
        "Luego pulsa Enviar a supervisor o Finalizar evaluación.",
      ],
    };
  }
  if (estado === "FINALIZADA") {
    return {
      title: "Evaluación finalizada",
      parrafos: ["Este caso está cerrado. Puedes consultarlo, pero ya no se edita."],
      pasos: [PANELES_EVALUACION, EXTRA_HISTORIAL],
    };
  }
  return {
    title: "Revisar el caso",
    parrafos: ["Lee las respuestas y escribe tu evaluación."],
    pasos: [
      "En Caso lees las respuestas. En Evaluación y Supervisión escribes tu comentario.",
      "Puedes usar Guardar revisión, Enviar a supervisor y Finalizar evaluación.",
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
        pidioFinalizar
          ? "El evaluador pidió cerrar el caso. Revisa y decide si cierra o si hay que corregir."
          : "El evaluador envió observaciones para el participante. Revisa y decide si proceden.",
      ],
      pasos: [
        PANELES_EVALUACION,
        pidioFinalizar
          ? "Proceder cierra la evaluación. Enviar observaciones la devuelve al evaluador."
          : "Proceder las aprueba y llegan al participante. Enviar observaciones las devuelve al evaluador.",
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
      title: "Completa tu caso",
      parrafos: parrafosDescripcionMentoria(args.descripcionMentoria ?? ""),
      claseModal: "modal-aviso-completa-caso",
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
