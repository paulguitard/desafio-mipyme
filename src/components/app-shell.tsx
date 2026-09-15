export function AppShell({
  header,
  children,
  maxWidthClass,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  maxWidthClass: string;
}) {
  return (
    <div className="app-shell">
      {header}
      <div className="app-shell-body">
        <div className={`mx-auto flex h-full min-h-0 w-full flex-col overflow-hidden px-5 py-6 ${maxWidthClass}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
