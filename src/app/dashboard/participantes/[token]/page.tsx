import { notFound } from "next/navigation";
import { DashboardParticipantes } from "@/components/dashboard-participantes";
import {
  cargarFilasDashboardParticipantes,
  leerTokenDashboardParticipantes,
} from "@/lib/dashboard-participantes";
import { esTokenPublicoValido } from "@/lib/ficha-publica";

export default async function DashboardParticipantesPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!esTokenPublicoValido(token)) notFound();
  const esperado = await leerTokenDashboardParticipantes();
  if (!esperado || token !== esperado) notFound();

  const filas = await cargarFilasDashboardParticipantes();
  return <DashboardParticipantes filas={filas} token={token} />;
}
