import Image from "next/image";

export function BrandMark({
  href = "/",
  inverted = false,
  compact = false,
}: {
  href?: string;
  inverted?: boolean;
  compact?: boolean;
}) {
  const height = compact ? "2.25rem" : "2.75rem";
  return (
    <a href={href} className="flex items-center gap-3 no-underline" aria-label="Inicio">
      <Image
        src="/aiep-header.png"
        alt="AIEP, Universidad Andrés Bello"
        width={872}
        height={344}
        className="object-contain object-left"
        style={{ width: "auto", height }}
        priority
      />
      <Image
        src="/entel.png"
        alt="Fondo 55+ Entel"
        width={827}
        height={545}
        className={`object-contain object-left${inverted ? " brightness-0 invert" : ""}`}
        style={{ width: "auto", height }}
        priority
      />
    </a>
  );
}
