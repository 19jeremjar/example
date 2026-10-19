import { PALETTE, POSTER } from "../config/palette";
import { type Camera, type Viewport, fitZoom, visibleRange } from "./camera";
import type { ImageCache } from "./imageCache";
import { imageSize } from "./imageLoader";
import { LOD, imageTier, photoMix } from "./lod";
import type { StencilPainter } from "./stencil";
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
const FRAME_SIDE = 0.07;
const FRAME_BOTTOM = 0.2;
/** White gap between Polaroids, as a share of the tile. */
const GAP = 0.08;
/** Pixels per tile in the baked zoomed-out texture. */
const BASE_PX = 6;
/** How far the baked gap pixels move towards white. */
const GAP_TINT = 0.45;
/** Outline ring around the letters, in stencil design units. */
const OUTLINE_WIDTH = 16;

/**
 * Canvas renderer for the mosaic.
 *
 * The ground is plain white and the outline ring is drawn as vectors, so neither ever looks
 * pixelated. Tiles are drawn into an offscreen layer (a one-pixel-per-tile colour bitmap at low
 * zoom, Polaroid photos once tiles are big enough) and then clipped to the vector letter shape,
 * so edges stay crisp at every zoom level.
 */
export class MosaicRenderer {
  private ctx: CanvasRenderingContext2D;
  private layer: HTMLCanvasElement;
  private lctx: CanvasRenderingContext2D;
  private mask: HTMLCanvasElement;
  private mctx: CanvasRenderingContext2D;
  private base: HTMLCanvasElement;
  private colors: string[];
  private vp: Viewport = { width: 1, height: 1, insets: { top: 0, right: 0, bottom: 0, left: 0 } };
  private dpr = 1;
  /** Page colour around the artwork. */
  background: string = PALETTE.white;

  constructor(
    private canvas: HTMLCanvasElement,
    private mosaic: Mosaic,
    private stencil: StencilPainter,
    private cache: ImageCache,
    private photoAt: (index: number) => MosaicPhoto | undefined,
  ) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D is not available");
    this.ctx = ctx;
    this.layer = document.createElement("canvas");
    this.lctx = this.layer.getContext("2d")!;
    this.mask = document.createElement("canvas");
    this.mctx = this.mask.getContext("2d")!;
    this.colors = mosaic.tiles.map((t) => t.color);
    this.base = document.createElement("canvas");
    this.refreshBase();
  }

  /**
   * Bakes the zoomed-out view: each tile is a BASE_PX square mini Polaroid (a hint of white gap,
   * a coloured frame and a darker "photo" centre), so the mosaic texture reads from a distance
   * without loading a single photo. Call again when photos are added or removed.
   */
  refreshBase() {
    const { mosaic } = this;
    const P = BASE_PX;
    const w = mosaic.cols * P;
    this.base.width = w;
    this.base.height = mosaic.rows * P;
    const bctx = this.base.getContext("2d")!;
    const img = bctx.createImageData(w, this.base.height);
    const d = img.data;
    for (let i = 0; i < mosaic.tiles.length; i++) {
      const r = mosaic.rgb[i * 3];
      const g = mosaic.rgb[i * 3 + 1];
      const b = mosaic.rgb[i * 3 + 2];
      const hasPhoto = mosaic.tiles[i].region === "letter" && !!this.photoAt(i);
      // Photos vary in brightness, like the average of a real concert shot.
      const shade = 0.22 + ((i * 2654435761) >>> 0) / 4294967296 * 0.22;
      const col = i % mosaic.cols;
      const row = Math.floor(i / mosaic.cols);
      for (let y = 0; y < P; y++) {
        for (let x = 0; x < P; x++) {
          let rr = r;
          let gg = g;
          let bb = b;
          if (x === 0 || y === 0) {
            // White gap between Polaroids, softened so it reads as texture, not a grid.
            rr += (255 - r) * GAP_TINT;
            gg += (255 - g) * GAP_TINT;
            bb += (255 - b) * GAP_TINT;
          } else if (hasPhoto && x >= 2 && x <= P - 2 && y >= 2 && y <= P - 3) {
            rr *= 1 - shade;
            gg *= 1 - shade;
            bb *= 1 - shade;
          }
          const o = ((row * P + y) * w + col * P + x) * 4;
          d[o] = rr;
          d[o + 1] = gg;
          d[o + 2] = bb;
          d[o + 3] = 255;
        }
      }
    }
    bctx.putImageData(img, 0, 0);
  }

  resize(vp: Viewport, dpr: number) {
    this.vp = vp;
    this.dpr = Math.min(2, dpr);
    this.canvas.width = this.layer.width = this.mask.width = Math.round(vp.width * this.dpr);
    this.canvas.height = this.layer.height = this.mask.height = Math.round(vp.height * this.dpr);
  }

  render(state: RenderState): FrameInfo {
    const { ctx, lctx, vp, mosaic, stencil } = this;
    const { camera: cam, now } = state;
    const z = cam.zoom;
    const ox = vp.width / 2 - cam.x * z;
    const oy = vp.height / 2 - cam.y * z;
    const mix = photoMix(z, fitZoom(mosaic, vp));
    const designScale = (mosaic.cols * z) / stencil.width;

    // Ground and outline ring: static, vector.
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.background;
    ctx.fillRect(0, 0, vp.width, vp.height);
    if (stencil.outline) {
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(designScale, designScale);
      ctx.strokeStyle = PALETTE.ink;
      stencil.outline(ctx, OUTLINE_WIDTH);
      ctx.restore();
    }

    // Tiles, drawn into the layer.
    lctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    lctx.globalCompositeOperation = "source-over";
    lctx.globalAlpha = 1;
    lctx.clearRect(0, 0, vp.width, vp.height);
    // Smooth when the baked texture is shrunk, crisp when it's enlarged.
    lctx.imageSmoothingEnabled = z * this.dpr < BASE_PX;
    lctx.imageSmoothingQuality = "high";
    lctx.drawImage(this.base, ox, oy, mosaic.cols * z, mosaic.rows * z);

    let visibleTiles = 0;
    if (mix > 0) {
      lctx.imageSmoothingEnabled = true;
      lctx.imageSmoothingQuality = z > 80 ? "high" : "low";
      visibleTiles = this.drawTiles(lctx, cam, z, ox, oy, mix);
    }

    // Clip the layer to the letter shape, then composite. The shape is painted into its own mask
    // first, because destination-in applies per draw call and the shape takes several.
    const { mctx } = this;
    mctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    mctx.clearRect(0, 0, vp.width, vp.height);
    mctx.translate(ox, oy);
    mctx.scale(designScale, designScale);
    mctx.fillStyle = "#000";
    stencil.fill(mctx);
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.globalAlpha = 1;
    lctx.globalCompositeOperation = "destination-in";
    lctx.drawImage(this.mask, 0, 0);
    lctx.globalCompositeOperation = "source-over";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.layer, 0, 0);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (stencil.lines) {
      // The artwork's own linework, crisp on top of the photos.
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(designScale, designScale);
      ctx.fillStyle = POSTER.ink;
      stencil.lines(ctx);
      ctx.restore();
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
        ctx.strokeStyle = PALETTE.white;
        ctx.lineWidth = Math.max(2, Math.min(6, z * 0.03));
        ctx.strokeRect(ox + col * z - pad, oy + row * z - pad, z + pad * 2, z + pad * 2);
      }
    }
    ctx.globalAlpha = 1;
    this.cache.endFrame();
    return { mix, tilePx: z, visibleTiles, animating };
  }

  /** Visible artwork tiles as Polaroids whose frames take the tile's colour. Returns how many were drawn. */
  private drawTiles(c: CanvasRenderingContext2D, cam: Camera, z: number, ox: number, oy: number, mix: number): number {
    const { mosaic } = this;
    const range = visibleRange(cam, this.vp, mosaic, 1);
    if (!range) return 0;
    const tier = imageTier(z, this.dpr);
    const gap = z * GAP * mix;
    const side = z * FRAME_SIDE;
    const bottom = z * FRAME_BOTTOM;
    // Light tint of the tile colour over the photo, fading as photos take over.
    const overlay = (1 - mix * 0.85) * (z > LOD.captionPx ? 0.6 : 1);
    const caption = z > LOD.captionPx;
    if (caption) {
      c.font = `${Math.round(z * 0.1)}px "Reenie Beanie", "Marker Felt", cursive`;
      c.textBaseline = "middle";
    }
    let drawn = 0;
    for (let row = range.rowMin; row <= range.rowMax; row++) {
      for (let col = range.colMin; col <= range.colMax; col++) {
        const i = row * mosaic.cols + col;
        if (mosaic.tiles[i].region !== "letter") continue;
        drawn++;
        const cx = ox + col * z;
        const cy = oy + row * z;
        const x = cx + gap / 2;
        const y = cy + gap / 2;
        const s = z - gap;
        const color = this.colors[i];
        // White gap around the frame, so each Polaroid reads on its own.
        c.globalAlpha = 1;
        c.fillStyle = PALETTE.white;
        // Overlap neighbours by half a pixel so no anti-aliased seams show between cells.
        c.fillRect(cx - 0.5, cy - 0.5, z + 1, z + 1);
        c.fillStyle = color;
        c.fillRect(x, y, s, s);
        const photo = this.photoAt(i);
        if (!photo) {
          if (z > 60) {
            // Empty slot waiting for a contribution.
            c.globalAlpha = 0.45 * mix;
            c.fillStyle = PALETTE.white;
            const t = s * 0.05;
            c.fillRect(x + s / 2 - t / 2, y + s / 2 - t * 2.5, t, t * 5);
            c.fillRect(x + s / 2 - t * 2.5, y + s / 2 - t / 2, t * 5, t);
          }
          continue;
        }
        const px = x + side;
        const py = y + side;
        const pw = s - side * 2;
        const ph = s - side - bottom;
        const entry = this.cache.get(tier === "medium" && photo.mediumUrl ? photo.mediumUrl : photo.thumbnailUrl);
        let image = entry.status === "ready" ? entry.image : undefined;
        if (!image && tier === "medium" && this.cache.peek(photo.thumbnailUrl)?.status === "ready") {
          // Show the thumbnail while the sharper image loads.
          image = this.cache.get(photo.thumbnailUrl).image;
        }
        if (image) {
          const { width, height } = imageSize(image);
          // Cover-crop the square photo into the Polaroid window.
          const scale = Math.max(pw / width, ph / height);
          const sw = pw / scale;
          const sh = ph / scale;
          c.drawImage(image, (width - sw) / 2, (height - sh) / 2, sw, sh, px, py, pw, ph);
          c.globalAlpha = overlay;
          c.fillStyle = color;
          c.fillRect(px, py, pw, ph);
        } else if (entry.status === "error" && z > 40) {
          // Broken image: a quiet diagonal, never a browser error icon.
          c.globalAlpha = 0.5 * mix;
          c.strokeStyle = PALETTE.white;
          c.lineWidth = Math.max(1, z * 0.015);
          c.beginPath();
          c.moveTo(px + pw * 0.3, py + ph * 0.7);
          c.lineTo(px + pw * 0.7, py + ph * 0.3);
          c.stroke();
        }
        if (caption) {
          c.globalAlpha = 0.7 * mix;
          c.fillStyle = PALETTE.ink;
          const ty = y + s - bottom / 2;
          c.textAlign = "left";
          c.fillText("together", px, ty);
          c.textAlign = "right";
          c.fillText(photo.source === "local" ? "you" : `#${photo.id.padStart(4, "0")}`, px + pw, ty);
        }
      }
    }
    c.globalAlpha = 1;
    return drawn;
  }
}
