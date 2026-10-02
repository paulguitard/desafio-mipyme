export type AvisoEntradaCaso = {
  title: string;
  parrafos: string[];
  claseModal?: string;
};

export function parrafosDescripcionMentoria(descripcion: string): string[] {
  const texto = descripcion.trim();
  if (!texto) return ["Esta mentoría no tiene descripción."];
  return [texto];
}

const EXTRA_HISTORIAL =
  "En cada pregunta, Versiones abre el historial de cambios de la respuesta.";
const EXTRA_PESTANAS =
  "Usa las pestañas Caso, Evaluación y Supervisión para pasar de las respuestas a los comentarios.";

export function avisoEntradaEvaluador(estado: string): AvisoEntradaCaso {
  if (estado === "EN_SUPERVISION") {
    return {
      title: "Esperando al supervisor",
      parrafos: [
        "Esperando que el supervisor revise esta evaluación.",
        "Puedes consultar el caso, pero no editarás hasta que el supervisor responda.",
        EXTRA_PESTANAS,
        EXTRA_HISTORIAL,
      ],
    };
  }
  if (estado === "DEVUELTA_SUPERVISOR") {
    return {
      title: "El supervisor devolvió la evaluación",
      parrafos: [
        "El supervisor devolvió esta evaluación. Revisa sus observaciones y vuelve a enviar.",
        "Los comentarios están en la pestaña Supervisión. Ajusta tu revisión y envía de nuevo.",
        EXTRA_HISTORIAL,
      ],
    };
  }
  if (estado === "CON_OBSERVACIONES") {
    return {
      title: "Esperando al participante",
      parrafos: [
        "Esperando que el participante corrija las observaciones de esta evaluación.",
        "Cuando reenvíe, verás los cambios en el historial de cada pregunta.",
        EXTRA_PESTANAS,
      ],
    };
  }
  if (estado === "REPARADA") {
    return {
      title: "El participante ya corrigió",
      parrafos: [
        "El participante ya corrigió. Revisa los cambios en el historial de cada pregunta.",
        "Compara las versiones, actualiza tu revisión y envía al supervisor o finaliza si corresponde.",
        EXTRA_PESTANAS,
      ],
    };
  }
  if (estado === "FINALIZADA") {
    return {
      title: "Evaluación finalizada",
      parrafos: [
        "Esta evaluación está cerrada. Puedes consultar el caso y el historial, pero ya no se edita.",
        EXTRA_PESTANAS,
        EXTRA_HISTORIAL,
      ],
    };
  }
  return {
    title: "Revisar el caso",
    parrafos: [
      "Revisa las respuestas del participante y deja tu evaluación.",
      "Puedes guardar un borrador, enviar al supervisor o pedir finalizar.",
      EXTRA_PESTANAS,
      EXTRA_HISTORIAL,
    ],
  };
}

export function avisoEntradaSupervisor(
  estado: string,
  intencionPendiente?: string | null,
): AvisoEntradaCaso {
  if (estado === "EN_SUPERVISION") {
    return {
      title: "Toca revisar esta evaluación",
      parrafos: [
        intencionPendiente === "FINALIZAR"
          ? "El evaluador pidió finalizar. Revisa y procede o devuelve observaciones."
          : "El evaluador envió observaciones. Revisa y procede o devuelve observaciones.",
        "Proceder confirma lo enviado. Enviar observaciones las devuelve al evaluador.",
        EXTRA_PESTANAS,
        EXTRA_HISTORIAL,
      ],
    };
  }
  if (estado === "DEVUELTA_SUPERVISOR") {
    return {
      title: "Esperando al evaluador",
      parrafos: [
        "Esperando que el evaluador corrija según tu última supervisión.",
        "Puedes consultar el caso y el historial; la edición se habilita cuando vuelva a enviar.",
        EXTRA_PESTANAS,
      ],
    };
  }
  if (estado === "FINALIZADA") {
    return {
      title: "Supervisión cerrada",
      parrafos: [
        "Esta evaluación está finalizada. Puedes consultar el caso y el historial.",
        EXTRA_PESTANAS,
        EXTRA_HISTORIAL,
      ],
    };
  }
  return {
    title: "Consultar el caso",
    parrafos: [
      "Esta evaluación aún no está en tu turno de supervisión. Puedes consultar el caso y el historial.",
      EXTRA_PESTANAS,
      EXTRA_HISTORIAL,
    ],
  };
}

export function avisoEntradaParticipante(args: {
  estado: string;
  esCorreccion: boolean;
  canEdit: boolean;
  mentoriaAbierta: boolean;
  descripcionMentoria?: string;
}): AvisoEntradaCaso {
  if (!args.mentoriaAbierta && !args.canEdit) {
    return {
      title: "Mentoría cerrada",
      parrafos: [
        "La mentoría está cerrada. Solo puedes consultar.",
        EXTRA_HISTORIAL,
      ],
    };
  }
  if (args.esCorreccion) {
    return {
      title: "Hay observaciones para corregir",
      parrafos: [
        "El evaluador dejó observaciones. Revisa los comentarios y corrige lo indicado.",
        "En Evaluación ves los comentarios. En Caso editas tu respuesta. Luego guarda o envía las correcciones.",
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
  if (args.estado === "FINALIZADA") {
    return {
      title: "Caso finalizado",
      parrafos: [
        "Este caso ya está finalizado. Puedes consultarlo, pero ya no se edita.",
        EXTRA_HISTORIAL,
      ],
    };
  }
  return {
    title: "Caso enviado",
    parrafos: [
      "El caso ya fue enviado. Espera la evaluación; si hay observaciones, podrás corregir desde aquí.",
      EXTRA_HISTORIAL,
    ],
  };
}
