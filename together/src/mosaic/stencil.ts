import type { StencilConfig } from "../config/shows";
import type { TileRegion } from "./types";

/** Per-tile region map derived from the artwork. 0 ground, 1 outline, 2 letter. */
export type StencilMask = {
  cols: number;
  rows: number;
  region: Uint8Array;
};

export const REGION_CODES: TileRegion[] = ["ground", "outline", "letter"];

/** How much of a tile must be covered by the artwork to count as "letter". */
const COVERAGE_THRESHOLD = 0.42;
/** Outline ring width in tiles, like the white sticker border on the reference artwork. */
const OUTLINE_RADIUS = 1.5;

/**
 * Turns per-tile coverage (0–1) into regions, adding an outline ring around the letters.
 * Pure, so it can be tested without a canvas.
 */
export function maskFromCoverage(cols: number, rows: number, coverage: Float32Array): StencilMask {
  const region = new Uint8Array(cols * rows);
  for (let i = 0; i < region.length; i++) if (coverage[i] >= COVERAGE_THRESHOLD) region[i] = 2;
  const r = Math.ceil(OUTLINE_RADIUS);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      if (region[i] !== 0) continue;
      search: for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > OUTLINE_RADIUS * OUTLINE_RADIUS) continue;
          const y = row + dy;
          const x = col + dx;
          if (y < 0 || y >= rows || x < 0 || x >= cols) continue;
          if (region[y * cols + x] === 2) {
            region[i] = 1;
            break search;
          }
        }
      }
    }
  }
  return { cols, rows, region };
}

/** Pixels per tile used when rasterising the artwork. */
const SAMPLES = 8;

export async function buildStencilMask(config: StencilConfig, cols: number, rows: number): Promise<StencilMask> {
  const width = cols * SAMPLES;
  const height = rows * SAMPLES;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D is not available");

  if (config.kind === "image") {
    const img = new Image();
    img.src = config.url;
    await img.decode();
    // Contain-fit with a small margin.
    const margin = 0.04;
    const scale = Math.min((width * (1 - 2 * margin)) / img.naturalWidth, (height * (1 - 2 * margin)) / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
  } else {
    drawPlaceholderArcs(ctx, config.text, width, height);
  }

  const data = ctx.getImageData(0, 0, width, height).data;
  const coverage = new Float32Array(cols * rows);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let sum = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        const base = ((row * SAMPLES + sy) * width + col * SAMPLES) * 4 + 3;
        for (let sx = 0; sx < SAMPLES; sx++) sum += data[base + sx * 4];
      }
      coverage[row * cols + col] = sum / (255 * SAMPLES * SAMPLES);
    }
  }
  return maskFromCoverage(cols, rows, coverage);
}

/**
 * PLACEHOLDER ARTWORK. Sets `text` along an upper arc and a lower arc in a generic system font,
 * echoing the layout of the tour posters. It is not the official wordmark and should be replaced
 * with the supplied transparent SVG via `{ kind: "image", url }` in the show config.
 */
function drawPlaceholderArcs(ctx: CanvasRenderingContext2D, text: string, width: number, height: number) {
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const family = `"Arial Black", "Helvetica Neue", Helvetica, Arial, sans-serif`;
  // Size the type so each arc spans ~94% of the width, capped by height.
  ctx.font = `900 100px ${family}`;
  const at100 = ctx.measureText(text).width;
  const fontPx = Math.min((width * 0.94 * 100) / at100, height * 0.24);
  ctx.font = `900 ${fontPx}px ${family}`;
  const cap = fontPx * 0.72;
  const margin = height * 0.06;
  const radius = width * 0.9;
  drawArcText(ctx, text, width / 2, margin + cap, radius, "top", fontPx);
  drawArcText(ctx, text, width / 2, height - margin - cap, radius, "bottom", fontPx);
}

/**
 * Draws text along a circle. For "top" the baseline's highest point sits at (cx, y) and the text
 * bulges upward; for "bottom" the glyph tops' lowest point sits at (cx, y) and it curves like a smile.
 */
function drawArcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  radius: number,
  side: "top" | "bottom",
  fontPx: number,
) {
  const tracking = fontPx * -0.02;
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, w) => a + w + tracking, -tracking);
  // Bottom text sits on a larger effective radius (baseline outside), so measure along the glyph middle.
  const r = side === "top" ? radius : radius + fontPx * 0.72;
  let angle = -total / r / 2;
  [...text].forEach((ch, i) => {
    const a = angle + widths[i] / r / 2;
    ctx.save();
    if (side === "top") {
      ctx.translate(cx, y + radius);
      ctx.rotate(a);
      ctx.fillText(ch, 0, -radius);
    } else {
      ctx.translate(cx, y - radius);
      ctx.rotate(-a);
      ctx.fillText(ch, 0, r);
    }
    ctx.restore();
    angle += (widths[i] + tracking) / r;
  });
}
