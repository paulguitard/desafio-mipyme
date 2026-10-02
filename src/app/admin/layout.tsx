import { AdminAppShell } from "@/components/admin-app-shell";
import { AdminConfigLauncher } from "@/components/admin-config-modal";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("ADMIN");
  return (
    <AdminAppShell
      header={
        <AppHeader
          title="Administración"
          name={user.name ?? "Admin"}
          links={[
            { href: "/admin", label: "Inicio" },
            { href: "/admin/usuarios", label: "Usuarios" },
            { href: "/admin/formularios", label: "Formularios" },
            { href: "/admin/mentorias", label: "Asesorías" },
          ]}
          trailing={<AdminConfigLauncher />}
        />
      }
    >
      <div className="relative h-full min-h-0 overflow-hidden">{children}</div>
    </AdminAppShell>
  );
}
