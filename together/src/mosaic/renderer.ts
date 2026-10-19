import { PALETTE } from "../config/palette";
import { type Camera, type Viewport, fitZoom, visibleRange } from "./camera";
import type { ImageCache } from "./imageCache";
import { imageSize } from "./imageLoader";
import { LOD, imageTier, photoMix } from "./lod";
import type { Mosaic, MosaicPhoto } from "./types";

export type RenderState = {
  camera: Camera;
  /** Tile to outline, e.g. a fan's new photo or the open detail view. */
  highlight?: { index: number; start: number };
  now: number;
};

export type FrameInfo = { mix: number; tilePx: number; visibleTiles: number; animating: boolean; renderMs?: number };

const HIGHLIGHT_MS = 2600;
/** Polaroid proportions relative to the tile: thin sides and top, thicker bottom. */
const FRAME_SIDE = 0.055;
const FRAME_BOTTOM = 0.19;
const GAP = 0.07;

/**
 * Canvas renderer for the mosaic. At low zoom it draws a single pre-rendered bitmap of the colour
 * artwork (one pixel per tile). Once tiles are big enough it draws only the visible ones, blending
 * from solid colour into Polaroid frames and photos.
 */
export class MosaicRenderer {
  private ctx: CanvasRenderingContext2D;
  private base: HTMLCanvasElement;
  private colors: string[];
  private vp: Viewport = { width: 1, height: 1, insets: { top: 0, right: 0, bottom: 0, left: 0 } };
  private dpr = 1;

  constructor(
    private canvas: HTMLCanvasElement,
    private mosaic: Mosaic,
    private cache: ImageCache,
    private photoAt: (index: number) => MosaicPhoto | undefined,
  ) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D is not available");
    this.ctx = ctx;
    this.colors = mosaic.tiles.map((t) => t.color);
    this.base = document.createElement("canvas");
    this.base.width = mosaic.cols;
    this.base.height = mosaic.rows;
    const bctx = this.base.getContext("2d")!;
    const img = bctx.createImageData(mosaic.cols, mosaic.rows);
    for (let i = 0; i < mosaic.tiles.length; i++) {
      img.data[i * 4] = mosaic.rgb[i * 3];
      img.data[i * 4 + 1] = mosaic.rgb[i * 3 + 1];
      img.data[i * 4 + 2] = mosaic.rgb[i * 3 + 2];
      img.data[i * 4 + 3] = 255;
    }
    bctx.putImageData(img, 0, 0);
  }

  resize(vp: Viewport, dpr: number) {
    this.vp = vp;
    this.dpr = Math.min(2, dpr);
    this.canvas.width = Math.round(vp.width * this.dpr);
    this.canvas.height = Math.round(vp.height * this.dpr);
  }

  render(state: RenderState): FrameInfo {
    const { ctx, vp, mosaic } = this;
    const { camera: cam, now } = state;
    const z = cam.zoom;
    const ox = vp.width / 2 - cam.x * z;
    const oy = vp.height / 2 - cam.y * z;
    const mix = photoMix(z, fitZoom(mosaic, vp));

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(0, 0, vp.width, vp.height);

    let visibleTiles = 0;
    if (mix === 0) {
      // Artwork view: one drawImage, zero photo work.
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.base, ox, oy, mosaic.cols * z, mosaic.rows * z);
    } else {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = z > 80 ? "high" : "low";
      const range = visibleRange(cam, vp, mosaic, 1);
      if (range) {
        const tier = imageTier(z, this.dpr);
        const gap = z * GAP * mix;
        const side = z * FRAME_SIDE;
        const bottom = z * FRAME_BOTTOM;
        const overlay = (1 - mix * 0.82) * (z > LOD.captionPx ? 0.6 : 1);
        const caption = z > LOD.captionPx;
        if (caption) {
          ctx.font = `600 ${Math.round(z * 0.055)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
          ctx.textBaseline = "middle";
        }
        for (let row = range.rowMin; row <= range.rowMax; row++) {
          for (let col = range.colMin; col <= range.colMax; col++) {
            visibleTiles++;
            const i = row * mosaic.cols + col;
            const x = ox + col * z + gap / 2;
            const y = oy + row * z + gap / 2;
            const s = z - gap;
            const color = this.colors[i];
            const photo = this.photoAt(i);
            ctx.globalAlpha = 1;
            ctx.fillStyle = color;
            ctx.fillRect(x, y, s, s);
            if (!photo) {
              if (z > 60) {
                // Empty slot waiting for a contribution.
                ctx.globalAlpha = 0.28 * mix;
                ctx.fillStyle = PALETTE.paper;
                const c = s * 0.06;
                ctx.fillRect(x + s / 2 - c / 2, y + s / 2 - c * 2.5, c, c * 5);
                ctx.fillRect(x + s / 2 - c * 2.5, y + s / 2 - c / 2, c * 5, c);
              }
              continue;
            }
            // Polaroid frame fades in over the tile colour.
            ctx.globalAlpha = mix;
            ctx.fillStyle = PALETTE.paper;
            ctx.fillRect(x, y, s, s);
            const px = x + side;
            const py = y + side;
            const pw = s - side * 2;
            const ph = s - side - bottom;
            const entry = this.cache.get(tier === "medium" && photo.mediumUrl ? photo.mediumUrl : photo.thumbnailUrl);
            let image = entry.status === "ready" ? entry.image : undefined;
            if (!image && tier === "medium") {
              // Show the thumbnail while the sharper image loads.
              const thumb = this.cache.peek(photo.thumbnailUrl);
              if (thumb?.status === "ready") image = this.cache.get(photo.thumbnailUrl).image;
            }
            ctx.globalAlpha = 1;
            if (image) {
              const { width, height } = imageSize(image);
              // Cover-crop the square photo into the Polaroid window.
              const scale = Math.max(pw / width, ph / height);
              const sw = pw / scale;
              const sh = ph / scale;
              ctx.drawImage(image, (width - sw) / 2, (height - sh) / 2, sw, sh, px, py, pw, ph);
              ctx.globalAlpha = overlay;
              ctx.fillStyle = color;
              ctx.fillRect(px, py, pw, ph);
            } else {
              ctx.fillStyle = color;
              ctx.fillRect(px, py, pw, ph);
              if (entry.status === "error" && z > 40) {
                // Broken image: a quiet diagonal, never a browser error icon.
                ctx.globalAlpha = 0.35 * mix;
                ctx.strokeStyle = PALETTE.paper;
                ctx.lineWidth = Math.max(1, z * 0.015);
                ctx.beginPath();
                ctx.moveTo(px + pw * 0.3, py + ph * 0.7);
                ctx.lineTo(px + pw * 0.7, py + ph * 0.3);
                ctx.stroke();
              }
            }
            if (caption) {
              ctx.globalAlpha = 0.55 * mix;
              ctx.fillStyle = PALETTE.ink;
              const cy = y + s - bottom / 2;
              ctx.textAlign = "left";
              ctx.fillText(photo.source === "local" ? "YOU · DEMO" : `#${photo.id.padStart(4, "0")}`, px, cy);
              ctx.textAlign = "right";
              ctx.fillText(mosaic.show.night.toUpperCase(), px + pw, cy);
            }
          }
        }
      }
    }

    let animating = false;
    const hl = state.highlight;
    if (hl && hl.index >= 0) {
      const t = (now - hl.start) / HIGHLIGHT_MS;
      if (t < 1) {
        animating = true;
        const col = hl.index % mosaic.cols;
        const row = Math.floor(hl.index / mosaic.cols);
        const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 6);
        const pad = Math.max(3, z * 0.06) * (1 + pulse * 0.6);
        ctx.globalAlpha = 1 - Math.max(0, t - 0.75) * 4;
        ctx.strokeStyle = PALETTE.pink;
        ctx.lineWidth = Math.max(2, Math.min(6, z * 0.03));
        ctx.strokeRect(ox + col * z - pad, oy + row * z - pad, z + pad * 2, z + pad * 2);
      }
    }
    ctx.globalAlpha = 1;
    this.cache.endFrame();
    return { mix, tilePx: z, visibleTiles, animating };
  }
}
