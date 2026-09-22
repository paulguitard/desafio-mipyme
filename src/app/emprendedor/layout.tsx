import { AppHeader } from "@/components/app-header";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function EmprendedorLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await requireUser("EMPRENDEDOR");
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true },
  });

  return (
    <AppShell
      maxWidthClass="max-w-4xl"
      header={
        <AppHeader
          title="Panel de emprendedor"
          name={user?.name ?? sessionUser.name ?? "Emprendedor"}
          links={[
            { href: "/emprendedor", label: "Panel" },
            { href: "/emprendedor/perfil", label: "Mi Perfil" },
          ]}
        />
      }
    >
      {children}
    </AppShell>
  );
}
