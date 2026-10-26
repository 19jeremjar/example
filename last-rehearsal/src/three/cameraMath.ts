import type { Vec3 } from '../config/hotspots';

export function clampToBounds(p: Vec3, bounds: { min: Vec3; max: Vec3 }): Vec3 {
  return [0, 1, 2].map((i) => Math.min(bounds.max[i], Math.max(bounds.min[i], p[i]))) as Vec3;
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Vertical field of view for the current aspect ratio. Portrait phones get a
 * wider lens so both seated band members aren't lost off the sides straight away.
 */
export function fovForAspect(aspect: number): number {
  if (aspect < 0.6) return 80;
  if (aspect < 0.9) return 74;
  if (aspect < 1.3) return 66;
  return 58;
}
