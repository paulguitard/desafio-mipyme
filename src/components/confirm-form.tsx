"use client";

export function ConfirmForm({
  action,
  message,
  children,
  className,
}: {
  action: (formData: FormData) => Promise<void>;
  message: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      className={className}
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
