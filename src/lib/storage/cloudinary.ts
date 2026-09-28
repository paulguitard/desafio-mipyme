import "@/lib/env";
import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import type { StoredFile } from "@/lib/preguntas";
import { prepareUploadBuffer } from "@/lib/storage/compress";
import {
  cloudinaryDeliveryType,
  cloudinaryImageTransformation,
} from "@/lib/storage/delivery";
import { deleteLocalUpload } from "@/lib/storage/local";

const FOLDER = "desafio-aiep";
const SIGNED_TTL_SECONDS = 5 * 60;

function credentials() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("Faltan CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET.");
  }
  return { cloud_name, api_key, api_secret };
}

function configured() {
  const { cloud_name, api_key, api_secret } = credentials();
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
}

type CloudinaryUpload = {
  public_id: string;
  secure_url: string;
};

async function uploadBuffer(
  buffer: Buffer,
  options: {
    publicId: string;
    resourceType: "image" | "raw";
    originalName: string;
    mimeType: string;
  },
): Promise<CloudinaryUpload> {
  const { cloud_name, api_key, api_secret } = credentials();
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: options.mimeType }),
    options.originalName,
  );
  form.append("folder", FOLDER);
  form.append("public_id", options.publicId);
  form.append("overwrite", "false");
  form.append("type", "authenticated");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud_name}/${options.resourceType}/upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${api_key}:${api_secret}`).toString("base64")}`,
      },
      body: form,
    },
  );
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Cloudinary ${response.status}: ${text.slice(0, 500)}`);
  }
  const parsed = JSON.parse(text) as CloudinaryUpload;
  if (!parsed.public_id || !parsed.secure_url) {
    throw new Error("Cloudinary no devolvió public_id o secure_url.");
  }
  return parsed;
}

export function signedCloudinaryUrl(
  publicId: string,
  options?: {
    resourceType?: "image" | "raw";
    width?: number;
    expiresInSeconds?: number;
    type?: "authenticated" | "upload";
  },
) {
  configured();
  const resourceType = options?.resourceType ?? "image";
  const type = options?.type ?? cloudinaryDeliveryType(publicId);
  const expires_at = Math.floor(Date.now() / 1000) + (options?.expiresInSeconds ?? SIGNED_TTL_SECONDS);
  const transformation = cloudinaryImageTransformation(type, resourceType, options?.width);
  return cloudinary.url(publicId, {
    type,
    resource_type: resourceType,
    sign_url: true,
    secure: true,
    expires_at,
    ...(transformation ? { transformation } : {}),
  });
}

export function cloudinaryDeliveryUrl(
  publicId: string,
  options?: {
    resourceType?: "image" | "raw";
    width?: number;
  },
) {
  configured();
  const resourceType = options?.resourceType ?? "image";
  const type = cloudinaryDeliveryType(publicId);
  const transformation = cloudinaryImageTransformation(type, resourceType, options?.width);
  return cloudinary.url(publicId, {
    type,
    resource_type: resourceType,
    sign_url: type === "authenticated",
    secure: true,
    ...(transformation ? { transformation } : {}),
  });
}

export async function saveUpload(
  file: File,
  kind: "file" | "image",
  options?: { maxFileBytes?: number },
): Promise<StoredFile> {
  const prepared = await prepareUploadBuffer(file, kind, options);
  const id = randomUUID();
  const result = await uploadBuffer(prepared.buffer, {
    publicId: id,
    resourceType: kind === "image" ? "image" : "raw",
    originalName: prepared.originalName,
    mimeType: prepared.mimeType,
  });

  return {
    id,
    originalName: prepared.originalName,
    mimeType: prepared.mimeType,
    kind,
    relativePath: result.public_id,
  };
}

export async function deleteUpload(relativePath: string) {
  if (!relativePath) return;

  if (process.env.CLOUDINARY_CLOUD_NAME && relativePath.includes("/")) {
    configured();
    for (const resource_type of ["image", "raw"] as const) {
      for (const type of ["authenticated", "upload"] as const) {
        try {
          const result = await cloudinary.uploader.destroy(relativePath, {
            resource_type,
            type,
            invalidate: true,
          });
          if (result.result === "ok") return;
        } catch {
          /* probar otra combinación o el disco local */
        }
      }
    }
  }

  await deleteLocalUpload(relativePath).catch(() => undefined);
}
