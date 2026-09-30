import Image from "next/image";

export function BrandMark({
  href = "/",
  inverted = false,
}: {
  href?: string;
  inverted?: boolean;
}) {
  return (
    <a href={href} className="flex items-center gap-4 no-underline" aria-label="Inicio">
      <Image
        src="/aiep-header.png"
        alt="AIEP, Universidad Andrés Bello"
        width={872}
        height={344}
        className="object-contain object-left"
        style={{ width: "auto", height: "2.75rem" }}
        priority
      />
      <Image
        src="/entel.png"
        alt="Fondo 55+ Entel"
        width={827}
        height={545}
        className={`object-contain object-left${inverted ? " brightness-0 invert" : ""}`}
        style={{ width: "auto", height: "2.75rem" }}
        priority
      />
    </a>
  );
}
