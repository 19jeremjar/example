import { describe, expect, it } from "vitest";
import { imageTier, photoMix, photoThresholds } from "./lod";

describe("level of detail", () => {
  it("shows solid colour at the fitted view and below 1.8×", () => {
    const fit = 4.4; // phone: 84 tiles across ~366px
    expect(photoMix(fit, fit)).toBe(0);
    expect(photoMix(fit * 1.79, fit)).toBe(0);
  });

  it("never reveals photos while tiles are tiny, even on a big screen", () => {
    const fit = 12; // desktop
    const { start } = photoThresholds(fit);
    expect(start).toBeGreaterThanOrEqual(fit * 1.8);
    expect(photoMix(fit * 1.2, fit)).toBe(0);
  });

  it("uses projected size when the zoom ratio alone would be too early", () => {
    const fit = 2; // a tiny projected size: 2.5× is still only 5px
    expect(photoMix(fit * 2.5, fit)).toBe(0);
    expect(photoMix(50, fit)).toBe(1);
  });

  it("transitions smoothly and reaches full photos", () => {
    const fit = 5.2;
    const { start, full } = photoThresholds(fit);
    const mid = photoMix((start + full) / 2, fit);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(photoMix(full, fit)).toBe(1);
    let prev = 0;
    for (let px = start; px <= full; px += 0.5) {
      const m = photoMix(px, fit);
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
  });

  it("switches to medium images only for large tiles", () => {
    expect(imageTier(40, 2)).toBe("thumb");
    expect(imageTier(120, 2)).toBe("medium");
  });
});
