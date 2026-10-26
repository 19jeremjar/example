// Gameplay tuning and links.

export const CTA = {
  // Both default to Jewel's site, which has the music and the Ecosystem tour
  // dates. Set VITE_LISTEN_URL / VITE_LIVE_URL in the hosting environment to
  // point them somewhere else (see .env.example).
  listen: {
    label: 'Listen to the band',
    url: (import.meta.env.VITE_LISTEN_URL as string | undefined) || 'https://jewelowusu.com/',
  },
  live: {
    label: 'See us live',
    url: (import.meta.env.VITE_LIVE_URL as string | undefined) || 'https://jewelowusu.com/',
  },
};

export type PedalId = 'tune' | 'drive' | 'echo';

export const PEDALS: { id: PedalId; name: string; colour: string; swatch: string }[] = [
  // Shown left to right in this order, which is deliberately not the solution.
  { id: 'echo', name: 'Echo', colour: 'blue', swatch: '#3d7fd6' },
  { id: 'tune', name: 'Tuner', colour: 'green', swatch: '#3fae5a' },
  { id: 'drive', name: 'Drive', colour: 'orange', swatch: '#e7832b' },
];

/** The order the pedals have to be switched on. */
export const PEDAL_ORDER: PedalId[] = ['tune', 'drive', 'echo'];

/** The note taped to the floor next to the board. It's the clue for PEDAL_ORDER. */
export const PEDAL_CLUE = 'Grass, then fire, then the sea.\nOtherwise it sounds like soup. — M';

export type Drum = 'kick' | 'snare' | 'cymbal';

/** The beat Zac has forgotten. */
export const BEAT: Drum[] = ['kick', 'snare', 'kick', 'cymbal'];

/** Milliseconds between hits when the game plays the beat. */
export const BEAT_STEP_MS = 520;

/**
 * Optional approved audio clip for the final reveal (e.g. '/audio/reveal.mp3'
 * in public/). Leave empty to use the built-in synthesised count-in instead.
 * Only use a recording the band has supplied and cleared.
 */
export const REVEAL_AUDIO_URL = '';

export const STORAGE_KEY = 'the-last-rehearsal:v1';
