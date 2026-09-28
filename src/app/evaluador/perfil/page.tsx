import { redirect } from "next/navigation";
import { requireCatalogoEvaluador } from "@/lib/session";

export default async function EvaluadorPerfilPage() {
  await requireCatalogoEvaluador();
  redirect("/evaluador");
}
