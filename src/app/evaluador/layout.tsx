import { AppHeader } from "@/components/app-header";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";

export default async function EvaluadorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("EVALUADOR");
  return (
    <AppShell
      maxWidthClass="max-w-[110rem]"
      header={
        <AppHeader
          title="Panel de evaluador"
          name={user.name ?? "Evaluador"}
          links={[{ href: "/evaluador", label: "Mis evaluaciones" }]}
          maxWidthClass="max-w-[110rem]"
        />
      }
    >
      {children}
    </AppShell>
  );
}
