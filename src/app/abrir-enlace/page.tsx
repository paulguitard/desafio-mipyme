import { headers } from "next/headers";
import { AbrirEnlaceCliente } from "@/app/abrir-enlace/abrir-enlace-cliente";
import { getAppBaseUrl } from "@/lib/app-url";
import { parseDestinoAdjuntoPdf, scriptAperturaAdjuntoPdf } from "@/lib/pdf-enlace-externo";

async function origenesDeLaPeticion() {
  const h = await headers();
  const host = (h.get("x-forwarded-host") || h.get("host") || "").split(",")[0].trim();
  const proto = (h.get("x-forwarded-proto") || "https").split(",")[0].trim();
  const desdeReq = host ? `${proto}://${host}` : "";
  return [getAppBaseUrl(), desdeReq].filter(Boolean);
}

export default async function AbrirEnlacePage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to = "" } = await searchParams;
  let dest: string | null = null;
  for (const origen of await origenesDeLaPeticion()) {
    dest = parseDestinoAdjuntoPdf(to, origen);
    if (dest) break;
  }

  return (
    <main className="page-card mx-auto max-w-lg p-6">
      <h1 className="font-heading text-xl font-bold text-navy">Abrir adjunto</h1>
      {dest ? (
        <>
          <script dangerouslySetInnerHTML={{ __html: scriptAperturaAdjuntoPdf(dest) }} />
          <AbrirEnlaceCliente dest={dest} />
        </>
      ) : (
        <p className="mt-3 text-muted">Este enlace no es válido.</p>
      )}
    </main>
  );
}
