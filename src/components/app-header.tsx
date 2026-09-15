import { logoutAction } from "@/actions/auth";
import { BrandMark } from "@/components/brand-mark";

export function AppHeader({
  title,
  name,
  links,
  maxWidthClass = "max-w-6xl",
}: {
  title: string;
  name: string;
  links: { href: string; label: string }[];
  maxWidthClass?: string;
}) {
  return (
    <header className="site-header shrink-0">
      <div className={`mx-auto flex w-full flex-wrap items-center justify-between gap-4 px-5 py-4 ${maxWidthClass}`}>
        <div className="flex items-center gap-5">
          <BrandMark inverted href="/" />
          <div className="hidden border-l border-white/20 pl-5 sm:block">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">{title}</p>
            <p className="text-white">Hola, {name}</p>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {links.map((link) => (
            <a
              key={link.href}
              className="rounded-md px-3 py-2 text-sm font-bold text-white/85 hover:bg-white/10 hover:text-white"
              href={link.href}
            >
              {link.label}
            </a>
          ))}
          <form action={logoutAction}>
            <button className="btn btn-primary min-h-11 px-4 text-sm" type="submit">
              Cerrar sesión
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
