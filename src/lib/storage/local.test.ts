import { describe, expect, it } from "vitest";
import { isSafeRelativeUploadPath, publicUploadUrl, uploadAbsolutePath } from "@/lib/storage/local";

describe("upload paths", () => {
  it("rejects traversal and absolute paths", () => {
    expect(isSafeRelativeUploadPath("../secret")).toBe(false);
    expect(isSafeRelativeUploadPath("/etc/passwd")).toBe(false);
    expect(isSafeRelativeUploadPath("a/../../b")).toBe(false);
    expect(isSafeRelativeUploadPath("ok/file.pdf")).toBe(true);
    expect(() => uploadAbsolutePath("../secret")).toThrow(/inválida/);
  });

  it("builds app-local file URLs without public Cloudinary links", () => {
    expect(
      publicUploadUrl({
        id: "1",
        originalName: "a.pdf",
        mimeType: "application/pdf",
        kind: "file",
        relativePath: "desafio-aiep/abc",
        url: "https://res.cloudinary.com/x/raw/upload/secret.pdf",
      }),
      ).toBe("/api/archivos/desafio-aiep/abc");
  });

  it("agrega embed=1 para capturar la miniatura en el mismo origen", () => {
    expect(
      publicUploadUrl(
        {
          id: "1",
          originalName: "foto.webp",
          mimeType: "image/webp",
          kind: "image",
          relativePath: "desafio-aiep/abc",
        },
        { width: 1200, embed: true },
      ),
    ).toBe("/api/archivos/desafio-aiep/abc?w=1200&embed=1");
  });
});
