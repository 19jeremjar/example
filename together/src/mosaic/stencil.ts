import type { StencilConfig } from "../config/shows";
import type { VectorPath } from "../config/togetherLogo";
import type { TileRegion } from "./types";

/** Per-tile region map derived from the artwork. 0 ground, 1 letter. */
export type StencilMask = {
  cols: number;
  rows: number;
  region: Uint8Array;
  /** Middle of the empty space between the words, in tiles (where ADD YOUR PHOTO sits). */
  centre?: { x: number; y: number };
};

export const REGION_CODES: TileRegion[] = ["ground", "letter"];

/**
 * Vector painter for the artwork, in a design space `width` units wide. The renderer scales it to
 * the camera every frame, so the letter edges stay crisp at any zoom instead of following tiles.
 */
export type StencilPainter = {
  width: number;
  height: number;
  /** Fills the artwork shape with the current fill style. */
  fill(ctx: CanvasRenderingContext2D): void;
  /** Draws an outline ring around the shape with the current stroke style (placeholder art). */
  outline?(ctx: CanvasRenderingContext2D, lineWidth: number): void;
  /** Draws linework that sits on top of the mosaic with the current fill style (official art). */
  lines?(ctx: CanvasRenderingContext2D): void;
};

export const DESIGN_WIDTH = 1000;

/** Share of a tile that must show through the artwork for it to hold a photo. Edge tiles are clipped. */
const COVERAGE_THRESHOLD = 0.5;

/** Turns per-tile coverage (0–1) into regions. Pure, so it can be tested without a canvas. */
export function maskFromCoverage(cols: number, rows: number, coverage: Float32Array): StencilMask {
  const region = new Uint8Array(cols * rows);
  for (let i = 0; i < region.length; i++) if (coverage[i] >= COVERAGE_THRESHOLD) region[i] = 1;
  return { cols, rows, region };
}

/** Pixels per tile used when rasterising the artwork to decide which tiles are inside it. */
const SAMPLES = 6;

export function rasteriseMask(painter: StencilPainter, cols: number, rows: number): StencilMask {
  const width = cols * SAMPLES;
  const height = rows * SAMPLES;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D is not available");
  ctx.scale(width / painter.width, width / painter.width);
  ctx.fillStyle = "#000";
  painter.fill(ctx);
  const centre = findGapCentre(ctx, width, height, cols / width);
  if (painter.lines) {
    // Tiles hidden under the linework shouldn't hold photos.
    ctx.globalCompositeOperation = "destination-out";
    painter.lines(ctx);
    ctx.globalCompositeOperation = "source-over";
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
  return { ...maskFromCoverage(cols, rows, coverage), centre };
}

/**
 * Scans the middle column outwards from the vertical centre to find the bottom of the top word
 * and the top of the bottom word, and returns the point halfway between them (in tiles).
 */
function findGapCentre(ctx: CanvasRenderingContext2D, width: number, height: number, toTiles: number) {
  const x = Math.round(width / 2);
  const column = ctx.getImageData(x, 0, 1, height).data;
  const filled = (y: number) => column[y * 4 + 3] > 0;
  const mid = Math.round(height / 2);
  if (filled(mid)) return undefined;
  let top = mid;
  while (top > 0 && !filled(top - 1)) top--;
  let bottom = mid;
  while (bottom < height - 1 && !filled(bottom + 1)) bottom++;
  return { x: x * toTiles, y: ((top + bottom) / 2) * toTiles };
}

export async function createStencilPainter(config: StencilConfig, cols: number, rows: number): Promise<StencilPainter> {
  const width = DESIGN_WIDTH;
  const height = (DESIGN_WIDTH * rows) / cols;
  if (config.kind === "vector") return vectorPainter(config.art, width, height, config.pull ?? 0);
  return config.kind === "image" ? imagePainter(config.url, width, height) : placeholderArcsPainter(config.text, width, height);
}

type VectorArt = { width: number; height: number; sticker: VectorPath[]; lines: VectorPath[] };

/**
 * Official artwork as vector paths: the sticker silhouettes hold the mosaic and the linework is
 * drawn on top. Filled as Path2D every frame, so it is sharp at any zoom and costs very little.
 */
function vectorPainter(art: VectorArt, width: number, height: number, pull: number): StencilPainter {
  // Pull the two words towards each other by `pull` art units each, closing the middle gap.
  const artHeight = art.height - pull * 2;
  const margin = 0.03;
  const scale = Math.min((width * (1 - 2 * margin)) / art.width, (height * (1 - 2 * margin)) / artHeight);
  const place = new DOMMatrix()
    .translate((width - art.width * scale) / 2, (height - artHeight * scale) / 2)
    .scale(scale);
  const build = (paths: VectorPath[]) =>
    paths.map(({ m, d }) => {
      // m[5] is where the path starts vertically, enough to tell the top word from the bottom one.
      const shift = m[5] < art.height / 2 ? 0 : -pull * 2;
      const path = new Path2D();
      path.addPath(new Path2D(d), place.translate(0, shift).multiply(new DOMMatrix(m)));
      return path;
    });
  const sticker = build(art.sticker);
  const lines = build(art.lines);
  return {
    width,
    height,
    fill(ctx) {
      for (const p of sticker) ctx.fill(p);
    },
    lines(ctx) {
      for (const p of lines) ctx.fill(p);
    },
  };
}

/**
 * Official artwork from a transparent SVG/PNG. Its alpha is the shape; the outline ring is made by
 * stamping a tinted copy around a circle, since images can't be stroked.
 */
async function imagePainter(url: string, width: number, height: number): Promise<StencilPainter> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const margin = 0.05;
  const scale = Math.min((width * (1 - 2 * margin)) / img.naturalWidth, (height * (1 - 2 * margin)) / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const x = (width - w) / 2;
  const y = (height - h) / 2;
  // Tinted copy for the outline, rasterised once at a generous size.
  const tint = document.createElement("canvas");
  const res = 3;
  tint.width = Math.round(w * res);
  tint.height = Math.round(h * res);
  const tctx = tint.getContext("2d")!;
  tctx.drawImage(img, 0, 0, tint.width, tint.height);
  tctx.globalCompositeOperation = "source-in";
  let tinted = "";
  return {
    width,
    height,
    fill(ctx) {
      ctx.drawImage(img, x, y, w, h);
    },
    outline(ctx, lineWidth) {
      const colour = String(ctx.strokeStyle);
      if (colour !== tinted) {
        tctx.fillStyle = colour;
        tctx.fillRect(0, 0, tint.width, tint.height);
        tinted = colour;
      }
      const r = lineWidth / 2;
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        ctx.drawImage(tint, x + Math.cos(a) * r, y + Math.sin(a) * r, w, h);
      }
    },
  };
}

type Glyph = { ch: string; x: number; y: number; rotation: number };

/**
 * PLACEHOLDER ARTWORK. Sets `text` along an upper arc and a lower arc in a generic system font,
 * echoing the layout of the tour posters. It is not the official wordmark and should be replaced
 * with the supplied transparent SVG via `{ kind: "image", url }` in the show config.
 */
function placeholderArcsPainter(text: string, width: number, height: number): StencilPainter {
  const measure = document.createElement("canvas").getContext("2d")!;
  const family = `"Arial Black", "Helvetica Neue", Helvetica, Arial, sans-serif`;
  measure.font = `900 100px ${family}`;
  // Size the type so each arc spans ~90% of the width, capped by height.
  const fontPx = Math.min((width * 0.9 * 100) / measure.measureText(text).width, height * 0.22);
  const font = `900 ${fontPx}px ${family}`;
  measure.font = font;
  const cap = fontPx * 0.72;
  const margin = height * 0.09;
  const radius = width * 0.9;
  const glyphs = [
    ...arcGlyphs(measure, text, width / 2, margin + cap, radius, "top", fontPx),
    ...arcGlyphs(measure, text, width / 2, height - margin - cap, radius, "bottom", fontPx),
  ];
  const draw = (ctx: CanvasRenderingContext2D, paint: (ch: string) => void) => {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    for (const g of glyphs) {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.rotation);
      paint(g.ch);
      ctx.restore();
    }
    ctx.restore();
  };
  return {
    width,
    height,
    fill(ctx) {
      draw(ctx, (ch) => ctx.fillText(ch, 0, 0));
    },
    outline(ctx, lineWidth) {
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = "round";
      draw(ctx, (ch) => {
        ctx.strokeText(ch, 0, 0);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillText(ch, 0, 0);
      });
    },
  };
}

/**
 * Lays text along a circle. For "top" the baseline's highest point sits at (cx, y) and the text
 * bulges upward; for "bottom" the glyph tops' lowest point sits at (cx, y) and it curves like a smile.
 */
function arcGlyphs(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  radius: number,
  side: "top" | "bottom",
  fontPx: number,
): Glyph[] {
  const tracking = fontPx * -0.02;
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, w) => a + w + tracking, -tracking);
  // Bottom text sits on a larger effective radius (baseline outside), so measure along the glyph middle.
  const r = side === "top" ? radius : radius + fontPx * 0.72;
  let angle = -total / r / 2;
  return chars.map((ch, i) => {
    const a = angle + widths[i] / r / 2;
    angle += (widths[i] + tracking) / r;
    return side === "top"
      ? { ch, x: cx + radius * Math.sin(a), y: y + radius - radius * Math.cos(a), rotation: a }
      : { ch, x: cx + r * Math.sin(a), y: y - radius + r * Math.cos(a), rotation: -a };
  });
}
