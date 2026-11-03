import { RefObject, useEffect, useState } from 'react';
import type { Viewport } from '../lib/solar';

export const SCENE_W = 1600;
export const SCENE_H = 900;

/** Narrowest slice of the meadow we ever show; portrait screens get extra sky instead. */
export const MIN_VISIBLE_W = 900;

/**
 * The meadow is painted wider than the 16:9 frame so wide screens reveal more
 * landscape instead of cropping the sky. Everything (hills, grass, flowers,
 * dirt, stars) is generated across this range.
 */
export const WORLD_MIN_X = -1100;
export const WORLD_MAX_X = 2700;

/**
 * Which part of the scene to show. The design target is 16:9 (1600×900).
 * - Wider landscape (16:10 → 32:9): full sky height, more meadow left and right.
 * - Narrower landscape (16:10, 4:3) and portrait: a centred slice at least
 *   MIN_VISIBLE_W wide, with extra sky above.
 * The ground is always anchored to the bottom edge.
 */
export function computeViewport(width: number, height: number): Viewport & { aspect: number } {
  const aspect = Math.max(0.2, width / Math.max(1, height));
  const maxW = WORLD_MAX_X - WORLD_MIN_X - 200;
  let w: number;
  if (aspect >= SCENE_W / SCENE_H) w = Math.min(SCENE_H * aspect, maxW);
  else w = Math.min(SCENE_W, Math.max(SCENE_H * aspect, MIN_VISIBLE_W));
  const h = w / aspect;
  const x0 = SCENE_W / 2 - w / 2;
  return { x0, x1: x0 + w, y0: SCENE_H - h, y1: SCENE_H, aspect };
}

export function useViewport(ref: RefObject<HTMLElement>): Viewport & { aspect: number } {
  const [vp, setVp] = useState(() => computeViewport(16, 9));
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setVp(computeViewport(el.clientWidth || 1, el.clientHeight || 1));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return vp;
}
