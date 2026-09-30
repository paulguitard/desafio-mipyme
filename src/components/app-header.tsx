"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { BrandMark } from "@/components/brand-mark";

export function AppHeader({
  title,
  name,
  links,
  maxWidthClass = "max-w-6xl",
  trailing,
}: {
  title: string;
  name: string;
  links: { href: string; label: string }[];
  maxWidthClass?: string;
  trailing?: ReactNode;
}) {
  const pathname = usePathname();
  const menuId = useId();
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuAbierto) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuAbierto(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuAbierto]);

  return (
    <header className={`site-header shrink-0${menuAbierto ? " is-menu-open" : ""}`}>
      <div className={`mx-auto flex w-full flex-wrap items-center justify-between gap-4 px-5 py-4 ${maxWidthClass}`}>
        <div className="flex items-center gap-5">
          <BrandMark inverted href="/" />
          <div className="hidden border-l border-white/20 pl-5 sm:block">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">{title}</p>
            <p className="text-white">Hola, {name}</p>
          </div>
        </div>
        <div className="site-header-tools">
          <span className="site-header-tutorial-slot" data-tutorial-header-slot="" />
          <button
            type="button"
            className="site-header-menu-btn"
            data-tour="nav"
            aria-expanded={menuAbierto}
            aria-controls={menuId}
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMenuAbierto((abierto) => !abierto)}
          >
            {menuAbierto ? <IconoCerrar /> : <IconoMenu />}
          </button>
        </div>
        <nav
          id={menuId}
          className={`site-header-nav flex flex-wrap items-center gap-2${menuAbierto ? " is-open" : ""}`}
          data-tour="nav"
        >
          {links.map((link) => (
            <a
              key={link.href}
              className="rounded-md px-3 py-2 text-sm font-bold text-white/85 hover:bg-white/10 hover:text-white"
              href={link.href}
              onClick={() => setMenuAbierto(false)}
            >
              {link.label}
            </a>
          ))}
          {trailing}
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

function IconoMenu() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconoCerrar() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
