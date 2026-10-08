import { ParticipanteAppShell } from "@/components/participante-app-shell";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function ParticipanteLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await requireUser("EMPRENDEDOR");
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true },
  });

  return (
    <ParticipanteAppShell name={user?.name ?? sessionUser.name ?? "Participante"}>
      {children}
    </ParticipanteAppShell>
  );
}
