import { describe, expect, it } from "vitest";
import {
  cameraForTile,
  clampCamera,
  fitCamera,
  fitZoom,
  hitTest,
  interpolateCamera,
  screenToWorld,
  visibleRange,
  worldToScreen,
  zoomAround,
  zoomLimits,
  type Viewport,
} from "./camera";

const world = { cols: 84, rows: 60 };
const phone: Viewport = { width: 390, height: 844, insets: { top: 60, right: 0, bottom: 110, left: 0 } };

describe("camera", () => {
  it("fits the whole artwork between the insets", () => {
    const cam = fitCamera(world, phone);
    const tl = worldToScreen(cam, phone, 0, 0);
    const br = worldToScreen(cam, phone, world.cols, world.rows);
    expect(tl.x).toBeGreaterThanOrEqual(0);
    expect(br.x).toBeLessThanOrEqual(phone.width);
    expect(tl.y).toBeGreaterThanOrEqual(phone.insets.top);
    expect(br.y).toBeLessThanOrEqual(phone.height - phone.insets.bottom);
  });

  it("round-trips screen and world coordinates", () => {
    const cam = { x: 10, y: 20, zoom: 37 };
    const w = screenToWorld(cam, phone, 123, 456);
    const s = worldToScreen(cam, phone, w.x, w.y);
    expect(s.x).toBeCloseTo(123);
    expect(s.y).toBeCloseTo(456);
  });

  it("keeps the point under the finger fixed while zooming", () => {
    const cam = fitCamera(world, phone);
    const before = screenToWorld(cam, phone, 100, 300);
    const zoomed = zoomAround(cam, phone, cam.zoom * 3.7, 100, 300);
    const after = screenToWorld(zoomed, phone, 100, 300);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("clamps zoom to the limits", () => {
    const { min, max } = zoomLimits(world, phone);
    expect(clampCamera({ x: 42, y: 30, zoom: min / 4 }, world, phone).zoom).toBe(min);
    expect(clampCamera({ x: 42, y: 30, zoom: max * 9 }, world, phone).zoom).toBe(max);
  });

  it("stops panning into empty space", () => {
    const zoom = fitZoom(world, phone) * 4;
    const cam = clampCamera({ x: -500, y: 9999, zoom }, world, phone);
    // The artwork's left edge can't move right of the viewport edge (beyond a small overscroll).
    expect(worldToScreen(cam, phone, 0, 0).x).toBeLessThanOrEqual(48 + 1e-6);
    expect(worldToScreen(cam, phone, 0, world.rows).y).toBeGreaterThanOrEqual(phone.height - phone.insets.bottom - 48 - 1e-6);
  });

  it("culls to the tiles in view plus a buffer", () => {
    const cam = { x: 42, y: 30, zoom: 50 };
    const r = visibleRange(cam, phone, world, 1)!;
    // 390px / 50px ≈ 7.8 tiles wide, 844 / 50 ≈ 16.9 tall, plus a tile each side.
    expect(r.colMax - r.colMin + 1).toBeLessThanOrEqual(11);
    expect(r.rowMax - r.rowMin + 1).toBeLessThanOrEqual(20);
    expect(r.colMin).toBeGreaterThan(0);
    // Every tile touching the viewport is included.
    const tl = screenToWorld(cam, phone, 0, 0);
    const br = screenToWorld(cam, phone, phone.width, phone.height);
    expect(r.colMin).toBeLessThanOrEqual(Math.floor(tl.x));
    expect(r.colMax).toBeGreaterThanOrEqual(Math.floor(br.x));
    expect(r.rowMin).toBeLessThanOrEqual(Math.floor(tl.y));
    expect(r.rowMax).toBeGreaterThanOrEqual(Math.floor(br.y));
  });

  it("returns nothing when the camera looks away from the grid", () => {
    expect(visibleRange({ x: -100, y: -100, zoom: 50 }, phone, world)).toBeNull();
  });

  it("hit-tests the tile under a point", () => {
    const cam = { x: 42, y: 30, zoom: 50 };
    const centre = hitTest(cam, phone, world, phone.width / 2, phone.height / 2);
    expect(centre).toBe(30 * 84 + 42);
    const p = worldToScreen(cam, phone, 30.5, 33.5);
    expect(hitTest(cam, phone, world, p.x, p.y)).toBe(33 * 84 + 30);
    expect(hitTest({ x: -50, y: -50, zoom: 50 }, phone, world, 10, 10)).toBe(-1);
  });

  it("centres a tile in the usable area when flying to it", () => {
    const index = 12 * 84 + 50;
    const cam = cameraForTile(world, phone, index);
    const s = worldToScreen(cam, phone, 50.5, 12.5);
    expect(s.x).toBeCloseTo(phone.width / 2);
    expect(s.y).toBeCloseTo(phone.insets.top + (phone.height - phone.insets.top - phone.insets.bottom) / 2);
  });

  it("interpolates zoom in log space and lands exactly", () => {
    const a = { x: 0, y: 0, zoom: 5 };
    const b = { x: 10, y: 10, zoom: 320 };
    expect(interpolateCamera(a, b, 0)).toEqual(a);
    const end = interpolateCamera(a, b, 1);
    expect(end.zoom).toBeCloseTo(320);
    expect(end.x).toBeCloseTo(10);
    expect(interpolateCamera(a, b, 0.5).zoom).toBeCloseTo(40);
  });
});
