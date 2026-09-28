export type CloudinaryDeliveryType = "authenticated" | "upload";

export function cloudinaryDeliveryType(publicId: string): CloudinaryDeliveryType {
  return publicId.startsWith("desafio-aiep/") ? "authenticated" : "upload";
}

/** Los assets `authenticated` no admiten transformaciones al vuelo: hay que servir el original. */
export function cloudinaryImageTransformation(
  type: CloudinaryDeliveryType,
  resourceType: "image" | "raw",
  width?: number,
) {
  if (resourceType !== "image" || type === "authenticated") return undefined;
  return [
    {
      width: width ?? 1200,
      crop: "limit" as const,
      fetch_format: "auto" as const,
      quality: "auto" as const,
    },
  ];
}
