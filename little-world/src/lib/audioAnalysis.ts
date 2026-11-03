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
  return clamp01((dbAboveFloor(rms, noiseFloor) - HEADROOM_DB) / (FULL_RANGE_DB / Math.max(0.1, sensitivity)));
}

/** Ordinary room wobble above the calibrated floor that should stay calm. */
export const HEADROOM_DB = 3;
/** dB above the headroom that counts as "full energy" at sensitivity 1. */
export const FULL_RANGE_DB = 22;

export function dbAboveFloor(rms: number, noiseFloor: number): number {
  return 20 * Math.log10(Math.max(rms, 1e-6) / Math.max(noiseFloor, 1e-6));
}

/**
 * Automatic gain: remembers how loud the room has recently been (slowly
 * forgetting) and scales energy to that, so quiet background music still
 * gets the meadow dancing, while sensitivity sets how eager it is overall.
 */
export class AutoGain {
  private peakDb = 0;

  energy(rms: number, noiseFloor: number, sensitivity: number, dt: number): number {
    const db = dbAboveFloor(rms, noiseFloor) - HEADROOM_DB;
    // Peak follows loud moments instantly and relaxes ~2 dB per second.
    this.peakDb = Math.max(db, this.peakDb - dt * 2);
    const sens = Math.max(0.1, sensitivity);
    const fixedRange = FULL_RANGE_DB / sens;
    // Never let the range shrink so far that room noise looks like a party.
    const adaptiveRange = Math.max(10 / sens, Math.min(fixedRange, this.peakDb * 0.9));
    return clamp01(db / adaptiveRange);
  }

  reset() {
    this.peakDb = 0;
  }
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
  moderateOn: 0.16,
  moderateOff: 0.09,
  loudOn: 0.45,
  loudOff: 0.32,
  hold: 0.7,
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

export type BeatState = {
  /** 0 → 1 through the current beat. */
  phase: number;
  /** Increments once per beat. */
  index: number;
  /** 1 on the beat, decaying quickly; use for kicks and flashes. */
  pulse: number;
  bpm: number;
  /** True while real onsets are being heard (vs. the fallback metronome). */
  locked: boolean;
};

const DEFAULT_INTERVAL = 60 / 112;

/**
 * A small beat tracker. A metronome always runs (so simulated sound and
 * beat-less music still get a steady groove); sound onsets — sudden jumps in
 * energy above its recent average — retune its tempo and nudge its phase so
 * the beat lands on the music.
 */
export class BeatTracker {
  private avg = 0;
  private phase = 0;
  private index = 0;
  private pulse = 0;
  private interval = DEFAULT_INTERVAL;
  private intervals: number[] = [];
  private lastOnset = -10;
  private t = 0;

  update(raw: number, dt: number): BeatState {
    this.t += dt;
    const t = this.t;
    this.avg += (raw - this.avg) * (1 - Math.exp(-dt / 0.5));

    this.phase += dt / this.interval;
    let newBeat = false;
    if (this.phase >= 1) {
      this.phase -= Math.floor(this.phase);
      this.index++;
      newBeat = true;
    }

    const sinceOnset = t - this.lastOnset;
    const onset = raw > 0.1 && raw > this.avg * 1.3 + 0.03 && sinceOnset > 0.24;
    if (onset) {
      if (sinceOnset < 2.4) {
        let ibi = sinceOnset;
        while (ibi > 0.8) ibi /= 2;
        while (ibi < 0.36) ibi *= 2;
        this.intervals.push(ibi);
        if (this.intervals.length > 10) this.intervals.shift();
        const sorted = [...this.intervals].sort((a, b) => a - b);
        const median = sorted[sorted.length >> 1];
        this.interval += (median - this.interval) * 0.35;
      }
      // Pull the metronome so beats land on onsets.
      const err = this.phase > 0.5 ? this.phase - 1 : this.phase; // <0: onset arrived early
      if (Math.abs(err) < 0.3) this.phase -= err * 0.5;
      else if (sinceOnset > 1.5) {
        this.phase = 0;
        this.index++;
        newBeat = true;
      }
      this.lastOnset = t;
    }
    if (this.phase < 0) this.phase += 1;

    // Drift back to a friendly default tempo when the music stops.
    if (t - this.lastOnset > 4) this.interval += (DEFAULT_INTERVAL - this.interval) * (1 - Math.exp(-dt / 3));

    this.pulse = newBeat ? 1 : this.pulse * Math.exp(-dt / 0.16);
    return { phase: this.phase % 1, index: this.index, pulse: this.pulse, bpm: 60 / this.interval, locked: t - this.lastOnset < 2.5 };
  }
}
