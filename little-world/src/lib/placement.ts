import { MAX_CHARACTERS, MAX_SCALE, MIN_SCALE } from '../data/characters';

/** Where a character stands. Stored separately from its definition. */
export type CharacterPlacement = {
  uid: string;
  characterId: string;
  /** 0 = left edge of the visible ground, 1 = right edge. */
  x: number;
  /** Multiplier on the character's default scale. */
  scale: number;
};

export const X_MIN = 0.05;
export const X_MAX = 0.95;

export function clampX(x: number): number {
  if (!Number.isFinite(x)) return 0.5;
  return Math.min(X_MAX, Math.max(X_MIN, x));
}

export function clampScale(s: number): number {
  if (!Number.isFinite(s)) return 1;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

/** Picks an x for a newly added character: the middle of the widest empty gap. */
export function nextFreeX(placements: CharacterPlacement[]): number {
  const xs = [X_MIN - 0.08, ...placements.map((p) => p.x).sort((a, b) => a - b), X_MAX + 0.08];
  let bestGap = -1;
  let bestX = 0.5;
  for (let i = 0; i < xs.length - 1; i++) {
    const gap = xs[i + 1] - xs[i];
    if (gap > bestGap) {
      bestGap = gap;
      bestX = (xs[i] + xs[i + 1]) / 2;
    }
  }
  return clampX(bestX);
}

export function canAdd(placements: CharacterPlacement[]): boolean {
  return placements.length < MAX_CHARACTERS;
}

/** Validates placements loaded from storage, dropping anything malformed. */
export function sanitizePlacements(value: unknown, knownIds: Set<string>): CharacterPlacement[] {
  if (!Array.isArray(value)) return [];
  const out: CharacterPlacement[] = [];
  for (const v of value) {
    if (!v || typeof v !== 'object') continue;
    const p = v as Partial<CharacterPlacement>;
    if (typeof p.characterId !== 'string' || !knownIds.has(p.characterId)) continue;
    out.push({
      uid: typeof p.uid === 'string' ? p.uid : makeUid(),
      characterId: p.characterId,
      x: clampX(Number(p.x)),
      scale: clampScale(Number(p.scale)),
    });
    if (out.length >= MAX_CHARACTERS) break;
  }
  return out;
}

export function makeUid(): string {
  return Math.random().toString(36).slice(2, 10);
}
