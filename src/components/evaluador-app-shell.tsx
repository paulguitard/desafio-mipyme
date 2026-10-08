"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AppShell } from "@/components/app-shell";
import { ANCHO_DETALLE } from "@/lib/ancho-layout";
import type { Role } from "@/lib/roles";

const ANCHO_PAGINA = "max-w-6xl";

export function EvaluadorAppShell({
  title,
  name,
  tourRole,
  children,
}: {
  title: string;
  name: string;
  tourRole: Role;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const detalleTresColumnas =
    pathname.startsWith("/evaluador/evaluaciones/") || pathname.startsWith("/evaluador/supervision/");
  const maxWidthClass = detalleTresColumnas ? ANCHO_DETALLE : ANCHO_PAGINA;

  return (
    <AppShell
      className="rol-movil"
      tourRole={tourRole}
      maxWidthClass={maxWidthClass}
      header={
        <AppHeader
          title={title}
          name={name}
          links={[{ href: "/evaluador", label: "Panel" }]}
          maxWidthClass={maxWidthClass}
        />
      }
    >
      {children}
    </AppShell>
  );
}
