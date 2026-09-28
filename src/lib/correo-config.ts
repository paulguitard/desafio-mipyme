import { prisma } from "@/lib/db";
import { parseImagenConvocatoria } from "@/lib/convocatoria";
import {
  DEFAULT_CORREO_RECUPERACION,
  imagenUrlFromStored,
  type ConfigCorreoRecuperacionData,
} from "@/lib/correo-recuperacion";
import { signedCloudinaryUrl } from "@/lib/storage/cloudinary";

export function imagenUrlForMail(raw: string): string | null {
  const file = parseImagenConvocatoria(raw);
  if (!file) return null;
  if (file.relativePath.includes("/") && process.env.CLOUDINARY_CLOUD_NAME) {
    try {
      return signedCloudinaryUrl(file.relativePath, {
        resourceType: "image",
        expiresInSeconds: 60 * 60,
      });
    } catch {
      return imagenUrlFromStored(raw);
    }
  }
  return imagenUrlFromStored(raw);
}

export async function loadConfigCorreoRecuperacionForMail(): Promise<
  Omit<ConfigCorreoRecuperacionData, "imagenUrl">
> {
  const row = await prisma.configCorreoRecuperacion.findUnique({
    where: { id: "default" },
  });
  if (!row) return DEFAULT_CORREO_RECUPERACION;
  return {
    asunto: row.asunto,
    titulo: row.titulo,
    cuerpo: row.cuerpo,
    textoBoton: row.textoBoton,
    pie: row.pie,
    colorFondo: row.colorFondo,
    colorEncabezado: row.colorEncabezado,
    colorBoton: row.colorBoton,
    colorTexto: row.colorTexto,
    imagen: row.imagen,
  };
}
