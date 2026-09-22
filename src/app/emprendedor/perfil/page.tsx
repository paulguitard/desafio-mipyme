import { PerfilForm } from "@/components/perfil-form";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { notFound } from "next/navigation";

export default async function EmprendedorPerfilPage() {
  const sessionUser = await requireUser("EMPRENDEDOR");
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true, email: true },
  });
  if (!user) notFound();

  return (
    <div className="page-workspace grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-6 overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-3xl font-extrabold text-navy">Mi perfil</h1>
        <p className="mt-1 text-muted">Actualiza cómo aparece tu nombre en la plataforma.</p>
      </div>
      <div className="page-scroll min-h-0 overflow-y-auto pr-1">
        <PerfilForm name={user.name} email={user.email} />
      </div>
    </div>
  );
}
