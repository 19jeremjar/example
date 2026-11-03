import { LEVEL_AMOUNT, LevelClassifier, SoundLevel, clamp01, smoothEnergy } from './audioAnalysis';

/** Everything an animated element needs for one frame. */
export type Frame = {
  /** Seconds since the engine started. */
  t: number;
  dt: number;
  /** Smoothed 0–1 sound energy. */
  energy: number;
  level: SoundLevel;
  /** Blend of the discrete level and continuous energy; what movement should follow. */
  drive: number;
  /** Spring-simulated wind strength, 0 ≈ calm breeze. */
  wind: number;
  /** 0 = static artwork, 1 = full motion. */
  motion: number;
};

export type FrameCallback = (f: Frame) => void;
export type EnergySource = () => number;

/**
 * A single requestAnimationFrame loop. Components subscribe callbacks that
 * mutate SVG attributes directly, so React never re-renders per frame.
 */
export class AnimationEngine {
  private subs = new Set<FrameCallback>();
  private raf = 0;
  private last = 0;
  private start = 0;
  private energy = 0;
  private levelAmount = 0;
  private wind = 0;
  private windVel = 0;
  private classifier = new LevelClassifier();
  private source: EnergySource = () => 0;
  private slowFrames = 0;
  motion = 1;
  /** Set when frames are consistently slow; heavy elements may skip work. */
  lowDetail = false;
  latest: Frame = { t: 0, dt: 0, energy: 0, level: 'quiet', drive: 0, wind: 0, motion: 1 };

  setSource(src: EnergySource) {
    this.source = src;
  }

  subscribe(cb: FrameCallback): () => void {
    this.subs.add(cb);
    cb(this.latest);
    return () => this.subs.delete(cb);
  }

  run() {
    if (this.raf) return;
    this.last = performance.now();
    if (!this.start) this.start = this.last;
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      this.tick(now);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Renders one frame immediately (used for static mode and while paused). */
  renderOnce() {
    for (const cb of this.subs) cb(this.latest);
  }

  private tick(now: number) {
    // Clamp dt so returning from a hidden tab doesn't cause a jump.
    const dt = Math.min(0.1, Math.max(0.001, (now - this.last) / 1000));
    this.last = now;

    if (dt > 0.034) this.slowFrames++;
    else this.slowFrames = Math.max(0, this.slowFrames - 1);
    this.lowDetail = this.slowFrames > 90;

    const raw = clamp01(this.source());
    this.energy = smoothEnergy(this.energy, raw, dt);
    const level = this.classifier.update(this.energy, dt);
    // Ease the discrete level so state changes blend over ~0.8s.
    this.levelAmount = smoothEnergy(this.levelAmount, LEVEL_AMOUNT[level], dt, 0.5, 0.9);
    const drive = clamp01(0.6 * this.levelAmount + 0.4 * this.energy) * this.motion;

    // Damped spring toward the target wind strength.
    const target = 0.12 + drive * 0.95;
    const stiffness = 14;
    const damping = 5.2;
    this.windVel += (target - this.wind) * stiffness * dt - this.windVel * damping * dt;
    this.wind += this.windVel * dt;

    this.latest = {
      t: (now - this.start) / 1000,
      dt,
      energy: this.energy,
      level,
      drive,
      wind: this.wind * this.motion,
      motion: this.motion,
    };
    for (const cb of this.subs) cb(this.latest);
  }
}

// ---------------------------------------------------------------------------
// Character movement
// ---------------------------------------------------------------------------

export type AnimationProfileId =
  | 'gentle'
  | 'bouncy'
  | 'energetic'
  | 'sidestep'
  | 'relaxed'
  | 'robotic'
  | 'rocking'
  | 'chaotic'
  | 'lazy';

export type MotionProfile = {
  /** Beats per second at groove level. */
  tempo: number;
  /** Extra tempo at full drive. */
  tempoBoost: number;
  swayDeg: number;
  bounce: number;
  stepX: number;
  squash: number;
  /** Extra rotation that only appears near dance level. */
  spinDeg: number;
  chaos: number;
  /** Snap rotation/height into steps for a mechanical feel. */
  robotic: boolean;
  /** Maps drive to effort: <1 eager, >1 reluctant. */
  effort: number;
  /** How quickly this character reacts (seconds). Gives each one its own lag. */
  lag: number;
};

export const PROFILES: Record<AnimationProfileId, MotionProfile> = {
  gentle: { tempo: 0.8, tempoBoost: 0.4, swayDeg: 5, bounce: 10, stepX: 4, squash: 0.03, spinDeg: 4, chaos: 0, robotic: false, effort: 1.1, lag: 0.5 },
  bouncy: { tempo: 1.15, tempoBoost: 0.9, swayDeg: 7, bounce: 34, stepX: 6, squash: 0.09, spinDeg: 10, chaos: 0, robotic: false, effort: 0.8, lag: 0.25 },
  energetic: { tempo: 1.3, tempoBoost: 1.1, swayDeg: 9, bounce: 30, stepX: 10, squash: 0.08, spinDeg: 14, chaos: 0.2, robotic: false, effort: 0.75, lag: 0.2 },
  sidestep: { tempo: 0.9, tempoBoost: 0.6, swayDeg: 4, bounce: 12, stepX: 26, squash: 0.03, spinDeg: 6, chaos: 0, robotic: false, effort: 1, lag: 0.4 },
  relaxed: { tempo: 0.75, tempoBoost: 0.7, swayDeg: 6, bounce: 22, stepX: 3, squash: 0.06, spinDeg: 6, chaos: 0, robotic: false, effort: 1.3, lag: 0.55 },
  robotic: { tempo: 1, tempoBoost: 0.5, swayDeg: 6, bounce: 18, stepX: 0, squash: 0, spinDeg: 0, chaos: 0, robotic: true, effort: 1, lag: 0.3 },
  rocking: { tempo: 0.55, tempoBoost: 0.4, swayDeg: 8, bounce: 9, stepX: 2, squash: 0.05, spinDeg: 3, chaos: 0, robotic: false, effort: 1.2, lag: 0.7 },
  chaotic: { tempo: 1.5, tempoBoost: 1.3, swayDeg: 10, bounce: 26, stepX: 12, squash: 0.07, spinDeg: 18, chaos: 1, robotic: false, effort: 0.7, lag: 0.15 },
  lazy: { tempo: 0.7, tempoBoost: 1.1, swayDeg: 7, bounce: 40, stepX: 4, squash: 0.12, spinDeg: 12, chaos: 0, robotic: false, effort: 2.6, lag: 0.9 },
};

export type Pose = { x: number; y: number; rot: number; sx: number; sy: number };

export type MoverState = { phase: number; drive: number; seed: number };

export function createMover(seed: number): MoverState {
  return { phase: seed * 6.28, drive: 0, seed };
}

/**
 * Pure pose function: advances the mover's beat phase and returns an offset
 * transform around the character's feet. Idle → groove → dance is a smooth
 * function of drive, not a hard switch.
 */
export function stepPose(m: MoverState, p: MotionProfile, f: Frame): Pose {
  m.drive += (f.drive - m.drive) * (1 - Math.exp(-f.dt / p.lag));
  const e = Math.pow(clamp01(m.drive), p.effort);
  const motion = f.motion;

  const freq = p.tempo + p.tempoBoost * e;
  m.phase += f.dt * freq * Math.PI * 2 * (e > 0.02 ? 1 : 0.25);
  const ph = m.phase;
  const t = f.t + m.seed * 10;

  // IDLE: breathing and a whisper of sway.
  const breath = Math.sin(t * 1.9);
  let sy = 1 + 0.014 * breath;
  let sx = 1 - 0.007 * breath;
  let rot = 1.2 * Math.sin(t * 0.6);
  let y = 0;
  let x = 0;

  // GROOVE → DANCE.
  const sway = Math.sin(ph);
  const hop = Math.abs(Math.sin(ph));
  rot += p.swayDeg * e * sway;
  y -= p.bounce * Math.pow(e, 1.3) * hop;
  x += p.stepX * e * sway;
  const land = 1 - hop; // 1 at the bottom of the bounce
  sy += p.squash * e * (land - 0.5) * -1.2;
  sx += p.squash * e * (land - 0.5) * 0.9;

  const dance = clamp01((e - 0.62) / 0.38);
  rot += p.spinDeg * dance * Math.sin(ph * 0.5 + 0.8);

  if (p.chaos > 0) {
    rot += p.chaos * e * (3 * Math.sin(ph * 1.7 + 1.3) + 2 * Math.sin(ph * 2.9));
    x += p.chaos * e * 5 * Math.sin(ph * 2.3);
  }

  if (p.robotic) {
    rot = Math.round(rot / 3) * 3;
    y = Math.round(y / 6) * 6;
    sx = 1;
    sy = 1;
  }

  return {
    x: x * motion,
    y: y * motion,
    rot: rot * motion,
    sx: 1 + (sx - 1) * motion,
    sy: 1 + (sy - 1) * motion,
  };
}

/** Deterministic pseudo-random generator so the hand-made scene is the same every load. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
