function IconoAtras() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M15 6 9 12l6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const clases =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-md text-navy transition-colors hover:bg-navy-soft";

export function BotonAtras({
  href,
  onClick,
  label = "Atrás",
}: {
  href?: string;
  onClick?: () => void;
  label?: string;
}) {
  if (href) {
    return (
      <a className={clases} href={href} aria-label={label} title={label}>
        <IconoAtras />
      </a>
    );
  }

  return (
    <button className={clases} type="button" onClick={onClick} aria-label={label} title={label}>
      <IconoAtras />
    </button>
  );
}
