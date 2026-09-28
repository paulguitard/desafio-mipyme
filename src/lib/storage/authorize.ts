import { prisma } from "@/lib/db";
import type { Role } from "@/lib/roles";

export type FileAccessActor = {
  id: string;
  role: Role;
};

const CONVOCATORIA_ALLOW_TTL_MS = 2 * 60 * 1000;
const convocatoriaImageAllow = new Map<string, number>();

function convocatoriaImageCached(relativePath: string) {
  const expiresAt = convocatoriaImageAllow.get(relativePath);
  if (!expiresAt) return false;
  if (expiresAt < Date.now()) {
    convocatoriaImageAllow.delete(relativePath);
    return false;
  }
  return true;
}

function rememberConvocatoriaImage(relativePath: string) {
  convocatoriaImageAllow.set(relativePath, Date.now() + CONVOCATORIA_ALLOW_TTL_MS);
}

export async function userCanAccessStoredFile(
  actor: FileAccessActor,
  relativePath: string,
): Promise<boolean> {
  if (!relativePath) return false;
  if (actor.role === "ADMIN") return true;
  if (convocatoriaImageCached(relativePath)) return true;

  const convocatoria = await prisma.convocatoria.findFirst({
    where: { imagen: { contains: relativePath } },
    select: { id: true },
  });
  if (convocatoria) {
    rememberConvocatoriaImage(relativePath);
    return true;
  }

  const [config, documento, respuesta, version] = await Promise.all([
    prisma.configCorreoRecuperacion.findFirst({
      where: { imagen: { contains: relativePath } },
      select: { id: true },
    }),
    prisma.user.findFirst({
      where: { documentosFormalizacion: { contains: relativePath } },
      select: { id: true },
    }),
    prisma.respuesta.findFirst({
      where: { archivos: { contains: relativePath } },
      select: {
        postulacion: {
          select: {
            postulanteId: true,
            asignaciones: { select: { evaluadorId: true } },
            supervision: { select: { supervisorId: true } },
          },
        },
      },
    }),
    prisma.respuestaVersion.findFirst({
      where: { archivos: { contains: relativePath } },
      select: {
        respuesta: {
          select: {
            postulacion: {
              select: {
                postulanteId: true,
                asignaciones: { select: { evaluadorId: true } },
                supervision: { select: { supervisorId: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  if (config) return false;
  if (documento) return documento.id === actor.id;

  const postulacion =
    respuesta?.postulacion ?? version?.respuesta.postulacion ?? null;
  if (!postulacion) return false;
  if (postulacion.postulanteId === actor.id) return true;
  if (postulacion.asignaciones.some((item) => item.evaluadorId === actor.id)) return true;
  if (postulacion.supervision?.supervisorId === actor.id) return true;
  return false;
}

export function fileLooksLikeSvg(relativePath: string, mimeType?: string) {
  const ext = relativePath.split(".").pop()?.toLowerCase();
  return ext === "svg" || mimeType === "image/svg+xml";
}
