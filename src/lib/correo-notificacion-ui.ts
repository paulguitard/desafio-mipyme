export const TIPOS_CORREO_NOTIFICACION = [
  "PARTICIPANTE_OBSERVACIONES",
  "EVALUADOR_RESPUESTA_REENVIO",
  "EVALUADOR_DEVOLUCION_SUPERVISOR",
  "EVALUADOR_APROBACION_SUPERVISOR",
  "SUPERVISOR_NUEVA_REVISION",
] as const;

export type TipoCorreoNotificacion = (typeof TIPOS_CORREO_NOTIFICACION)[number];

export type TextosCorreoNotificacion = {
  asunto: string;
  titulo: string;
  cuerpo: string;
  textoBoton: string;
  pie: string;
};

export const SECCIONES_CORREO_NOTIFICACION: {
  id: TipoCorreoNotificacion;
  label: string;
  descripcion: string;
  placeholders: string;
}[] = [
  {
    id: "PARTICIPANTE_OBSERVACIONES",
    label: "Participante: observaciones",
    descripcion:
      "Se envía cuando el supervisor aprueba las observaciones y el participante ya puede reparar el caso.",
    placeholders: "{{nombre}}, {{enlace}}, {{caso}}, {{mentoria}}, {{actor}}",
  },
  {
    id: "EVALUADOR_RESPUESTA_REENVIO",
    label: "Evaluador: respuesta reenviada",
    descripcion:
      "Se envía al evaluador cuando el participante reenvía las respuestas después de observaciones.",
    placeholders: "{{nombre}}, {{enlace}}, {{caso}}, {{mentoria}}, {{actor}}",
  },
  {
    id: "EVALUADOR_DEVOLUCION_SUPERVISOR",
    label: "Evaluador: devolución del supervisor",
    descripcion: "Se envía al evaluador cuando el supervisor le devuelve la evaluación para corregir.",
    placeholders: "{{nombre}}, {{enlace}}, {{caso}}, {{mentoria}}, {{actor}}",
  },
  {
    id: "EVALUADOR_APROBACION_SUPERVISOR",
    label: "Evaluador: aprobación del supervisor",
    descripcion:
      "Se envía al evaluador cuando el supervisor aprueba su evaluación (observaciones o finalización).",
    placeholders: "{{nombre}}, {{enlace}}, {{caso}}, {{mentoria}}, {{actor}}, {{resultado}}",
  },
  {
    id: "SUPERVISOR_NUEVA_REVISION",
    label: "Supervisor: nueva revisión",
    descripcion:
      "Se envía al supervisor cuando un evaluador envía una evaluación para revisión.",
    placeholders: "{{nombre}}, {{enlace}}, {{caso}}, {{mentoria}}, {{actor}}",
  },
];

export const DEFAULT_CORREO_NOTIFICACION: Record<TipoCorreoNotificacion, TextosCorreoNotificacion> = {
  PARTICIPANTE_OBSERVACIONES: {
    asunto: "Hay observaciones para reparar — {{caso}}",
    titulo: "Observaciones para reparar",
    cuerpo:
      "Hola {{nombre}},\n\nEl evaluador envió observaciones sobre tu caso «{{caso}}» en {{mentoria}}, y el supervisor ya las aprobó. Entrá para revisarlas y enviar las correcciones.",
    textoBoton: "Ver el caso",
    pie: "Si el botón no funciona, copiá y pegá este enlace en tu navegador:\n{{enlace}}",
  },
  EVALUADOR_RESPUESTA_REENVIO: {
    asunto: "El participante reenvió el caso — {{caso}}",
    titulo: "Respuestas actualizadas",
    cuerpo:
      "Hola {{nombre}},\n\n{{actor}} reenvió las respuestas de «{{caso}}» en {{mentoria}} después de tus observaciones. Ya podés volver a evaluar.",
    textoBoton: "Abrir la evaluación",
    pie: "Si el botón no funciona, copiá y pegá este enlace en tu navegador:\n{{enlace}}",
  },
  EVALUADOR_DEVOLUCION_SUPERVISOR: {
    asunto: "El supervisor devolvió tu evaluación — {{caso}}",
    titulo: "Evaluación devuelta",
    cuerpo:
      "Hola {{nombre}},\n\n{{actor}} devolvió tu evaluación de «{{caso}}» en {{mentoria}}. Revisá sus comentarios y volvé a enviarla.",
    textoBoton: "Revisar la evaluación",
    pie: "Si el botón no funciona, copiá y pegá este enlace en tu navegador:\n{{enlace}}",
  },
  EVALUADOR_APROBACION_SUPERVISOR: {
    asunto: "El supervisor aprobó tu evaluación — {{caso}}",
    titulo: "Evaluación aprobada",
    cuerpo:
      "Hola {{nombre}},\n\n{{actor}} aprobó tu evaluación de «{{caso}}» en {{mentoria}} ({{resultado}}).",
    textoBoton: "Ver la evaluación",
    pie: "Si el botón no funciona, copiá y pegá este enlace en tu navegador:\n{{enlace}}",
  },
  SUPERVISOR_NUEVA_REVISION: {
    asunto: "Nueva evaluación para revisar — {{caso}}",
    titulo: "Evaluación para revisar",
    cuerpo:
      "Hola {{nombre}},\n\n{{actor}} envió una evaluación de «{{caso}}» en {{mentoria}} para tu revisión.",
    textoBoton: "Abrir la supervisión",
    pie: "Si el botón no funciona, copiá y pegá este enlace en tu navegador:\n{{enlace}}",
  },
};

export function isTipoCorreoNotificacion(value: string): value is TipoCorreoNotificacion {
  return (TIPOS_CORREO_NOTIFICACION as readonly string[]).includes(value);
}
