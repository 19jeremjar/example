import { describe, expect, it } from 'vitest';
import { MAX_CHARACTERS } from '../data/characters';
import { X_MAX, X_MIN, canAdd, clampScale, clampX, nextFreeX, sanitizePlacements } from '../lib/placement';
import { computeViewport } from '../hooks/useViewport';

describe('character placement', () => {
  it('clamps to the visible ground and safe sizes', () => {
    expect(clampX(-1)).toBe(X_MIN);
    expect(clampX(5)).toBe(X_MAX);
    expect(clampX(NaN)).toBe(0.5);
    expect(clampScale(10)).toBe(1.5);
    expect(clampScale(0)).toBe(0.6);
  });

  it('new characters go in the biggest gap', () => {
    expect(nextFreeX([])).toBeCloseTo(0.5, 1);
    const x = nextFreeX([{ uid: 'a', characterId: 'pip', x: 0.3, scale: 1 }]);
    expect(x).toBeGreaterThan(0.5);
  });

  it('caps the world at five characters', () => {
    const five = Array.from({ length: MAX_CHARACTERS }, (_, i) => ({ uid: String(i), characterId: 'pip', x: i / 5, scale: 1 }));
    expect(canAdd(five)).toBe(false);
    expect(canAdd(five.slice(1))).toBe(true);
  });

  it('sanitises stored placements', () => {
    const known = new Set(['pip', 'mochi']);
    const out = sanitizePlacements(
      [
        { uid: 'a', characterId: 'pip', x: 2, scale: 9 },
        { characterId: 'unknown', x: 0.5, scale: 1 },
        'junk',
        { characterId: 'mochi', x: 0.4, scale: 1 },
      ],
      known,
    );
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ uid: 'a', x: X_MAX, scale: 1.5 });
    expect(typeof out[1].uid).toBe('string');
    expect(sanitizePlacements('nope', known)).toEqual([]);
  });
});

describe('viewport', () => {
  it('16:9 shows the whole scene', () => {
    expect(computeViewport(1920, 1080)).toMatchObject({ x0: 0, x1: 1600, y0: 0, y1: 900 });
  });
  it('ultra-wide crops the top of the sky, keeping the ground', () => {
    const v = computeViewport(3440, 1440);
    expect(v.y1).toBe(900);
    expect(v.y0).toBeGreaterThan(0);
    expect(v.x1 - v.x0).toBe(1600);
  });
  it('portrait keeps a wide slice of meadow and extends the sky upward', () => {
    const v = computeViewport(390, 844);
    expect(v.x1 - v.x0).toBeGreaterThanOrEqual(900);
    expect(v.y0).toBeLessThan(0);
    expect(v.y1).toBe(900);
    expect((v.x1 - v.x0) / (v.y1 - v.y0)).toBeCloseTo(390 / 844, 5);
  });
});
