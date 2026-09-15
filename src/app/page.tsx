import Image from "next/image";

function FigureEvaluador() {
  return (
    <svg viewBox="0 0 160 160" className="h-16 w-16 shrink-0" aria-hidden="true">
      <rect width="160" height="160" rx="28" fill="#e8eef8" />
      <circle cx="80" cy="58" r="22" fill="#0a2156" />
      <rect x="44" y="88" width="72" height="46" rx="16" fill="#0a2156" />
      <rect x="98" y="40" width="34" height="26" rx="6" fill="#ffffff" stroke="#c8102e" strokeWidth="5" />
    </svg>
  );
}

function FigureEmprendedor() {
  return (
    <svg viewBox="0 0 160 160" className="h-16 w-16 shrink-0" aria-hidden="true">
      <rect width="160" height="160" rx="28" fill="#fde8ec" />
      <circle cx="80" cy="58" r="22" fill="#c8102e" />
      <rect x="44" y="88" width="72" height="46" rx="16" fill="#c8102e" />
      <rect x="58" y="100" width="44" height="8" rx="4" fill="#ffffff" />
      <rect x="58" y="114" width="28" height="8" rx="4" fill="#ffffff" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="hero-aiep relative flex min-h-screen flex-col pt-[20px]">
      <header className="flex h-20 w-full shrink-0 items-center justify-between overflow-visible bg-black/10 px-32 md:px-52">
        <Image
          src="/aiep.png"
          alt="AIEP, Universidad Andrés Bello"
          width={872}
          height={344}
          className="relative z-10 object-contain object-left brightness-0 invert"
          style={{ width: "auto", height: "3.75rem" }}
          priority
        />
        <Image
          src="/entel.png?v=9cc8f627"
          alt="Fondo 55+ Entel"
          width={827}
          height={545}
          className="relative z-10 object-contain object-right brightness-0 invert"
          style={{ width: "auto", height: "4.25rem" }}
          priority
          unoptimized
        />
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-start px-5 pb-8 pt-4">
        <Image
          src="/portada.png"
          alt="Desafío Nacional MiPyme Digital"
          width={1368}
          height={505}
          className="mb-8 w-full drop-shadow-[0_8px_18px_rgba(0,0,0,0.28)]"
          priority
        />
        <h1 className="mb-4 max-w-3xl text-center text-xl font-normal leading-tight text-white md:text-2xl">
          ingresar
        </h1>
        <div className="mx-auto grid w-full max-w-3xl items-start gap-10 md:grid-cols-2">
          <a
            href="/ingresar/emprendedor"
            className="card card-link card-portal flex min-h-28 items-center gap-4 p-4"
          >
            <FigureEmprendedor />
            <span className="font-heading text-2xl font-bold text-navy">Soy emprendedor</span>
          </a>
          <div className="flex flex-col gap-2">
            <a
              href="/ingresar/evaluador"
              className="card card-link card-portal flex min-h-28 items-center justify-end gap-4 p-4"
            >
              <span className="font-heading text-2xl font-bold text-navy">Soy evaluador</span>
              <FigureEvaluador />
            </a>
            <a
              href="/ingresar/admin"
              className="mr-[2px] self-end text-sm !text-white/50 hover:!text-white"
            >
              admin
            </a>
          </div>
        </div>
      </main>
      <footer className="mt-auto px-5 pb-5 pt-8">
        <p className="text-center text-sm text-white">
          © Dirección Nacional de Emprendimiento, Innovación y Desarrollo
        </p>
      </footer>
    </div>
  );
}
