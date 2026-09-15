import Image from "next/image";

export function BrandMark({
  href = "/",
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
        src="/entel2.png"
        alt="Fondo 55+ Entel"
        width={802}
        height={530}
        className="object-contain object-left"
        style={{ width: "auto", height: "2.75rem" }}
        priority
      />
    </a>
  );
}
