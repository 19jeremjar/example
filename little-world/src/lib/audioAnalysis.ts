/** Root-mean-square amplitude of time-domain samples in [-1, 1]. */
export function computeRms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / Math.max(1, samples.length));
}

/**
 * Noise floor from calibration samples: a high-ish percentile, so brief
 * clicks don't inflate it but steady room hum is captured.
 */
export function estimateNoiseFloor(rmsSamples: number[]): number {
  if (rmsSamples.length === 0) return 0.002;
  const sorted = [...rmsSamples].sort((a, b) => a - b);
  const p = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.8))];
  return Math.max(0.0008, p);
}

/**
 * Maps RMS to a 0–1 energy relative to the calibrated noise floor.
 * This is a relative loudness index, not a calibrated decibel reading.
 * `sensitivity` 1 means ~30 dB above the room's floor reaches full energy;
 * higher sensitivity needs less sound.
 */
export function normalizeEnergy(rms: number, noiseFloor: number, sensitivity: number): number {
  const headroomDb = 6; // ordinary ambient wobble above the floor stays calm
  const rangeDb = 30 / Math.max(0.1, sensitivity);
  const db = 20 * Math.log10(Math.max(rms, 1e-6) / Math.max(noiseFloor, 1e-6));
  return clamp01((db - headroomDb) / rangeDb);
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Asymmetric smoothing: rises quickly when sound starts, settles slowly when it
 * stops, so the world calms down gently instead of snapping still.
 */
export function smoothEnergy(current: number, target: number, dt: number, attack = 0.08, release = 0.9): number {
  const tau = target > current ? attack : release;
  const k = 1 - Math.exp(-dt / tau);
  return current + (target - current) * k;
}

export type SoundLevel = 'quiet' | 'moderate' | 'loud';

export type LevelThresholds = {
  moderateOn: number;
  moderateOff: number;
  loudOn: number;
  loudOff: number;
  /** Minimum seconds a level is held before it may change. */
  hold: number;
};

export const DEFAULT_THRESHOLDS: LevelThresholds = {
  moderateOn: 0.26,
  moderateOff: 0.17,
  loudOn: 0.6,
  loudOff: 0.46,
  hold: 1.1,
};

/** Discrete quiet/moderate/loud with hysteresis and a hold time to avoid flicker. */
export class LevelClassifier {
  level: SoundLevel = 'quiet';
  private since = 0;

  constructor(private th: LevelThresholds = DEFAULT_THRESHOLDS) {}

  update(energy: number, dt: number): SoundLevel {
    this.since += dt;
    if (this.since < this.th.hold) return this.level;
    const next = this.next(energy);
    if (next !== this.level) {
      this.level = next;
      this.since = 0;
    }
    return this.level;
  }

  private next(e: number): SoundLevel {
    const th = this.th;
    switch (this.level) {
      case 'quiet':
        return e >= th.loudOn ? 'loud' : e >= th.moderateOn ? 'moderate' : 'quiet';
      case 'moderate':
        return e >= th.loudOn ? 'loud' : e < th.moderateOff ? 'quiet' : 'moderate';
      case 'loud':
        return e >= th.loudOff ? 'loud' : e < th.moderateOff ? 'quiet' : 'moderate';
    }
  }
}

export const LEVEL_AMOUNT: Record<SoundLevel, number> = { quiet: 0, moderate: 0.5, loud: 1 };
