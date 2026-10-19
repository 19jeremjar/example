/** Camera centre in world units (1 unit = 1 tile) and zoom in CSS pixels per tile. */
export type Camera = { x: number; y: number; zoom: number };

export type Insets = { top: number; right: number; bottom: number; left: number };

export type Viewport = { width: number; height: number; insets: Insets };

export type World = { cols: number; rows: number };

const FIT_PADDING = 12;
/** How far past the artwork edge a user can pan, in CSS pixels. */
const OVERSCROLL_PX = 48;
/** Largest projected tile size in CSS pixels. */
export const MAX_TILE_PX = 420;

/** Zoom at which the whole artwork fits the area between the UI insets. This is "1.0×". */
export function fitZoom(world: World, vp: Viewport): number {
  const w = vp.width - vp.insets.left - vp.insets.right - FIT_PADDING * 2;
  const h = vp.height - vp.insets.top - vp.insets.bottom - FIT_PADDING * 2;
  return Math.max(0.01, Math.min(w / world.cols, h / world.rows));
}

export function zoomLimits(world: World, vp: Viewport) {
  const fit = fitZoom(world, vp);
  return { min: fit, max: Math.max(fit * 4, MAX_TILE_PX) };
}

/** Camera showing the whole artwork, centred in the area between the insets. */
export function fitCamera(world: World, vp: Viewport): Camera {
  const zoom = fitZoom(world, vp);
  return {
    zoom,
    x: world.cols / 2 + (vp.insets.right - vp.insets.left) / 2 / zoom,
    y: world.rows / 2 + (vp.insets.bottom - vp.insets.top) / 2 / zoom,
  };
}

export function screenToWorld(cam: Camera, vp: Viewport, sx: number, sy: number) {
  return { x: cam.x + (sx - vp.width / 2) / cam.zoom, y: cam.y + (sy - vp.height / 2) / cam.zoom };
}

export function worldToScreen(cam: Camera, vp: Viewport, wx: number, wy: number) {
  return { x: (wx - cam.x) * cam.zoom + vp.width / 2, y: (wy - cam.y) * cam.zoom + vp.height / 2 };
}

/** Changes zoom while keeping the world point under (sx, sy) fixed on screen. */
export function zoomAround(cam: Camera, vp: Viewport, zoom: number, sx: number, sy: number): Camera {
  const p = screenToWorld(cam, vp, sx, sy);
  return { zoom, x: p.x - (sx - vp.width / 2) / zoom, y: p.y - (sy - vp.height / 2) / zoom };
}

function clampAxis(centre: number, size: number, screen: number, startInset: number, endInset: number, zoom: number) {
  const avail = screen - startInset - endInset;
  // Screen position of the available area's centre, relative to the viewport centre.
  const offset = (startInset - endInset) / 2;
  if (size * zoom <= avail) return size / 2 - offset / zoom;
  const over = OVERSCROLL_PX / zoom;
  const min = (screen / 2 - startInset) / zoom - over;
  const max = size - (screen / 2 - endInset) / zoom + over;
  return Math.min(max, Math.max(min, centre));
}

/** Keeps zoom within limits and stops the artwork drifting off into empty space. */
export function clampCamera(cam: Camera, world: World, vp: Viewport): Camera {
  const { min, max } = zoomLimits(world, vp);
  const zoom = Math.min(max, Math.max(min, cam.zoom));
  const { top, right, bottom, left } = vp.insets;
  return {
    zoom,
    x: clampAxis(cam.x, world.cols, vp.width, left, right, zoom),
    y: clampAxis(cam.y, world.rows, vp.height, top, bottom, zoom),
  };
}

export type TileRange = { colMin: number; colMax: number; rowMin: number; rowMax: number };

/** Inclusive range of tiles intersecting the viewport, plus `buffer` tiles on each side. */
export function visibleRange(cam: Camera, vp: Viewport, world: World, buffer = 1): TileRange | null {
  const halfW = vp.width / 2 / cam.zoom;
  const halfH = vp.height / 2 / cam.zoom;
  const colMin = Math.max(0, Math.floor(cam.x - halfW) - buffer);
  const colMax = Math.min(world.cols - 1, Math.ceil(cam.x + halfW) - 1 + buffer);
  const rowMin = Math.max(0, Math.floor(cam.y - halfH) - buffer);
  const rowMax = Math.min(world.rows - 1, Math.ceil(cam.y + halfH) - 1 + buffer);
  if (colMin > colMax || rowMin > rowMax) return null;
  return { colMin, colMax, rowMin, rowMax };
}

/** Index of the tile under a screen point, or -1. */
export function hitTest(cam: Camera, vp: Viewport, world: World, sx: number, sy: number): number {
  const p = screenToWorld(cam, vp, sx, sy);
  const col = Math.floor(p.x);
  const row = Math.floor(p.y);
  if (col < 0 || row < 0 || col >= world.cols || row >= world.rows) return -1;
  return row * world.cols + col;
}

/** Camera centred on a tile at a zoom where it reads as a single photo. */
export function cameraForTile(world: World, vp: Viewport, index: number): Camera {
  const col = index % world.cols;
  const row = Math.floor(index / world.cols);
  const availW = vp.width - vp.insets.left - vp.insets.right;
  const availH = vp.height - vp.insets.top - vp.insets.bottom;
  const zoom = Math.min(MAX_TILE_PX, Math.max(140, Math.min(availW, availH) * 0.42));
  return {
    zoom,
    x: col + 0.5 + (vp.insets.right - vp.insets.left) / 2 / zoom,
    y: row + 0.5 + (vp.insets.bottom - vp.insets.top) / 2 / zoom,
  };
}

/**
 * Interpolates between cameras so zoom changes evenly (in log space) and the target point
 * converges smoothly on screen, rather than sliding past it.
 */
export function interpolateCamera(a: Camera, b: Camera, t: number): Camera {
  const zoom = Math.exp(Math.log(a.zoom) + (Math.log(b.zoom) - Math.log(a.zoom)) * t);
  let w = t;
  if (Math.abs(Math.log(b.zoom / a.zoom)) > 0.05) w = (1 / a.zoom - 1 / zoom) / (1 / a.zoom - 1 / b.zoom);
  return { zoom, x: a.x + (b.x - a.x) * w, y: a.y + (b.y - a.y) * w };
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
