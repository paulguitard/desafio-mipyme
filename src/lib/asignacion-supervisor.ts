import { cupoAlcanzado } from "@/lib/cupo-asignacion";
import { prisma } from "@/lib/db";

export async function asignarSupervisoresAutomaticoEnConvocatoria(convocatoriaId: string) {
  const convocatoria = await prisma.convocatoria.findUnique({
    where: { id: convocatoriaId },
    include: {
      supervisores: { include: { supervisor: true } },
      postulaciones: {
        include: { supervision: true },
      },
    },
  });
  if (!convocatoria) return { error: "Mentoría no encontrada." };
  if (convocatoria.supervisores.length === 0) {
    return { error: "Agrega supervisores al pool de la mentoría primero." };
  }

  const cargas = new Map<string, number>();
  for (const post of convocatoria.postulaciones) {
    if (post.supervision) {
      cargas.set(
        post.supervision.supervisorId,
        (cargas.get(post.supervision.supervisorId) ?? 0) + 1,
      );
    }
  }

  let asignadas = 0;
  let incompletas = 0;

  const elegibles = convocatoria.postulaciones.filter(
    (post) => post.enviadaAt && post.estado !== "FINALIZADA" && !post.supervision,
  );

  for (const postulacion of elegibles) {
    const candidatos = convocatoria.supervisores
      .filter((item) => {
        const carga = cargas.get(item.supervisorId) ?? 0;
        if (cupoAlcanzado(item.maxSupervisiones, carga)) return false;
        return true;
      })
      .sort((a, b) => {
        const cargaA = cargas.get(a.supervisorId) ?? 0;
        const cargaB = cargas.get(b.supervisorId) ?? 0;
        if (cargaA !== cargaB) return cargaA - cargaB;
        return a.supervisor.name.localeCompare(b.supervisor.name, "es");
      });

    const tomar = candidatos[0];
    if (!tomar) {
      incompletas += 1;
      continue;
    }

    await prisma.asignacionSupervisor.create({
      data: {
        postulacionId: postulacion.id,
        supervisorId: tomar.supervisorId,
      },
    });
    cargas.set(tomar.supervisorId, (cargas.get(tomar.supervisorId) ?? 0) + 1);
    asignadas += 1;
  }

  if (asignadas === 0 && incompletas === 0) {
    return { ok: true, mensaje: "No había casos pendientes de supervisión." };
  }

  const partes = [`Se crearon ${asignadas} asignación${asignadas === 1 ? "" : "es"} de supervisor.`];
  if (incompletas > 0) {
    partes.push(
      `${incompletas} caso${incompletas === 1 ? "" : "s"} no alcanzó supervisor (pool o carga máxima insuficiente).`,
    );
  }
  return { ok: true, mensaje: partes.join(" ") };
}
