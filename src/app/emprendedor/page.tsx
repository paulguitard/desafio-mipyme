import { iniciarPostulacionForm } from "@/actions/postulaciones";
import { BadgePostulacion } from "@/components/badges";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  convocatoriaAbiertaParaPostular,
  diasRestantesHasta,
  etiquetaCierreAbierto,
  etiquetaDiasRestantes,
  parseImagenConvocatoria,
} from "@/lib/convocatoria";
import { publicUploadUrl } from "@/lib/preguntas";

export default async function EmprendedorHomePage() {
  const user = await requireUser("EMPRENDEDOR");
  const [convocatorias, postulaciones] = await Promise.all([
    prisma.convocatoria.findMany({
      where: { estado: "ABIERTA" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.postulacion.findMany({
      where: { postulanteId: user.id },
      include: { convocatoria: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const yaPostulo = new Set(postulaciones.map((p) => p.convocatoriaId));
  const abiertas = convocatorias.filter((item) => convocatoriaAbiertaParaPostular(item));

  return (
    <div className="page-workspace grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-6 overflow-hidden">
      <h1 className="shrink-0 text-3xl font-extrabold text-navy">Convocatorias abiertas</h1>
      <div className="page-scroll min-h-0 overflow-y-auto space-y-10 pr-1">
      <section className="space-y-4">
        {abiertas.length === 0 ? (
          <p className="text-muted">No hay convocatorias abiertas en este momento.</p>
        ) : null}
        {abiertas.map((item) => {
          const imagen = parseImagenConvocatoria(item.imagen);
          const cierre = etiquetaCierreAbierto(item.fechaCierre);
          const dias = diasRestantesHasta(item.fechaCierre);
          const restantes = etiquetaDiasRestantes(dias);
          const yaTieneCaso = yaPostulo.has(item.id);
          return (
          <article key={item.id} className="card space-y-3 p-6">
            {imagen ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={publicUploadUrl(imagen)}
                alt=""
                className="h-40 w-full rounded-xl object-cover"
              />
            ) : null}
            <h2 className="text-2xl font-bold text-navy">{item.titulo}</h2>
            <p>{item.descripcion}</p>
            <div className="flex flex-wrap items-end justify-between gap-4">
              {yaTieneCaso ? null : (
                <form action={iniciarPostulacionForm}>
                  <input type="hidden" name="convocatoriaId" value={item.id} />
                  <button className="btn btn-primary" type="submit">
                    Postular
                  </button>
                </form>
              )}
              <div className="ml-auto flex flex-col items-end gap-2 text-right">
                {cierre ? (
                  <p className="flex items-center justify-end gap-2 text-muted">
                    <span className="inline-flex text-navy" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="18" height="18">
                        <path
                          fill="currentColor"
                          d="M7 2h2v2h6V2h2v2h3v18H4V4h3zm12 8H5v10h14zm-9 3h2v2H10zm4 0h2v2h-2zm-8 0h2v2H6zm0 4h2v2H6zm4 0h2v2h-2zm4 0h2v2h-2z"
                        />
                      </svg>
                    </span>
                    {cierre}
                  </p>
                ) : null}
                {restantes ? (
                  <p className="inline-flex items-center gap-2 rounded-full bg-navy-soft px-3 py-1 text-sm font-bold text-navy">
                    <span className="inline-flex" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <path
                          fill="currentColor"
                          d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20m0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16m.75 3v5.19l3.53 2.04-.75 1.3L11.25 13V7z"
                        />
                      </svg>
                    </span>
                    {restantes}
                  </p>
                ) : null}
                {yaTieneCaso ? (
                  <p className="inline-flex items-center gap-2 rounded-full bg-[#e6f6ec] px-3 py-1 text-sm font-bold text-[#0f7a45]">
                    <span className="inline-flex" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <path
                          fill="currentColor"
                          d="M9.55 17.3 4.8 12.55l1.4-1.4 3.35 3.35 7.25-7.25 1.4 1.4z"
                        />
                      </svg>
                    </span>
                    Ya tienes un caso en esta convocatoria
                  </p>
                ) : null}
              </div>
            </div>
          </article>
          );
        })}
      </section>

      <section className="space-y-4">
        <h2 className="text-3xl font-extrabold text-navy">Mis casos</h2>
        {postulaciones.length === 0 ? <p className="text-muted">Aún no tienes casos.</p> : null}
        {postulaciones.map((item) => (
          <a key={item.id} href={`/emprendedor/postulaciones/${item.id}`} className="card card-link block p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-navy">{item.convocatoria.titulo}</h3>
              <BadgePostulacion estado={item.estado} />
            </div>
            <p className="text-muted">Convocatoria {item.convocatoria.estado.toLowerCase()}</p>
          </a>
        ))}
      </section>
      </div>
    </div>
  );
}
