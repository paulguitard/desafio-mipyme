import { BadgeAvanceContenido, BadgePostulacion } from "@/components/badges";
import { ReelMentoriasAbiertas, type MentoriaAbiertaVista } from "@/components/reel-mentorias-abiertas";
import { prisma } from "@/lib/db";
import { etiquetaNombreCaso } from "@/lib/nombre-caso";
import { requireUser } from "@/lib/session";
import {
  convocatoriaAbiertaParaPostular,
  diasRestantesHasta,
  etiquetaCierreAbierto,
  etiquetaDiasRestantes,
  parseImagenConvocatoria,
  parseImagenPosicion,
} from "@/lib/convocatoria";
import { directStoredImageUrl } from "@/lib/storage/image-url";
import { esMentoriaContenido, parseTipoFormulario } from "@/lib/tipo-formulario";

function truncar(texto: string, max: number) {
  const limpio = texto.trim();
  if (limpio.length <= max) return limpio;
  return `${limpio.slice(0, max).trimEnd()}…`;
}

export default async function ParticipanteHomePage() {
  const user = await requireUser("EMPRENDEDOR");
  const [convocatorias, postulaciones] = await Promise.all([
    prisma.convocatoria.findMany({
      where: { estado: "ABIERTA" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.postulacion.findMany({
      where: { postulanteId: user.id },
      include: {
        convocatoria: {
          select: {
            titulo: true,
            tipo: true,
            formulario: { select: { _count: { select: { piezasContenido: true } } } },
          },
        },
        _count: { select: { vistasContenido: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const yaPostulo = new Set(postulaciones.map((p) => p.convocatoriaId));
  const abiertas: MentoriaAbiertaVista[] = convocatorias
    .filter((item) => convocatoriaAbiertaParaPostular(item))
    .map((item) => {
      const imagen = parseImagenConvocatoria(item.imagen);
      return {
        id: item.id,
        titulo: item.titulo,
        descripcion: item.descripcion,
        tipo: parseTipoFormulario(item.tipo),
        imagenUrl: imagen ? directStoredImageUrl(imagen) : null,
        imagenPos: parseImagenPosicion(item.imagen),
        cierre: etiquetaCierreAbierto(item.fechaCierre),
        restantes: etiquetaDiasRestantes(diasRestantesHasta(item.fechaCierre)),
        yaTieneCaso: yaPostulo.has(item.id),
      };
    });

  return (
    <div className="page-workspace is-participante-home">
      <h1 className="mx-auto w-full max-w-4xl shrink-0 text-3xl font-extrabold text-navy">
        Mentorías abiertas
      </h1>
      <section className="reel-mentorias-full shrink-0" data-tour="mentorias-abiertas">
        <ReelMentoriasAbiertas items={abiertas} />
      </section>

      <section className="mx-auto flex min-h-0 w-full max-w-4xl flex-col" data-tour="mis-casos">
        <h2 className="shrink-0 text-3xl font-extrabold text-navy">Mis casos</h2>
        <div className="page-scroll casos-lista mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6 pr-1">
          {postulaciones.length === 0 ? <p className="text-muted">Aún no tienes casos.</p> : null}
          {postulaciones.map((item) => {
            const nombreCaso = etiquetaNombreCaso(item.nombreCaso);
            const esContenido = esMentoriaContenido(item.convocatoria.tipo);
            return (
              <a
                key={item.id}
                href={`/participante/postulaciones/${item.id}`}
                className="card card-link caso-fila"
              >
                <div className="caso-fila-textos">
                  <h3 className="caso-fila-nombre">
                    <span className="caso-fila-texto-largo">{nombreCaso}</span>
                    <span className="caso-fila-texto-corto">{truncar(nombreCaso, 20)}</span>
                  </h3>
                  <p className="caso-fila-mentoria">
                    <span className="caso-fila-texto-largo">{item.convocatoria.titulo}</span>
                    <span className="caso-fila-texto-corto">{truncar(item.convocatoria.titulo, 30)}</span>
                  </p>
                </div>
                {esContenido ? (
                  <BadgeAvanceContenido
                    vistas={item._count.vistasContenido}
                    total={item.convocatoria.formulario._count.piezasContenido}
                    cortoMovil
                  />
                ) : (
                  <BadgePostulacion estado={item.estado} cortoMovil />
                )}
                <svg className="caso-fila-flecha" viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M5.47 2.97a.75.75 0 0 1 1.06 0l5 5a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 1 1-1.06-1.06L9.94 8 5.47 3.53a.75.75 0 0 1 0-1.06Z"
                  />
                </svg>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}
