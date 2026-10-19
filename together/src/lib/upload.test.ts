import { describe, expect, it } from "vitest";
import { clampCrop, validateImageFile } from "./upload";

describe("upload validation", () => {
  it("accepts common image types under the limit", () => {
    expect(validateImageFile({ type: "image/jpeg", size: 2_000_000 }).ok).toBe(true);
    expect(validateImageFile({ type: "image/png", size: 1 }).ok).toBe(true);
  });
  it("rejects other types, HEIC, empty and oversized files", () => {
    expect(validateImageFile({ type: "application/pdf", size: 10 }).ok).toBe(false);
    expect(validateImageFile({ type: "image/heic", size: 10 }).ok).toBe(false);
    expect(validateImageFile({ type: "", size: 10, name: "IMG_1.HEIC" }).ok).toBe(false);
    expect(validateImageFile({ type: "image/jpeg", size: 0 }).ok).toBe(false);
    expect(validateImageFile({ type: "image/jpeg", size: 10 * 1024 * 1024 + 1 }).ok).toBe(false);
  });
});

describe("crop clamping", () => {
  it("never lets the image leave gaps in the square", () => {
    const c = clampCrop(400, 200, 100, 0.1, 50, 50);
    expect(c.scale).toBe(0.5);
    expect(c.x).toBe(0);
    expect(c.y).toBe(0);
    const far = clampCrop(400, 200, 100, 0.5, -999, -999);
    expect(far.x).toBe(100 - 200);
    expect(far.y).toBe(0);
  });
});
