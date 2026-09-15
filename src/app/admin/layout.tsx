import { AppHeader } from "@/components/app-header";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("ADMIN");
  return (
    <AppShell
      maxWidthClass="max-w-6xl"
      header={
        <AppHeader
          title="Administración"
          name={user.name ?? "Admin"}
          links={[
            { href: "/admin", label: "Inicio" },
            { href: "/admin/usuarios", label: "Usuarios" },
            { href: "/admin/formularios", label: "Formularios" },
            { href: "/admin/convocatorias", label: "Convocatorias" },
          ]}
        />
      }
    >
      <div className="relative h-full min-h-0 overflow-hidden">{children}</div>
    </AppShell>
  );
}
