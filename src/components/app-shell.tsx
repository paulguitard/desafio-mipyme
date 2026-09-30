import { TutorialLauncher } from "@/components/tutorial-launcher";
import type { Role } from "@/lib/roles";

export function AppShell({
  header,
  children,
  maxWidthClass,
  tourRole,
  className,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  maxWidthClass: string;
  tourRole: Role;
  className?: string;
}) {
  return (
    <div className={className ? `app-shell ${className}` : "app-shell"}>
      {header}
      <TutorialLauncher rol={tourRole} />
      <div className="app-shell-body">
        <div
          className={`app-shell-inner mx-auto flex h-full min-h-0 w-full flex-col overflow-hidden px-5 py-6 ${maxWidthClass}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
