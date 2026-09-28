import { cloudinaryDeliveryUrl } from "@/lib/storage/cloudinary";
import {
  appUploadUrl,
  looksLikeCloudinaryPublicId,
  storedFilePublicId,
} from "@/lib/storage/public-id";

type StoredFileRef = { relativePath?: string; url?: string };

/** URL de CDN firmada (sin pasar por /api/archivos). Solo usar en servidor. */
export function directStoredImageUrl(file: StoredFileRef, options?: { width?: number }): string {
  const publicId = storedFilePublicId(file);
  if (publicId && looksLikeCloudinaryPublicId(publicId) && process.env.CLOUDINARY_CLOUD_NAME) {
    try {
      return cloudinaryDeliveryUrl(publicId, {
        resourceType: "image",
        width: options?.width,
      });
    } catch {
      return appUploadUrl(file, options);
    }
  }
  return appUploadUrl(file, options);
}
