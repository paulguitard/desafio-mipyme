import { AppHeader } from "@/components/app-header";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";

export default async function EmprendedorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("EMPRENDEDOR");
  return (
    <AppShell
      maxWidthClass="max-w-4xl"
      header={
        <AppHeader
          title="Panel de emprendedor"
          name={user.name ?? "Emprendedor"}
          links={[{ href: "/emprendedor", label: "Mi panel" }]}
        />
      }
    >
      {children}
    </AppShell>
  );
}
