import { ConvocatoriasAdmin } from "@/components/convocatorias-admin";
import { prisma } from "@/lib/db";
import { parseImagenConvocatoria, parseImagenPosicion } from "@/lib/convocatoria";
import { directStoredImageUrl } from "@/lib/storage/image-url";
import { parseTipoFormulario } from "@/lib/tipo-formulario";

export default async function MentoriasPage({
  searchParams,
}: {
  searchParams: Promise<{ panel?: string }>;
}) {
  const { panel: panelInicialId } = await searchParams;
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
      panelInicialId={panelInicialId ?? null}
      convocatorias={convocatorias.map((item) => {
        const imagen = parseImagenConvocatoria(item.imagen);
        return {
          id: item.id,
          titulo: item.titulo,
          descripcion: item.descripcion,
          estado: item.estado,
          visible: item.visible,
          tipo: parseTipoFormulario(item.tipo),
          formularioId: item.formularioId,
          formularioTitulo: item.formulario.titulo,
          postulaciones: item._count.postulaciones,
          evaluadoresHabilitados: item.evaluadoresHabilitados,
          supervisoresHabilitados: item.supervisoresHabilitados,
          fechaInicio: item.fechaInicio?.toISOString() ?? null,
          fechaCierre: item.fechaCierre?.toISOString() ?? null,
          imagenUrl: imagen ? directStoredImageUrl(imagen) : null,
          imagenPos: parseImagenPosicion(item.imagen),
        };
      })}
      formularios={formularios.map((form) => ({
        id: form.id,
        titulo: form.titulo,
        tipo: parseTipoFormulario(form.tipo),
      }))}
    />
  );
}
