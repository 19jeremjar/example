/**
 * Level-of-detail rules. Photo visibility depends on the tile's projected size in CSS pixels,
 * and never kicks in before the PRD's zoom thresholds (relative to the fitted view).
 *
 *   1.0×–1.8×  solid colour artwork, no image requests
 *   1.8×–2.5×  colour-to-photo transition, thumbnails for visible tiles
 *   2.5×+      Polaroid tiles
 */
export const LOD = {
  /** Photos start fading in once tiles are at least this big on screen… */
  photoStartPx: 22,
  /** …and are fully revealed at this size. */
  photoFullPx: 44,
  startFitMultiple: 1.8,
  fullFitMultiple: 2.5,
  /** Above this many device pixels per tile, use the medium image instead of the thumbnail. */
  mediumDevicePx: 150,
  /** Captions on the Polaroid's bottom edge appear above this tile size. */
  captionPx: 150,
} as const;

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function photoThresholds(fitTilePx: number) {
  const start = Math.max(LOD.photoStartPx, fitTilePx * LOD.startFitMultiple);
  const full = Math.max(LOD.photoFullPx, fitTilePx * LOD.fullFitMultiple, start + 1);
  return { start, full };
}

/** 0 = solid colour, 1 = photo fully revealed. */
export function photoMix(tilePx: number, fitTilePx: number): number {
  const { start, full } = photoThresholds(fitTilePx);
  if (tilePx <= start) return 0;
  return smoothstep(start, full, tilePx);
}

export type ImageTier = "thumb" | "medium";

export function imageTier(tilePx: number, dpr: number): ImageTier {
  return tilePx * dpr > LOD.mediumDevicePx ? "medium" : "thumb";
}
