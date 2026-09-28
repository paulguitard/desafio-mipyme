import { describe, expect, it } from "vitest";
import { appUploadUrl, cloudinaryPublicIdFromUrl, storedFilePublicId } from "@/lib/storage/public-id";

describe("cloudinaryPublicIdFromUrl", () => {
  it("extracts folder/id from a delivery URL", () => {
    expect(
      cloudinaryPublicIdFromUrl(
        "https://res.cloudinary.com/demo/image/upload/v123/desafio-mipyme/abc-def.webp",
      ),
    ).toBe("desafio-mipyme/abc-def");
  });
});

describe("appUploadUrl", () => {
  it("prefers relativePath over stored public URL", () => {
    expect(
      appUploadUrl({
        relativePath: "folder/id",
        url: "https://example.com/public.webp",
      }),
    ).toBe("/api/archivos/folder/id");
  });

  it("builds the API path from a Cloudinary URL when relativePath is missing", () => {
    expect(
      appUploadUrl({
        relativePath: "",
        url: "https://res.cloudinary.com/demo/image/upload/v12/desafio-mipyme/uuid",
      }),
    ).toBe("/api/archivos/desafio-mipyme/uuid");
  });

  it("appends a bounded width query for thumbnails", () => {
    expect(
      appUploadUrl(
        { relativePath: "desafio-mipyme/uuid" },
        { width: 720 },
      ),
    ).toBe("/api/archivos/desafio-mipyme/uuid?w=720");
  });
});

describe("storedFilePublicId", () => {
  it("parses a Cloudinary URL stored as relativePath", () => {
    expect(
      storedFilePublicId({
        relativePath: "https://res.cloudinary.com/demo/image/upload/desafio-mipyme/uuid.jpg",
      }),
    ).toBe("desafio-mipyme/uuid");
  });
});
