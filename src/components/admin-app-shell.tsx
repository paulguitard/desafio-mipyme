"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";

export function AdminAppShell({
  header,
  children,
}: {
  header: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const tablaUsuarios = pathname.startsWith("/admin/usuarios");

  return (
    <AppShell
      tourRole="ADMIN"
      maxWidthClass={tablaUsuarios ? "max-w-[96rem]" : "max-w-6xl"}
      header={header}
    >
      {children}
    </AppShell>
  );
}
