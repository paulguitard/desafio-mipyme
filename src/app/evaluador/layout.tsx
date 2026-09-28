import { EvaluadorAppShell } from "@/components/evaluador-app-shell";
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
    <EvaluadorAppShell
      tourRole={esSupervisor ? "SUPERVISOR" : "EVALUADOR"}
      title={esSupervisor ? "Panel de supervisor" : "Panel de evaluador"}
      name={user?.name ?? sessionUser.name ?? (esSupervisor ? "Supervisor" : "Evaluador")}
    >
      {children}
    </EvaluadorAppShell>
  );
}
