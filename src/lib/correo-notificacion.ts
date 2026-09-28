import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getAppBaseUrl } from "@/lib/app-url";
import { imagenUrlForMail, loadConfigCorreoRecuperacionForMail } from "@/lib/correo-config";
import {
  destosearTextoCorreo,
  renderCorreoRecuperacion,
  type ConfigCorreoRecuperacionData,
} from "@/lib/correo-recuperacion";
import { isMailConfigured, sendMail } from "@/lib/mail";
import { etiquetaNombreCaso } from "@/lib/nombre-caso";
import {
  DEFAULT_CORREO_NOTIFICACION,
  TIPOS_CORREO_NOTIFICACION,
  type TipoCorreoNotificacion,
  type TextosCorreoNotificacion,
} from "@/lib/correo-notificacion-ui";

export {
  DEFAULT_CORREO_NOTIFICACION,
  SECCIONES_CORREO_NOTIFICACION,
  TIPOS_CORREO_NOTIFICACION,
  isTipoCorreoNotificacion,
  type TipoCorreoNotificacion,
  type TextosCorreoNotificacion,
} from "@/lib/correo-notificacion-ui";

type FilaCorreoNotificacion = {
  id: string;
  asunto: string;
  titulo: string;
  cuerpo: string;
  textoBoton: string;
  pie: string;
};

/**
 * El delegate `prisma.configCorreoNotificacion` a veces no existe en `next dev`
 * (cliente generado viejo cacheado). Las lecturas/escritas van por SQL.
 */
async function asegurarTablaCorreoNotificacion() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ConfigCorreoNotificacion" (
      "id" TEXT NOT NULL,
      "asunto" TEXT NOT NULL,
      "titulo" TEXT NOT NULL,
      "cuerpo" TEXT NOT NULL,
      "textoBoton" TEXT NOT NULL,
      "pie" TEXT NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "ConfigCorreoNotificacion_pkey" PRIMARY KEY ("id")
    )
  `);
}

export async function listarConfigCorreoNotificacion(): Promise<FilaCorreoNotificacion[]> {
  await asegurarTablaCorreoNotificacion();
  const ids = Prisma.join(TIPOS_CORREO_NOTIFICACION.map((id) => Prisma.sql`${id}`));
  return prisma.$queryRaw<FilaCorreoNotificacion[]>`
    SELECT id, asunto, titulo, cuerpo, "textoBoton", pie
    FROM "ConfigCorreoNotificacion"
    WHERE id IN (${ids})
  `;
}

export async function guardarFilaCorreoNotificacion(
  id: TipoCorreoNotificacion,
  textos: TextosCorreoNotificacion,
) {
  await asegurarTablaCorreoNotificacion();
  await prisma.$executeRaw`
    INSERT INTO "ConfigCorreoNotificacion" (id, asunto, titulo, cuerpo, "textoBoton", pie, "updatedAt")
    VALUES (${id}, ${textos.asunto}, ${textos.titulo}, ${textos.cuerpo}, ${textos.textoBoton}, ${textos.pie}, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
      asunto = EXCLUDED.asunto,
      titulo = EXCLUDED.titulo,
      cuerpo = EXCLUDED.cuerpo,
      "textoBoton" = EXCLUDED."textoBoton",
      pie = EXCLUDED.pie,
      "updatedAt" = CURRENT_TIMESTAMP
  `;
}

export async function loadTextosCorreoNotificacion(
  tipo: TipoCorreoNotificacion,
): Promise<TextosCorreoNotificacion> {
  const rows = await listarConfigCorreoNotificacion();
  const row = rows.find((item) => item.id === tipo);
  if (!row) return DEFAULT_CORREO_NOTIFICACION[tipo];
  return {
    asunto: destosearTextoCorreo(row.asunto),
    titulo: destosearTextoCorreo(row.titulo),
    cuerpo: destosearTextoCorreo(row.cuerpo),
    textoBoton: destosearTextoCorreo(row.textoBoton),
    pie: destosearTextoCorreo(row.pie),
  };
}

export function combinarDisenoYTextos(
  diseno: Omit<ConfigCorreoRecuperacionData, "imagenUrl">,
  textos: TextosCorreoNotificacion,
): Omit<ConfigCorreoRecuperacionData, "imagenUrl"> {
  return {
    ...diseno,
    asunto: textos.asunto,
    titulo: textos.titulo,
    cuerpo: textos.cuerpo,
    textoBoton: textos.textoBoton,
    pie: textos.pie,
  };
}

export function urlCasoParticipante(postulacionId: string) {
  return `${getAppBaseUrl()}/participante/postulaciones/${postulacionId}`;
}

export function urlEvaluacion(asignacionId: string) {
  return `${getAppBaseUrl()}/evaluador/evaluaciones/${asignacionId}`;
}

export function urlSupervision(postulacionId: string) {
  return `${getAppBaseUrl()}/evaluador/supervision/${postulacionId}`;
}

export type VarsNovedadCaso = {
  nombre: string;
  enlace: string;
  caso?: string;
  mentoria?: string;
  actor?: string;
  resultado?: string;
};

export async function notifyNovedadCaso(input: {
  tipo: TipoCorreoNotificacion;
  to: string;
  vars: VarsNovedadCaso;
}) {
  if (!input.to.includes("@")) return;
  if (!isMailConfigured()) {
    console.warn("[mail] SMTP no configurado; se omitió aviso", input.tipo);
    return;
  }

  try {
    const [diseno, textos] = await Promise.all([
      loadConfigCorreoRecuperacionForMail(),
      loadTextosCorreoNotificacion(input.tipo),
    ]);
    const config = combinarDisenoYTextos(diseno, textos);
    const vars = {
      nombre: input.vars.nombre,
      enlace: input.vars.enlace,
      caso: input.vars.caso ?? "",
      mentoria: input.vars.mentoria ?? "",
      actor: input.vars.actor ?? "",
      resultado: input.vars.resultado ?? "",
    };
    const rendered = renderCorreoRecuperacion(config, vars, imagenUrlForMail(diseno.imagen));
    const sent = await sendMail({
      to: input.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    if (!sent.ok) {
      console.error("[mail] aviso no enviado", input.tipo, sent.error);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[mail] aviso falló", input.tipo, message.slice(0, 400));
  }
}

export function contextoCaso(postulacion: {
  nombreCaso: string;
  convocatoria: { titulo: string };
}) {
  return {
    caso: etiquetaNombreCaso(postulacion.nombreCaso),
    mentoria: postulacion.convocatoria.titulo,
  };
}

const casoSelect = {
  nombreCaso: true,
  convocatoria: { select: { titulo: true } },
} as const;

export async function avisarSupervisorNuevaRevision(input: {
  postulacionId: string;
  actorNombre: string;
}) {
  const postulacion = await prisma.postulacion.findUnique({
    where: { id: input.postulacionId },
    select: {
      ...casoSelect,
      supervision: { select: { supervisor: { select: { name: true, email: true } } } },
    },
  });
  const supervisor = postulacion?.supervision?.supervisor;
  if (!postulacion || !supervisor?.email) return;
  await notifyNovedadCaso({
    tipo: "SUPERVISOR_NUEVA_REVISION",
    to: supervisor.email,
    vars: {
      nombre: supervisor.name,
      enlace: urlSupervision(input.postulacionId),
      actor: input.actorNombre,
      ...contextoCaso(postulacion),
    },
  });
}

export async function avisarEvaluadorDevolucionSupervisor(input: {
  asignacionId: string;
  actorNombre: string;
}) {
  const asignacion = await prisma.asignacionEvaluador.findUnique({
    where: { id: input.asignacionId },
    select: {
      evaluador: { select: { name: true, email: true } },
      postulacion: { select: casoSelect },
    },
  });
  if (!asignacion?.evaluador.email) return;
  await notifyNovedadCaso({
    tipo: "EVALUADOR_DEVOLUCION_SUPERVISOR",
    to: asignacion.evaluador.email,
    vars: {
      nombre: asignacion.evaluador.name,
      enlace: urlEvaluacion(input.asignacionId),
      actor: input.actorNombre,
      ...contextoCaso(asignacion.postulacion),
    },
  });
}

export async function avisarTrasAprobacionSupervisor(input: {
  asignacionId: string;
  actorNombre: string;
  resultado: "observaciones" | "finalizacion";
}) {
  const asignacion = await prisma.asignacionEvaluador.findUnique({
    where: { id: input.asignacionId },
    select: {
      estado: true,
      evaluador: { select: { name: true, email: true } },
      postulacion: {
        select: {
          id: true,
          ...casoSelect,
          postulante: { select: { name: true, email: true } },
        },
      },
    },
  });
  if (!asignacion) return;
  const caso = contextoCaso(asignacion.postulacion);
  const resultadoTexto =
    input.resultado === "finalizacion"
      ? "evaluación finalizada"
      : "observaciones aprobadas";

  if (asignacion.evaluador.email) {
    await notifyNovedadCaso({
      tipo: "EVALUADOR_APROBACION_SUPERVISOR",
      to: asignacion.evaluador.email,
      vars: {
        nombre: asignacion.evaluador.name,
        enlace: urlEvaluacion(input.asignacionId),
        actor: input.actorNombre,
        resultado: resultadoTexto,
        ...caso,
      },
    });
  }

  if (input.resultado === "observaciones" && asignacion.postulacion.postulante.email) {
    await notifyNovedadCaso({
      tipo: "PARTICIPANTE_OBSERVACIONES",
      to: asignacion.postulacion.postulante.email,
      vars: {
        nombre: asignacion.postulacion.postulante.name,
        enlace: urlCasoParticipante(asignacion.postulacion.id),
        actor: input.actorNombre,
        ...caso,
      },
    });
  }
}

export async function avisarEvaluadoresRespuestaReenviada(input: {
  asignacionIds: string[];
  actorNombre: string;
}) {
  if (input.asignacionIds.length === 0) return;
  const asignaciones = await prisma.asignacionEvaluador.findMany({
    where: { id: { in: input.asignacionIds } },
    select: {
      id: true,
      evaluador: { select: { name: true, email: true } },
      postulacion: { select: casoSelect },
    },
  });
  for (const asignacion of asignaciones) {
    if (!asignacion.evaluador.email) continue;
    await notifyNovedadCaso({
      tipo: "EVALUADOR_RESPUESTA_REENVIO",
      to: asignacion.evaluador.email,
      vars: {
        nombre: asignacion.evaluador.name,
        enlace: urlEvaluacion(asignacion.id),
        actor: input.actorNombre,
        ...contextoCaso(asignacion.postulacion),
      },
    });
  }
}
