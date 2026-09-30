import { AppHeader } from "@/components/app-header";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function ParticipanteLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await requireUser("EMPRENDEDOR");
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true },
  });

  return (
    <AppShell
      className="rol-movil"
      tourRole="EMPRENDEDOR"
      maxWidthClass="max-w-none"
      header={
        <AppHeader
          title="Panel de participante"
          name={user?.name ?? sessionUser.name ?? "Participante"}
          links={[
            { href: "/participante", label: "Panel" },
            { href: "/participante/perfil", label: "Mi Perfil" },
          ]}
        />
      }
    >
      {children}
    </AppShell>
  );
}
