import { describe, expect, it } from "vitest";
import { cloudinaryDeliveryType, cloudinaryImageTransformation } from "@/lib/storage/delivery";

describe("cloudinaryDeliveryType", () => {
  it("treats desafio-aiep assets as authenticated", () => {
    expect(cloudinaryDeliveryType("desafio-aiep/abc")).toBe("authenticated");
  });

  it("treats legacy public uploads as upload", () => {
    expect(cloudinaryDeliveryType("desafio-mipyme/abc")).toBe("upload");
  });
});

describe("cloudinaryImageTransformation", () => {
  it("skips on-the-fly transforms for authenticated images", () => {
    expect(cloudinaryImageTransformation("authenticated", "image", 960)).toBeUndefined();
  });

  it("keeps a bounded resize for public upload images", () => {
    expect(cloudinaryImageTransformation("upload", "image", 400)).toEqual([
      { width: 400, crop: "limit", fetch_format: "auto", quality: "auto" },
    ]);
  });
});
