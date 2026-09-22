import { AppHeader } from "@/components/app-header";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { requireCatalogoEvaluador } from "@/lib/session";

export default async function EvaluadorLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await requireCatalogoEvaluador();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true },
  });
  const esSupervisor = sessionUser.role === "SUPERVISOR";

  return (
    <AppShell
      maxWidthClass="max-w-[110rem]"
      header={
        <AppHeader
          title={esSupervisor ? "Panel de supervisor" : "Panel de evaluador"}
          name={user?.name ?? sessionUser.name ?? (esSupervisor ? "Supervisor" : "Evaluador")}
          links={[
            { href: "/evaluador", label: "Panel" },
            { href: "/evaluador/perfil", label: "Mi Perfil" },
          ]}
          maxWidthClass="max-w-[110rem]"
        />
      }
    >
      {children}
    </AppShell>
  );
}
