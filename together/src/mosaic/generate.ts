import { BAND_STOPS, PALETTE } from "../config/palette";
import type { ShowConfig } from "../config/shows";
import { gradient, hexToRgb, mix, rgbToHex, type RGB } from "./color";
import { mulberry32, shuffleInPlace } from "./random";
import { REGION_CODES, type StencilMask } from "./stencil";
import type { Mosaic, MosaicPhoto, MosaicTile } from "./types";

const BANDS = BAND_STOPS.map(hexToRgb);
const INK = hexToRgb(PALETTE.ink);
const PAPER = hexToRgb(PALETTE.paper);
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
 */
export function buildMosaic(show: ShowConfig, mask: StencilMask): Mosaic {
  const { cols, rows } = show;
  if (mask.cols !== cols || mask.rows !== rows) throw new Error("Stencil size does not match the show grid");
  const rand = mulberry32(show.seed);

  // The letter gradient spans from the top of the artwork to its bottom, so both arcs use all bands.
  let letterTop = rows;
  let letterBottom = 0;
  for (let i = 0; i < mask.region.length; i++) {
    if (mask.region[i] === 2) {
      const row = Math.floor(i / cols);
      letterTop = Math.min(letterTop, row);
      letterBottom = Math.max(letterBottom, row);
    }
  }
  const span = Math.max(1, letterBottom - letterTop);

  const tiles: MosaicTile[] = [];
  const rgb = new Uint8ClampedArray(cols * rows * 3);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < cols; column++) {
      const i = row * cols + column;
      const region = REGION_CODES[mask.region[i]];
      const jitter = rand() * 2 - 1;
      const band = gradient(BANDS, (row - letterTop) / span + (rand() - 0.5) * 0.04);
      let color: RGB;
      if (region === "letter") {
        color = jitter > 0 ? mix(band, WHITE, jitter * 0.1) : mix(band, BLACK, -jitter * 0.08);
      } else if (region === "outline") {
        color = mix(PAPER, BLACK, 0.02 + rand() * 0.05);
      } else {
        color = mix(mix(INK, band, 0.05), WHITE, 0.015 + rand() * 0.035);
      }
      rgb[i * 3] = color[0];
      rgb[i * 3 + 1] = color[1];
      rgb[i * 3 + 2] = color[2];
      tiles.push({ id: tileId(row, column), row, column, color: rgbToHex(color), region });
    }
  }

  // Sample photos occupy a seeded random subset of tiles; the rest wait for contributions.
  const order = shuffleInPlace(
    tiles.map((_, i) => i),
    rand,
  );
  const sampleCount = Math.floor(tiles.length * show.sampleFill);
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

  // New photos fill the letters first, then the outline, then the ground.
  const priority = { letter: 0, outline: 1, ground: 2 } as const;
  const fillOrder = order
    .slice(sampleCount)
    .sort((a, b) => priority[tiles[a].region] - priority[tiles[b].region]);

  return { show, cols, rows, tiles, rgb, photos, fillOrder };
}

export function tileIndexById(mosaic: Mosaic, id: string): number {
  const m = /^t-(\d+)-(\d+)$/.exec(id);
  if (!m) return -1;
  const row = Number(m[1]);
  const col = Number(m[2]);
  if (row >= mosaic.rows || col >= mosaic.cols) return -1;
  return row * mosaic.cols + col;
}
