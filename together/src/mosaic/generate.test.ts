import { describe, expect, it } from "vitest";
import { SHOWS } from "../config/shows";
import { buildMosaic, tileIndexById } from "./generate";
import { maskFromCoverage } from "./stencil";

const show = SHOWS[0];

function syntheticMask() {
  const coverage = new Float32Array(show.cols * show.rows);
  // Two bands standing in for the arcs.
  for (let r = 0; r < show.rows; r++)
    for (let c = 0; c < show.cols; c++) if ((r > 10 && r < 22) || (r > 45 && r < 57)) coverage[r * show.cols + c] = c > 5 && c < 66 ? 1 : 0;
  return maskFromCoverage(show.cols, show.rows, coverage);
}

describe("mosaic generation", () => {
  it("builds at least 2,500 tiles with unique ids", () => {
    const m = buildMosaic(show, syntheticMask());
    expect(m.tiles.length).toBe(show.cols * show.rows);
    expect(m.tiles.length).toBeGreaterThanOrEqual(2500);
    expect(new Set(m.tiles.map((t) => t.id)).size).toBe(m.tiles.length);
  });

  it("is deterministic", () => {
    const a = buildMosaic(show, syntheticMask());
    const b = buildMosaic(show, syntheticMask());
    expect(a.tiles).toEqual(b.tiles);
    expect([...a.photos.keys()]).toEqual([...b.photos.keys()]);
  });

  it("links photos and tiles both ways", () => {
    const m = buildMosaic(show, syntheticMask());
    for (const photo of m.photos.values()) {
      const tile = m.tiles[tileIndexById(m, photo.tileId)];
      expect(tile.photoId).toBe(photo.id);
      expect(photo.showId).toBe(show.id);
    }
    expect(m.photos.size).toBe(Math.floor(m.tiles.length * show.sampleFill));
  });

  it("colours letters brightly and the ground dark", () => {
    const m = buildMosaic(show, syntheticMask());
    const lum = (i: number) => (m.rgb[i * 3] + m.rgb[i * 3 + 1] + m.rgb[i * 3 + 2]) / 3;
    const letter = m.tiles.findIndex((t) => t.region === "letter");
    const ground = m.tiles.findIndex((t) => t.region === "ground");
    expect(m.tiles.some((t) => t.region === "outline")).toBe(true);
    expect(lum(letter)).toBeGreaterThan(90);
    expect(lum(ground)).toBeLessThan(40);
  });

  it("offers only empty tiles for new photos, letters first", () => {
    const m = buildMosaic(show, syntheticMask());
    expect(m.fillOrder.every((i) => !m.tiles[i].photoId)).toBe(true);
    expect(m.fillOrder.length).toBe(m.tiles.length - m.photos.size);
    const firstNonLetter = m.fillOrder.findIndex((i) => m.tiles[i].region !== "letter");
    expect(m.fillOrder.slice(firstNonLetter).every((i) => m.tiles[i].region !== "letter")).toBe(true);
  });

  it("marks configured photos as removed or broken", () => {
    const m = buildMosaic(show, syntheticMask());
    expect(m.photos.get(show.removedPhotoIds[0])?.removed).toBe(true);
    expect(m.photos.get(show.brokenPhotoIds[0])?.thumbnailUrl).toMatch(/^sample-broken:/);
  });
});

describe("stencil mask", () => {
  it("adds an outline ring around letters", () => {
    const coverage = new Float32Array(10 * 10);
    coverage[55] = 1;
    const mask = maskFromCoverage(10, 10, coverage);
    expect(mask.region[55]).toBe(2);
    expect(mask.region[54]).toBe(1);
    expect(mask.region[45]).toBe(1);
    expect(mask.region[0]).toBe(0);
  });
});
