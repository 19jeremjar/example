import { RefObject, useEffect, useState } from 'react';
import type { Viewport } from '../lib/solar';

export const SCENE_W = 1600;
export const SCENE_H = 900;

/** Narrowest slice of the meadow we ever show; portrait screens get extra sky instead. */
export const MIN_VISIBLE_W = 900;

/**
 * Which part of the 1600×900 scene to show. Landscape screens see the full
 * width (very wide ones crop the top of the sky). Narrow and portrait screens
 * see a centred slice at least MIN_VISIBLE_W wide, with the sky extended
 * upward, so characters stay a sensible size and the ground stays anchored.
 */
export function computeViewport(width: number, height: number): Viewport & { aspect: number } {
  const aspect = Math.max(0.2, width / Math.max(1, height));
  const w = aspect >= SCENE_W / SCENE_H ? SCENE_W : Math.min(SCENE_W, Math.max(SCENE_H * aspect, MIN_VISIBLE_W));
  const h = w / aspect;
  const x0 = (SCENE_W - w) / 2;
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
