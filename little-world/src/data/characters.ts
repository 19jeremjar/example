import type { AnimationProfileId } from '../lib/animation';

export type CharacterDefinition = {
  id: string;
  name: string;
  /**
   * Image candidates under /public, tried in order (first that loads wins).
   * Omitted for the built-in original characters, which are drawn as SVG.
   */
  assetPaths?: string[];
  /** Fallback width/height ratio until the image reports its real size. */
  aspect: number;
  defaultScale: number;
  animationProfile: AnimationProfileId;
  /** Point the character stands on, as a fraction of its width/height. */
  anchorX: number;
  anchorY: number;
  /** A one-line personality note shown in the picker. */
  vibe: string;
  source: 'original' | 'supplied';
};

const supplied = (
  id: string,
  name: string,
  aspect: number,
  defaultScale: number,
  animationProfile: AnimationProfileId,
  vibe: string,
): CharacterDefinition => ({
  id,
  name,
  assetPaths: [`/characters/${id}.webp`, `/characters/${id}.png`],
  aspect,
  defaultScale,
  animationProfile,
  anchorX: 0.5,
  anchorY: 0.985,
  vibe,
  source: 'supplied',
});

export const CHARACTERS: CharacterDefinition[] = [
  // Original placeholder characters, drawn in code (see components/OriginalCharacters.tsx).
  { id: 'pip', name: 'Pip', aspect: 200 / 260, defaultScale: 0.82, animationProfile: 'bouncy', anchorX: 0.5, anchorY: 1, vibe: 'A sprout who never stops bopping', source: 'original' },
  { id: 'mochi', name: 'Mochi', aspect: 200 / 260, defaultScale: 0.86, animationProfile: 'rocking', anchorX: 0.5, anchorY: 1, vibe: 'Soft, sleepy, sways like a lullaby', source: 'original' },

  // User-supplied artwork. Drop a transparent PNG/WebP in public/characters/<id>.(webp|png).
  supplied('spongebob', 'SpongeBob', 0.747, 1, 'bouncy', 'Energetic, slightly over-the-top'),
  supplied('woody', 'Woody', 0.486, 1.18, 'sidestep', 'Cowboy side-steps'),
  supplied('snoopy', 'Snoopy', 0.677, 0.95, 'relaxed', 'Relaxed sway, happy bounce'),
  supplied('buzz', 'Buzz Lightyear', 0.8, 1.15, 'robotic', 'Stiff, robotic rhythm'),
  supplied('pooh', 'Winnie the Pooh', 0.534, 0.95, 'rocking', 'Slow, gentle rocking'),
  supplied('stitch', 'Stitch', 1.003, 0.82, 'chaotic', 'Fast and gloriously chaotic'),
  supplied('garfield', 'Garfield', 0.9, 0.95, 'lazy', 'Minimal effort… until it’s loud'),
];

export function findCharacter(id: string): CharacterDefinition | undefined {
  return CHARACTERS.find((c) => c.id === id);
}

export const MAX_CHARACTERS = 5;
export const MIN_SCALE = 0.6;
export const MAX_SCALE = 1.5;
/** Base character height in scene units (scene is 1600×900). */
export const BASE_HEIGHT = 320;
