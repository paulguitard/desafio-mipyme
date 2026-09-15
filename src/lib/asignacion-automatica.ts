import { prisma } from "@/lib/db";
import { sincronizarEstadoPostulacion } from "@/lib/sync-estado";

export async function asignarEvaluadoresAutomaticoEnConvocatoria(convocatoriaId: string) {
  const convocatoria = await prisma.convocatoria.findUnique({
    where: { id: convocatoriaId },
    include: {
      evaluadores: { include: { evaluador: true } },
      postulaciones: {
        include: { asignaciones: true },
      },
    },
  });
  if (!convocatoria) return { error: "Convocatoria no encontrada." };
  if (convocatoria.estado !== "ABIERTA") {
    return { error: "La convocatoria está cerrada. No se puede asignar." };
  }
  if (convocatoria.evaluadores.length === 0) {
    return { error: "Agrega evaluadores al pool de la convocatoria primero." };
  }

  const n = Math.max(1, convocatoria.evaluacionesPorPostulacion);
  const cargas = new Map<string, number>();
  for (const post of convocatoria.postulaciones) {
    for (const asig of post.asignaciones) {
      cargas.set(asig.evaluadorId, (cargas.get(asig.evaluadorId) ?? 0) + 1);
    }
  }

  let asignadas = 0;
  let incompletas = 0;

  const elegibles = convocatoria.postulaciones.filter(
    (post) => post.enviadaAt && post.estado !== "FINALIZADA",
  );

  for (const postulacion of elegibles) {
    const ya = new Set(postulacion.asignaciones.map((a) => a.evaluadorId));
    let orden = postulacion.asignaciones.reduce((max, a) => Math.max(max, a.orden), 0);
    const faltan = n - postulacion.asignaciones.length;
    if (faltan <= 0) continue;

    const candidatos = convocatoria.evaluadores
      .filter((item) => {
        if (ya.has(item.evaluadorId)) return false;
        const carga = cargas.get(item.evaluadorId) ?? 0;
        if (item.maxEvaluaciones > 0 && carga >= item.maxEvaluaciones) return false;
        return true;
      })
      .sort((a, b) => {
        const cargaA = cargas.get(a.evaluadorId) ?? 0;
        const cargaB = cargas.get(b.evaluadorId) ?? 0;
        if (cargaA !== cargaB) return cargaA - cargaB;
        return a.evaluador.name.localeCompare(b.evaluador.name, "es");
      });

    const tomar = candidatos.slice(0, faltan);
    if (tomar.length < faltan) incompletas += 1;

    for (const item of tomar) {
      orden += 1;
      await prisma.asignacionEvaluador.create({
        data: {
          postulacionId: postulacion.id,
          evaluadorId: item.evaluadorId,
          orden,
          estado: "PENDIENTE",
          rondaActual: 1,
        },
      });
      cargas.set(item.evaluadorId, (cargas.get(item.evaluadorId) ?? 0) + 1);
      asignadas += 1;
    }

    await sincronizarEstadoPostulacion(postulacion.id);
  }

  if (asignadas === 0 && incompletas === 0) {
    return { ok: true, mensaje: "No había casos pendientes de asignación." };
  }

  const partes = [`Se crearon ${asignadas} asignación${asignadas === 1 ? "" : "es"}.`];
  if (incompletas > 0) {
    partes.push(
      `${incompletas} caso${incompletas === 1 ? "" : "s"} no alcanzó el cupo (pool o carga máxima insuficiente).`,
    );
  }
  return { ok: true, mensaje: partes.join(" ") };
}
