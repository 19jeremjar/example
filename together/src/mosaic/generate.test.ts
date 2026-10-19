import { describe, expect, it } from "vitest";
import { SHOWS } from "../config/shows";
import { buildMosaic, tileIndexById } from "./generate";
import { maskFromCoverage } from "./stencil";

const show = SHOWS[0];

function syntheticMask() {
  const coverage = new Float32Array(show.cols * show.rows);
  // Two bands standing in for the arcs.
  for (let r = 0; r < show.rows; r++)
    for (let c = 0; c < show.cols; c++)
      if ((r > 20 && r < 44) || (r > 80 && r < 104)) coverage[r * show.cols + c] = c > 10 && c < 150 ? 1 : 0;
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
  });

  it("puts photos only inside the artwork", () => {
    const m = buildMosaic(show, syntheticMask());
    const letters = m.tiles.filter((t) => t.region === "letter");
    expect(m.letterCount).toBe(letters.length);
    expect(m.tiles.filter((t) => t.region === "ground").every((t) => !t.photoId)).toBe(true);
    expect(m.photos.size).toBe(Math.floor(letters.length * show.sampleFill));
  });

  it("offers only empty artwork tiles for new photos", () => {
    const m = buildMosaic(show, syntheticMask());
    expect(m.fillOrder.every((i) => !m.tiles[i].photoId && m.tiles[i].region === "letter")).toBe(true);
    expect(m.fillOrder.length).toBe(m.letterCount - m.photos.size);
  });

  it("marks configured photos as removed or broken", () => {
    const m = buildMosaic(show, syntheticMask());
    expect(m.photos.get(show.removedPhotoIds[0])?.removed).toBe(true);
    expect(m.photos.get(show.brokenPhotoIds[0])?.thumbnailUrl).toMatch(/^sample-broken:/);
  });
});

describe("stencil mask", () => {
  it("counts tiles that mostly show the artwork", () => {
    const coverage = new Float32Array(4);
    coverage.set([1, 0.6, 0.4, 0]);
    expect([...maskFromCoverage(2, 2, coverage).region]).toEqual([1, 1, 0, 0]);
  });
});
