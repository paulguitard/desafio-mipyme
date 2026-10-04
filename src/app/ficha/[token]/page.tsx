import { notFound } from "next/navigation";
import { FichaDetalleAdmin } from "@/components/ficha-detalle-admin";
import { FichaPublicaTokenProvider } from "@/components/ficha-publica-token";
import { getDetalleFichaPorToken } from "@/lib/convocatoria-admin-data";
import { etiquetaNombreCaso } from "@/lib/nombre-caso";
import { esTokenPublicoValido } from "@/lib/ficha-publica";

export default async function FichaPublicaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!esTokenPublicoValido(token)) notFound();
  const data = await getDetalleFichaPorToken(token);
  if (!data) notFound();

  return (
    <div className="ficha-publica-page">
      <header className="ficha-publica-chrome">
        <h1 className="ficha-publica-titulo">
          {etiquetaNombreCaso(data.nombreCaso)}
          <span className="modal-title-sep" aria-hidden="true">
            ----
          </span>
          <span className="modal-title-meta">{data.convocatoriaTitulo}</span>
        </h1>
      </header>
      <div className="ficha-publica-body">
        <FichaPublicaTokenProvider token={token}>
          <FichaDetalleAdmin data={data} />
        </FichaPublicaTokenProvider>
      </div>
    </div>
  );
}
