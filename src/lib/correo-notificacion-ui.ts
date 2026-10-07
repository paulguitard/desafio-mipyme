export const TIPOS_CORREO_NOTIFICACION = [
  "PARTICIPANTE_OBSERVACIONES",
  "CASO_APROBADO",
  "EVALUADOR_RESPUESTA_REENVIO",
  "EVALUADOR_DEVOLUCION_SUPERVISOR",
  "EVALUADOR_APROBACION_SUPERVISOR",
  "SUPERVISOR_NUEVA_REVISION",
  "PARTICIPANTE_RECORDATORIO_PENDIENTE",
  "PARTICIPANTE_RECORDATORIO_COMPLETA",
  "PARTICIPANTE_RECORDATORIO_OBSERVACIONES",
  "EVALUADOR_RECORDATORIO_CASO",
  "SUPERVISOR_RECORDATORIO_CASO",
  "EVALUADOR_RECORDATORIO_RESUMEN",
  "SUPERVISOR_RECORDATORIO_RESUMEN",
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
      "Se envía al participante cuando ya puede reparar el caso. El texto no debe mencionar supervisores.",
    placeholders: "{{nombre}}, {{enlace}}, {{caso}}, {{mentoria}}",
  },
  {
    id: "CASO_APROBADO",
    label: "Caso aprobado y finalizado",
    descripcion:
      "Se envía al participante y a cada evaluador cuando todos los evaluadores del caso quedaron finalizados.",
    placeholders: "{{nombre}}, {{enlace}}, {{caso}}, {{mentoria}}",
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
  {
    id: "PARTICIPANTE_RECORDATORIO_PENDIENTE",
    label: "Recordatorio: participante pendiente",
    descripcion: "Se envía al participante cuando su caso todavía no está completo ni enviado.",
    placeholders: "{{nombre}}, {{enlace}}, {{caso}}, {{mentoria}}",
  },
  {
    id: "PARTICIPANTE_RECORDATORIO_COMPLETA",
    label: "Recordatorio: participante sin enviar",
    descripcion:
      "Se envía al participante cuando el caso está completo y falta pulsar «Enviar caso». Todavía puede editar y adjuntar archivos.",
    placeholders: "{{nombre}}, {{enlace}}, {{caso}}, {{mentoria}}",
  },
  {
    id: "PARTICIPANTE_RECORDATORIO_OBSERVACIONES",
    label: "Recordatorio: participante con observaciones",
    descripcion: "Se envía al participante cuando hay observaciones pendientes de corregir.",
    placeholders: "{{nombre}}, {{enlace}}, {{caso}}, {{mentoria}}",
  },
  {
    id: "EVALUADOR_RECORDATORIO_CASO",
    label: "Recordatorio: evaluador de un caso",
    descripcion: "Se envía al evaluador cuando todavía tiene ese caso pendiente de evaluar.",
    placeholders: "{{nombre}}, {{enlace}}, {{caso}}, {{mentoria}}",
  },
  {
    id: "SUPERVISOR_RECORDATORIO_CASO",
    label: "Recordatorio: supervisor de un caso",
    descripcion: "Se envía al supervisor cuando ese caso está pendiente de supervisión.",
    placeholders: "{{nombre}}, {{enlace}}, {{caso}}, {{mentoria}}",
  },
  {
    id: "EVALUADOR_RECORDATORIO_RESUMEN",
    label: "Recordatorio: evaluadores (resumen)",
    descripcion:
      "Se envía a cada evaluador con casos pendientes en la asesoría, indicando cuántos le quedan.",
    placeholders: "{{nombre}}, {{enlace}}, {{mentoria}}, {{cantidad}}",
  },
  {
    id: "SUPERVISOR_RECORDATORIO_RESUMEN",
    label: "Recordatorio: supervisores (resumen)",
    descripcion:
      "Se envía a cada supervisor con casos pendientes en la asesoría, indicando cuántos le quedan.",
    placeholders: "{{nombre}}, {{enlace}}, {{mentoria}}, {{cantidad}}",
  },
];

export const DEFAULT_CORREO_NOTIFICACION: Record<TipoCorreoNotificacion, TextosCorreoNotificacion> = {
  PARTICIPANTE_OBSERVACIONES: {
    asunto: "Hay observaciones para reparar — {{caso}}",
    titulo: "Observaciones para reparar",
    cuerpo:
      "Hola {{nombre}},\n\nEl evaluador envió observaciones sobre tu caso «{{caso}}» en {{mentoria}}. Entra para revisarlas y enviar las correcciones.",
    textoBoton: "Ver el caso",
    pie: "Si el botón no funciona, copia y pega este enlace en tu navegador:\n{{enlace}}",
  },
  CASO_APROBADO: {
    asunto: "Tu caso fue aprobado — {{caso}}",
    titulo: "Caso aprobado",
    cuerpo:
      "Hola {{nombre}},\n\nLa evaluación de «{{caso}}» en {{mentoria}} terminó y el caso fue aprobado. El equipo del desafío te informará pronto los siguientes pasos.",
    textoBoton: "Ver el caso",
    pie: "Si el botón no funciona, copia y pega este enlace en tu navegador:\n{{enlace}}",
  },
  EVALUADOR_RESPUESTA_REENVIO: {
    asunto: "El participante reenvió el caso — {{caso}}",
    titulo: "Respuestas actualizadas",
    cuerpo:
      "Hola {{nombre}},\n\n{{actor}} reenvió las respuestas de «{{caso}}» en {{mentoria}} después de tus observaciones. Ya puedes volver a evaluar.",
    textoBoton: "Abrir la evaluación",
    pie: "Si el botón no funciona, copia y pega este enlace en tu navegador:\n{{enlace}}",
  },
  EVALUADOR_DEVOLUCION_SUPERVISOR: {
    asunto: "El supervisor devolvió tu evaluación — {{caso}}",
    titulo: "Evaluación devuelta",
    cuerpo:
      "Hola {{nombre}},\n\n{{actor}} devolvió tu evaluación de «{{caso}}» en {{mentoria}}. Revisa sus comentarios y vuelve a enviarla.",
    textoBoton: "Revisar la evaluación",
    pie: "Si el botón no funciona, copia y pega este enlace en tu navegador:\n{{enlace}}",
  },
  EVALUADOR_APROBACION_SUPERVISOR: {
    asunto: "El supervisor aprobó tu evaluación — {{caso}}",
    titulo: "Evaluación aprobada",
    cuerpo:
      "Hola {{nombre}},\n\n{{actor}} aprobó tu evaluación de «{{caso}}» en {{mentoria}} ({{resultado}}).",
    textoBoton: "Ver la evaluación",
    pie: "Si el botón no funciona, copia y pega este enlace en tu navegador:\n{{enlace}}",
  },
  SUPERVISOR_NUEVA_REVISION: {
    asunto: "Nueva evaluación para revisar — {{caso}}",
    titulo: "Evaluación para revisar",
    cuerpo:
      "Hola {{nombre}},\n\n{{actor}} envió una evaluación de «{{caso}}» en {{mentoria}} para tu revisión.",
    textoBoton: "Abrir la supervisión",
    pie: "Si el botón no funciona, copia y pega este enlace en tu navegador:\n{{enlace}}",
  },
  PARTICIPANTE_RECORDATORIO_PENDIENTE: {
    asunto: "Recordatorio: completa tu caso — {{caso}}",
    titulo: "Tu caso sigue pendiente",
    cuerpo:
      "Hola {{nombre}},\n\nTodavía no has completado ni enviado tu caso «{{caso}}» en {{mentoria}}. Entra para terminarlo y pulsar «Enviar caso».",
    textoBoton: "Ir al caso",
    pie: "Si el botón no funciona, copia y pega este enlace en tu navegador:\n{{enlace}}",
  },
  PARTICIPANTE_RECORDATORIO_COMPLETA: {
    asunto: "Recordatorio: envía tu caso — {{caso}}",
    titulo: "Falta enviar tu caso",
    cuerpo:
      "Hola {{nombre}},\n\nTu caso «{{caso}}» en {{mentoria}} ya está completo. Pulsa «Enviar caso» para que pase a la siguiente fase de evaluación.\n\nAntes de enviarlo todavía puedes editar el caso e incluir imágenes y archivos.",
    textoBoton: "Enviar el caso",
    pie: "Si el botón no funciona, copia y pega este enlace en tu navegador:\n{{enlace}}",
  },
  PARTICIPANTE_RECORDATORIO_OBSERVACIONES: {
    asunto: "Recordatorio: corrige tu caso — {{caso}}",
    titulo: "Faltan correcciones",
    cuerpo:
      "Hola {{nombre}},\n\nTodavía hay observaciones pendientes en tu caso «{{caso}}» en {{mentoria}}. Entra para corregirlas y volver a enviar el caso.",
    textoBoton: "Ir al caso",
    pie: "Si el botón no funciona, copia y pega este enlace en tu navegador:\n{{enlace}}",
  },
  EVALUADOR_RECORDATORIO_CASO: {
    asunto: "Recordatorio: evalúa el caso — {{caso}}",
    titulo: "Tienes un caso por evaluar",
    cuerpo:
      "Hola {{nombre}},\n\nTodavía tienes pendiente la evaluación de «{{caso}}» en {{mentoria}}. Entra para revisarlo.",
    textoBoton: "Abrir la evaluación",
    pie: "Si el botón no funciona, copia y pega este enlace en tu navegador:\n{{enlace}}",
  },
  SUPERVISOR_RECORDATORIO_CASO: {
    asunto: "Recordatorio: supervisa el caso — {{caso}}",
    titulo: "Tienes un caso por supervisar",
    cuerpo:
      "Hola {{nombre}},\n\nTodavía tienes pendiente la supervisión de «{{caso}}» en {{mentoria}}. Entra para revisarlo.",
    textoBoton: "Abrir la supervisión",
    pie: "Si el botón no funciona, copia y pega este enlace en tu navegador:\n{{enlace}}",
  },
  EVALUADOR_RECORDATORIO_RESUMEN: {
    asunto: "Recordatorio: te quedan {{cantidad}} casos por evaluar — {{mentoria}}",
    titulo: "Casos pendientes de evaluación",
    cuerpo:
      "Hola {{nombre}},\n\nEn {{mentoria}} te quedan {{cantidad}} casos por evaluar. Entra a tu panel para continuar.",
    textoBoton: "Ir a mis evaluaciones",
    pie: "Si el botón no funciona, copia y pega este enlace en tu navegador:\n{{enlace}}",
  },
  SUPERVISOR_RECORDATORIO_RESUMEN: {
    asunto: "Recordatorio: te quedan {{cantidad}} casos por supervisar — {{mentoria}}",
    titulo: "Casos pendientes de supervisión",
    cuerpo:
      "Hola {{nombre}},\n\nEn {{mentoria}} te quedan {{cantidad}} casos por supervisar. Entra a tu panel para continuar.",
    textoBoton: "Ir a mis supervisiones",
    pie: "Si el botón no funciona, copia y pega este enlace en tu navegador:\n{{enlace}}",
  },
};

export function isTipoCorreoNotificacion(value: string): value is TipoCorreoNotificacion {
  return (TIPOS_CORREO_NOTIFICACION as readonly string[]).includes(value);
}
