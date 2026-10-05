"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { esMentoriaContenido, parseTipoFormulario } from "@/lib/tipo-formulario";
import {
  cantidadesPendientesEvaluadores,
  cantidadesPendientesSupervisores,
  recordatorioEvaluadorCaso,
  recordatorioParticipante,
  recordatorioSupervisorCaso,
} from "@/lib/correo-recordatorio";
import {
  contextoCaso,
  notifyNovedadCaso,
  urlCasoParticipante,
  urlEvaluacion,
  urlPanelEvaluador,
  urlSupervision,
  type NotifyNovedadResult,
} from "@/lib/correo-notificacion";

type Destino = {
  to: string;
  nombre: string;
  enlace: string;
  tipo:
    | "PARTICIPANTE_RECORDATORIO_PENDIENTE"
    | "PARTICIPANTE_RECORDATORIO_COMPLETA"
    | "PARTICIPANTE_RECORDATORIO_OBSERVACIONES"
    | "EVALUADOR_RECORDATORIO_CASO"
    | "SUPERVISOR_RECORDATORIO_CASO"
    | "EVALUADOR_RECORDATORIO_RESUMEN"
    | "SUPERVISOR_RECORDATORIO_RESUMEN";
  caso?: string;
  mentoria?: string;
  cantidad?: string;
};

async function enviarLote(destinos: Destino[]): Promise<
  { ok: true; enviados: number } | { error: string }
> {
  let enviados = 0;
  let ultimoError: string | null = null;
  for (const destino of destinos) {
    const sent: NotifyNovedadResult = await notifyNovedadCaso({
      tipo: destino.tipo,
      to: destino.to,
      vars: {
        nombre: destino.nombre,
        enlace: destino.enlace,
        caso: destino.caso,
        mentoria: destino.mentoria,
        cantidad: destino.cantidad,
      },
    });
    if ("notConfigured" in sent && sent.notConfigured) {
      return { error: sent.error };
    }
    if (sent.ok) {
      enviados += 1;
    } else {
      ultimoError = sent.error;
    }
  }
  if (enviados === 0) {
    return { error: ultimoError ?? "No se envió ningún correo." };
  }
  return { ok: true, enviados };
}

const postulacionRecordatorioSelect = {
  id: true,
  estado: true,
  enviadaAt: true,
  nombreCaso: true,
  convocatoria: {
    select: {
      id: true,
      titulo: true,
      tipo: true,
      formulario: {
        select: {
          preguntas: { select: { id: true, enunciado: true, obligatoria: true, opciones: true } },
        },
      },
    },
  },
  postulante: { select: { name: true, email: true } },
  respuestas: { select: { preguntaId: true, valor: true } },
  asignaciones: {
    select: {
      id: true,
      evaluadorId: true,
      estado: true,
      evaluador: { select: { name: true, email: true } },
    },
  },
  supervision: {
    select: {
      supervisorId: true,
      supervisor: { select: { name: true, email: true } },
    },
  },
} as const;

function filtroPostulacion(postulacion: {
  estado: string;
  enviadaAt: Date | null;
  nombreCaso: string;
  postulante: { name: string; email: string };
  respuestas: { preguntaId: string; valor: string }[];
  asignaciones: { evaluadorId: string; estado: string }[];
  supervision: { supervisorId: string } | null;
}) {
  return {
    estado: postulacion.estado,
    enviadaAt: postulacion.enviadaAt?.toISOString() ?? null,
    emprendedorNombre: postulacion.postulante.name,
    emprendedorEmail: postulacion.postulante.email,
    nombreCaso: postulacion.nombreCaso,
    respuestas: postulacion.respuestas,
    asignaciones: postulacion.asignaciones,
    supervision: postulacion.supervision,
  };
}

export async function enviarRecordatorioParticipante(postulacionId: string) {
  await requireUser("ADMIN");
  const postulacion = await prisma.postulacion.findUnique({
    where: { id: postulacionId },
    select: postulacionRecordatorioSelect,
  });
  if (!postulacion) return { error: "Caso no encontrado." };
  if (esMentoriaContenido(parseTipoFormulario(postulacion.convocatoria.tipo))) {
    return { error: "Esta asesoría no tiene recordatorios de caso." };
  }
  const regla = recordatorioParticipante(
    filtroPostulacion(postulacion),
    postulacion.convocatoria.formulario.preguntas,
  );
  if (!regla.habilitado) return { error: regla.motivo };
  const email = postulacion.postulante.email;
  if (!email?.includes("@")) return { error: "El participante no tiene un correo válido." };
  return enviarLote([
    {
      tipo: regla.tipo,
      to: email,
      nombre: postulacion.postulante.name,
      enlace: urlCasoParticipante(postulacion.id),
      ...contextoCaso(postulacion),
    },
  ]);
}

export async function enviarRecordatorioEvaluadorCaso(postulacionId: string) {
  await requireUser("ADMIN");
  const postulacion = await prisma.postulacion.findUnique({
    where: { id: postulacionId },
    select: postulacionRecordatorioSelect,
  });
  if (!postulacion) return { error: "Caso no encontrado." };
  if (esMentoriaContenido(parseTipoFormulario(postulacion.convocatoria.tipo))) {
    return { error: "Esta asesoría no tiene recordatorios de caso." };
  }
  const regla = recordatorioEvaluadorCaso(postulacion.asignaciones);
  if (!regla.habilitado) return { error: regla.motivo };
  const pendientes = new Set(regla.asignaciones.map((item) => item.id));
  const destinos: Destino[] = [];
  for (const asignacion of postulacion.asignaciones) {
    if (!pendientes.has(asignacion.id)) continue;
    const email = asignacion.evaluador.email;
    if (!email?.includes("@")) continue;
    destinos.push({
      tipo: "EVALUADOR_RECORDATORIO_CASO",
      to: email,
      nombre: asignacion.evaluador.name,
      enlace: urlEvaluacion(asignacion.id),
      ...contextoCaso(postulacion),
    });
  }
  if (destinos.length === 0) return { error: "Ningún evaluador tiene un correo válido." };
  return enviarLote(destinos);
}

export async function enviarRecordatorioSupervisorCaso(postulacionId: string) {
  await requireUser("ADMIN");
  const postulacion = await prisma.postulacion.findUnique({
    where: { id: postulacionId },
    select: postulacionRecordatorioSelect,
  });
  if (!postulacion) return { error: "Caso no encontrado." };
  if (esMentoriaContenido(parseTipoFormulario(postulacion.convocatoria.tipo))) {
    return { error: "Esta asesoría no tiene recordatorios de caso." };
  }
  const regla = recordatorioSupervisorCaso(postulacion.asignaciones, postulacion.supervision);
  if (!regla.habilitado) return { error: regla.motivo };
  const supervisor = postulacion.supervision?.supervisor;
  if (!supervisor?.email?.includes("@")) {
    return { error: "El supervisor no tiene un correo válido." };
  }
  return enviarLote([
    {
      tipo: "SUPERVISOR_RECORDATORIO_CASO",
      to: supervisor.email,
      nombre: supervisor.name,
      enlace: urlSupervision(postulacion.id),
      ...contextoCaso(postulacion),
    },
  ]);
}

export async function enviarRecordatorioEvaluadoresResumen(convocatoriaId: string) {
  await requireUser("ADMIN");
  const convocatoria = await prisma.convocatoria.findUnique({
    where: { id: convocatoriaId },
    select: {
      titulo: true,
      tipo: true,
      postulaciones: {
        select: {
          asignaciones: {
            select: {
              evaluadorId: true,
              estado: true,
              evaluador: { select: { name: true, email: true } },
            },
          },
        },
      },
    },
  });
  if (!convocatoria) return { error: "Asesoría no encontrada." };
  if (esMentoriaContenido(parseTipoFormulario(convocatoria.tipo))) {
    return { error: "Esta asesoría no tiene recordatorios de evaluación." };
  }
  const cantidades = cantidadesPendientesEvaluadores(convocatoria.postulaciones);
  const porPersona = new Map<string, { name: string; email: string; cantidad: number }>();
  for (const postulacion of convocatoria.postulaciones) {
    for (const asignacion of postulacion.asignaciones) {
      const cantidad = cantidades.get(asignacion.evaluadorId);
      if (!cantidad) continue;
      if (porPersona.has(asignacion.evaluadorId)) continue;
      porPersona.set(asignacion.evaluadorId, {
        name: asignacion.evaluador.name,
        email: asignacion.evaluador.email,
        cantidad,
      });
    }
  }
  const destinos: Destino[] = [];
  for (const persona of porPersona.values()) {
    if (!persona.email.includes("@")) continue;
    destinos.push({
      tipo: "EVALUADOR_RECORDATORIO_RESUMEN",
      to: persona.email,
      nombre: persona.name,
      enlace: urlPanelEvaluador(),
      mentoria: convocatoria.titulo,
      cantidad: String(persona.cantidad),
    });
  }
  if (destinos.length === 0) {
    return { error: "Ningún evaluador tiene casos pendientes de evaluar." };
  }
  return enviarLote(destinos);
}

export async function enviarRecordatorioSupervisoresResumen(convocatoriaId: string) {
  await requireUser("ADMIN");
  const convocatoria = await prisma.convocatoria.findUnique({
    where: { id: convocatoriaId },
    select: {
      titulo: true,
      tipo: true,
      postulaciones: {
        select: {
          asignaciones: { select: { estado: true } },
          supervision: {
            select: {
              supervisorId: true,
              supervisor: { select: { name: true, email: true } },
            },
          },
        },
      },
    },
  });
  if (!convocatoria) return { error: "Asesoría no encontrada." };
  if (esMentoriaContenido(parseTipoFormulario(convocatoria.tipo))) {
    return { error: "Esta asesoría no tiene recordatorios de supervisión." };
  }
  const cantidades = cantidadesPendientesSupervisores(convocatoria.postulaciones);
  const destinos: Destino[] = [];
  const vistos = new Set<string>();
  for (const postulacion of convocatoria.postulaciones) {
    const supervision = postulacion.supervision;
    if (!supervision) continue;
    if (vistos.has(supervision.supervisorId)) continue;
    const cantidad = cantidades.get(supervision.supervisorId);
    if (!cantidad) continue;
    vistos.add(supervision.supervisorId);
    if (!supervision.supervisor.email.includes("@")) continue;
    destinos.push({
      tipo: "SUPERVISOR_RECORDATORIO_RESUMEN",
      to: supervision.supervisor.email,
      nombre: supervision.supervisor.name,
      enlace: urlPanelEvaluador(),
      mentoria: convocatoria.titulo,
      cantidad: String(cantidad),
    });
  }
  if (destinos.length === 0) {
    return { error: "Ningún supervisor tiene casos pendientes de supervisar." };
  }
  return enviarLote(destinos);
}
