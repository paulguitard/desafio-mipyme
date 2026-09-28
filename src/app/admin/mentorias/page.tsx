import { ConvocatoriasAdmin } from "@/components/convocatorias-admin";
import { prisma } from "@/lib/db";
import { parseImagenConvocatoria, parseImagenPosicion } from "@/lib/convocatoria";
import { publicUploadUrl } from "@/lib/preguntas";

export default async function MentoriasPage() {
  const [convocatorias, formularios] = await Promise.all([
    prisma.convocatoria.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        formulario: true,
        _count: { select: { postulaciones: true } },
      },
    }),
    prisma.formulario.findMany({ orderBy: { titulo: "asc" } }),
  ]);

  return (
    <ConvocatoriasAdmin
      convocatorias={convocatorias.map((item) => {
        const imagen = parseImagenConvocatoria(item.imagen);
        return {
          id: item.id,
          titulo: item.titulo,
          descripcion: item.descripcion,
          estado: item.estado,
          formularioId: item.formularioId,
          formularioTitulo: item.formulario.titulo,
          postulaciones: item._count.postulaciones,
          fechaInicio: item.fechaInicio?.toISOString() ?? null,
          fechaCierre: item.fechaCierre?.toISOString() ?? null,
          imagenUrl: imagen ? publicUploadUrl(imagen, { width: 400 }) : null,
          imagenPos: parseImagenPosicion(item.imagen),
        };
      })}
      formularios={formularios.map((form) => ({ id: form.id, titulo: form.titulo }))}
    />
  );
}
