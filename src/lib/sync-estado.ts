import { prisma } from "@/lib/db";
import { derivarEstadoPostulacion } from "@/lib/estado";

export async function sincronizarEstadoPostulacion(postulacionId: string) {
  const postulacion = await prisma.postulacion.findUnique({
    where: { id: postulacionId },
    include: { asignaciones: true },
  });
  if (!postulacion) return null;

  const estado = derivarEstadoPostulacion({
    enviadaAt: postulacion.enviadaAt,
    asignaciones: postulacion.asignaciones,
  });

  if (estado !== postulacion.estado) {
    return prisma.postulacion.update({
      where: { id: postulacionId },
      data: { estado },
    });
  }
  return postulacion;
}
