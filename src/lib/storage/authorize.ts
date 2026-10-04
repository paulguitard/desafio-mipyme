import { prisma } from "@/lib/db";
import type { Role } from "@/lib/roles";
import { esTokenPublicoValido } from "@/lib/ficha-publica";
import { esMentoriaContenido } from "@/lib/tipo-formulario";
import { isSafeRelativeUploadPath } from "@/lib/storage/local";

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

  const medioContenido = await prisma.medioContenido.findFirst({
    where: { payload: { contains: relativePath } },
    select: { pieza: { select: { formularioId: true } } },
  });
  if (medioContenido) {
    const participa = await prisma.postulacion.findFirst({
      where: {
        postulanteId: actor.id,
        convocatoria: { formularioId: medioContenido.pieza.formularioId },
      },
      select: { id: true },
    });
    if (participa) return true;
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

export async function tokenCanAccessStoredFile(token: string, relativePath: string): Promise<boolean> {
  if (!relativePath || !esTokenPublicoValido(token) || !isSafeRelativeUploadPath(relativePath)) return false;
  const postulacion = await prisma.postulacion.findUnique({
    where: { tokenPublico: token },
    select: {
      convocatoria: { select: { tipo: true } },
      respuestas: {
        select: {
          archivos: true,
          versiones: { select: { archivos: true } },
        },
      },
    },
  });
  if (!postulacion) return false;
  if (esMentoriaContenido(postulacion.convocatoria.tipo)) return false;
  return postulacion.respuestas.some(
    (respuesta) =>
      respuesta.archivos.includes(relativePath) ||
      respuesta.versiones.some((version) => version.archivos.includes(relativePath)),
  );
}

export function fileLooksLikeSvg(relativePath: string, mimeType?: string) {
  const ext = relativePath.split(".").pop()?.toLowerCase();
  return ext === "svg" || mimeType === "image/svg+xml";
}
