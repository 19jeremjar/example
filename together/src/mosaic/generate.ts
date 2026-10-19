import type { ShowConfig } from "../config/shows";
import { hexToRgb, mix, rgbToHex, type RGB } from "./color";
import { mulberry32, shuffleInPlace } from "./random";
import { REGION_CODES, type StencilMask } from "./stencil";
import type { Mosaic, MosaicPhoto, MosaicTile } from "./types";

const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];


export const tileId = (row: number, column: number) => `t-${row}-${column}`;

export function sampleUrls(showId: string, photoId: string, broken: boolean) {
  const base = broken ? `sample-broken://${showId}/${photoId}` : `sample://${showId}/${photoId}`;
  return { thumbnailUrl: `${base}/thumb`, mediumUrl: `${base}/medium`, fullImageUrl: `${base}/full` };
}

/**
 * Builds a show's mosaic deterministically from its config and stencil.
 * The same inputs always give the same tiles, colours and photo positions.
 * Only tiles inside the artwork hold photos; the ground around it stays static.
 */
export function buildMosaic(show: ShowConfig, mask: StencilMask): Mosaic {
  const { cols, rows } = show;
  if (mask.cols !== cols || mask.rows !== rows) throw new Error("Stencil size does not match the show grid");
  const rand = mulberry32(show.seed);

  // Each word gets its own left-to-right gradient. Words are stacked, so split the grid into
  // equal horizontal bands and measure each word's horizontal extent.
  const gradients = show.wordGradients.map(([a, b]) => [hexToRgb(a), hexToRgb(b)] as const);
  const wordOf = (row: number) => Math.min(gradients.length - 1, Math.floor((row / rows) * gradients.length));
  const left = gradients.map(() => cols);
  const right = gradients.map(() => 0);
  for (let i = 0; i < mask.region.length; i++) {
    if (mask.region[i] !== 1) continue;
    const w = wordOf(Math.floor(i / cols));
    left[w] = Math.min(left[w], i % cols);
    right[w] = Math.max(right[w], i % cols);
  }

  const tiles: MosaicTile[] = [];
  const letters: number[] = [];
  // Every cell gets a colour, even outside the artwork, so clipped edge tiles never show gaps.
  // The region says whether the cell shows enough of the artwork to hold a photo.
  const rgb = new Uint8ClampedArray(cols * rows * 3);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < cols; column++) {
      const i = row * cols + column;
      const region = REGION_CODES[mask.region[i]];
      const jitter = rand() * 2 - 1;
      const w = wordOf(row);
      const t = Math.min(1, Math.max(0, (column - left[w]) / Math.max(1, right[w] - left[w]) + (rand() - 0.5) * 0.04));
      const band = mix(gradients[w][0], gradients[w][1], t);
      const color = jitter > 0 ? mix(band, WHITE, jitter * 0.08) : mix(band, BLACK, -jitter * 0.06);
      rgb[i * 3] = color[0];
      rgb[i * 3 + 1] = color[1];
      rgb[i * 3 + 2] = color[2];
      tiles.push({ id: tileId(row, column), row, column, color: rgbToHex(color), region });
      if (region === "letter") letters.push(i);
    }
  }

  // Sample photos occupy a seeded random subset of the artwork; the rest wait for contributions.
  const order = shuffleInPlace(letters.slice(), rand);
  const sampleCount = Math.floor(order.length * show.sampleFill);
  const photos = new Map<string, MosaicPhoto>();
  const removed = new Set(show.removedPhotoIds);
  const broken = new Set(show.brokenPhotoIds);
  for (let k = 0; k < sampleCount; k++) {
    const tile = tiles[order[k]];
    const id = String(k + 1);
    tile.photoId = id;
    photos.set(id, {
      id,
      ...sampleUrls(show.id, id, broken.has(id)),
      showId: show.id,
      tileId: tile.id,
      source: "sample",
      removed: removed.has(id) || undefined,
    });
  }

  return {
    show,
    cols,
    rows,
    tiles,
    rgb,
    photos,
    letterCount: letters.length,
    fillOrder: order.slice(sampleCount),
    centre: mask.centre ?? { x: cols / 2, y: rows / 2 },
  };
}

export function tileIndexById(mosaic: Mosaic, id: string): number {
  const m = /^t-(\d+)-(\d+)$/.exec(id);
  if (!m) return -1;
  const row = Number(m[1]);
  const col = Number(m[2]);
  if (row >= mosaic.rows || col >= mosaic.cols) return -1;
  return row * mosaic.cols + col;
}
