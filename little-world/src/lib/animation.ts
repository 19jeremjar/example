import { BeatTracker, LEVEL_AMOUNT, LevelClassifier, SoundLevel, clamp01, smoothEnergy } from './audioAnalysis';

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
  /** 0 → 1 through the current beat. */
  beatPhase: number;
  /** Increments once per beat. */
  beatIndex: number;
  /** 1 on the beat, decaying fast. Multiply by drive for sound-dependent kicks. */
  beat: number;
  bpm: number;
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
  private beats = new BeatTracker();
  private source: EnergySource = () => 0;
  private slowFrames = 0;
  motion = 1;
  /** Set when frames are consistently slow; heavy elements may skip work. */
  lowDetail = false;
  latest: Frame = { t: 0, dt: 0, energy: 0, level: 'quiet', drive: 0, wind: 0, motion: 1, beatPhase: 0, beatIndex: 0, beat: 0, bpm: 112 };

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
    const beat = this.beats.update(raw, dt);
    this.energy = smoothEnergy(this.energy, raw, dt, 0.06, 0.8);
    const level = this.classifier.update(this.energy, dt);
    // Ease the discrete level so state changes blend over ~0.5s.
    this.levelAmount = smoothEnergy(this.levelAmount, LEVEL_AMOUNT[level], dt, 0.3, 0.8);
    const drive = clamp01(0.55 * this.levelAmount + 0.45 * this.energy) * this.motion;

    // Damped spring toward the target wind strength, with a gust on each beat.
    const target = 0.12 + drive * 0.95 + beat.pulse * drive * 0.35;
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
      beatPhase: beat.phase,
      beatIndex: beat.index,
      beat: beat.pulse * this.motion,
      bpm: beat.bpm,
    };
    for (const cb of this.subs) cb(this.latest);
  }
}

// ---------------------------------------------------------------------------
// Dancing
// ---------------------------------------------------------------------------

/**
 * Dance moves, each a pose as a function of where we are in the beat.
 * All are continuous across beat boundaries and return to neutral (or to a
 * matching side) so moves can be swapped on any beat.
 */
export type MoveId =
  | 'bounce'
  | 'sidestep'
  | 'sway'
  | 'squat'
  | 'twist'
  | 'spin'
  | 'jump'
  | 'shimmy'
  | 'robot'
  | 'lean'
  | 'stomp';

export type Pose = { x: number; y: number; rot: number; sx: number; sy: number };

const hop = (q: number) => Math.sin(Math.PI * q);
/** 1 right on the beat (landing), 0 in the air. */
const land = (q: number) => Math.pow(1 - Math.sin(Math.PI * q), 4);

/**
 * @param b beats since this move started
 * @param q phase within the current beat (0..1)
 * @param A amplitude (0..~1.3)
 */
export function movePose(move: MoveId, b: number, q: number, A: number): Pose {
  const s = b + q; // continuous beat position
  const two = ((b % 2) + q) / 2; // 0..1 over a two-beat move
  switch (move) {
    case 'bounce': {
      const l = land(q);
      return { x: 0, y: -40 * A * hop(q), rot: 0, sx: 1 + 0.09 * A * l - 0.03 * A * hop(q), sy: 1 - 0.12 * A * l + 0.06 * A * hop(q) };
    }
    case 'sidestep': {
      const side = Math.cos(Math.PI * s);
      return { x: 36 * A * side, y: -12 * A * hop(q), rot: -5 * A * Math.sin(Math.PI * s), sx: 1, sy: 1 - 0.05 * A * land(q) };
    }
    case 'sway':
      return { x: 10 * A * Math.sin(Math.PI * s), y: -6 * A * hop(q), rot: 7 * A * Math.sin(Math.PI * s), sx: 1, sy: 1 - 0.04 * A * land(q) };
    case 'squat': {
      const d = (1 + Math.cos(2 * Math.PI * q)) / 2; // down on the beat
      return { x: 0, y: 0, rot: 0, sx: 1 + 0.08 * A * d, sy: 1 - 0.15 * A * d };
    }
    case 'twist': {
      const c = Math.cos(Math.PI * s);
      return { x: 6 * A * c, y: -10 * A * hop(q), rot: 9 * A * c, sx: 1 - 0.22 * A * Math.abs(Math.sin(Math.PI * s)), sy: 1 };
    }
    case 'spin':
      // A full cartoon turn over two beats: the sprite narrows, flips, and comes back.
      return { x: 0, y: -34 * A * Math.sin(Math.PI * two), rot: 0, sx: Math.cos(2 * Math.PI * two), sy: 1 + 0.04 * A * Math.sin(Math.PI * two) };
    case 'jump': {
      const air = Math.pow(Math.sin(Math.PI * two), 0.8);
      const crouch = Math.pow(1 - Math.sin(Math.PI * two), 6);
      return { x: 0, y: -90 * A * air, rot: 10 * A * Math.sin(2 * Math.PI * two), sx: 1 + 0.12 * A * crouch, sy: 1 - 0.16 * A * crouch + 0.08 * A * air };
    }
    case 'shimmy': {
      const w = Math.sin(2 * Math.PI * 4 * q);
      return { x: 8 * A * w, y: -8 * A * hop(q), rot: 4 * A * Math.sin(2 * Math.PI * 4 * q + 1), sx: 1 + 0.03 * A * w, sy: 1 };
    }
    case 'robot': {
      const dir = b % 2 === 0 ? 1 : -1;
      const snap = q < 0.12 ? q / 0.12 : 1; // hit the pose fast, then hold
      return { x: 6 * A * dir * snap, y: q < 0.5 ? -16 * A : 0, rot: 8 * A * dir * snap, sx: 1, sy: 1 };
    }
    case 'lean': {
      // Ease over to one side during the first beat, hold for the second, then cross over.
      const side = Math.floor(b / 2) % 2 === 0 ? 1 : -1;
      const ease = Math.sin((Math.PI / 2) * Math.min(1, q * 1.5));
      const into = b % 2 === 0 ? 2 * ease - 1 : 1; // -1 (other side) → +1
      return { x: 12 * A * side * into, y: -9 * A * hop(q), rot: 11 * A * side * into, sx: 1, sy: 1 - 0.05 * A * land(q) };
    }
    case 'stomp': {
      const l = land(q);
      return { x: 8 * A * Math.cos(Math.PI * s), y: -24 * A * hop(q), rot: 3 * A * Math.cos(Math.PI * s), sx: 1 + 0.14 * A * l, sy: 1 - 0.2 * A * l };
    }
  }
}

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
  /** Overall size of this character's moves. */
  scale: number;
  /** Moves used when there's some sound. */
  groove: MoveId[];
  /** Moves unlocked when it's loud. */
  dance: MoveId[];
  /** Beats before switching to the next move. */
  changeEvery: number;
  /** Maps drive to effort: <1 eager, >1 reluctant. */
  effort: number;
  /** How quickly this character reacts (seconds). */
  lag: number;
  /** Snap poses into steps for a mechanical feel. */
  robotic: boolean;
};

export const PROFILES: Record<AnimationProfileId, MotionProfile> = {
  gentle: { scale: 0.8, groove: ['sway', 'squat'], dance: ['bounce', 'sidestep', 'sway'], changeEvery: 4, effort: 1.1, lag: 0.4, robotic: false },
  bouncy: { scale: 1.1, groove: ['bounce', 'sidestep', 'squat'], dance: ['jump', 'bounce', 'spin', 'shimmy', 'sidestep'], changeEvery: 4, effort: 0.8, lag: 0.2, robotic: false },
  energetic: { scale: 1.1, groove: ['bounce', 'twist'], dance: ['jump', 'spin', 'shimmy', 'twist'], changeEvery: 4, effort: 0.75, lag: 0.2, robotic: false },
  sidestep: { scale: 1, groove: ['sidestep', 'lean', 'sway'], dance: ['sidestep', 'stomp', 'twist', 'spin', 'lean'], changeEvery: 4, effort: 0.95, lag: 0.3, robotic: false },
  relaxed: { scale: 1, groove: ['sway', 'bounce'], dance: ['bounce', 'spin', 'sidestep', 'jump'], changeEvery: 4, effort: 1.05, lag: 0.35, robotic: false },
  robotic: { scale: 1, groove: ['robot', 'squat'], dance: ['robot', 'stomp', 'spin'], changeEvery: 4, effort: 1, lag: 0.25, robotic: true },
  rocking: { scale: 0.9, groove: ['sway', 'squat'], dance: ['bounce', 'sway', 'spin', 'sidestep'], changeEvery: 4, effort: 1.1, lag: 0.45, robotic: false },
  chaotic: { scale: 1.2, groove: ['shimmy', 'bounce', 'twist'], dance: ['spin', 'jump', 'shimmy', 'twist', 'stomp'], changeEvery: 2, effort: 0.7, lag: 0.12, robotic: false },
  lazy: { scale: 1.25, groove: ['sway'], dance: ['jump', 'spin', 'stomp'], changeEvery: 4, effort: 2.4, lag: 0.8, robotic: false },
};

export type MoverState = {
  seed: number;
  drive: number;
  move: MoveId | null;
  moveStart: number;
  lastBeat: number;
  tier: 0 | 1 | 2;
  pose: Pose;
};

export function createMover(seed: number): MoverState {
  return { seed, drive: 0, move: null, moveStart: 0, lastBeat: -1, tier: 0, pose: { x: 0, y: 0, rot: 0, sx: 1, sy: 1 } };
}

function pick<T>(list: T[], key: number): T {
  const h = Math.abs(Math.sin(key * 12.9898) * 43758.5453);
  return list[Math.floor((h - Math.floor(h)) * list.length) % list.length];
}

/**
 * Advances a character one frame: chooses dance moves on the beat and
 * returns a transform around its feet. Quiet → gentle breathing only;
 * some sound → groove moves; loud → the big moves.
 */
export function stepPose(m: MoverState, p: MotionProfile, f: Frame): Pose {
  m.drive += (f.drive - m.drive) * (1 - Math.exp(-f.dt / p.lag));
  const e = Math.pow(clamp01(m.drive), p.effort);
  const tier: 0 | 1 | 2 = e < 0.08 ? 0 : e < 0.5 ? 1 : 2;

  if (f.beatIndex !== m.lastBeat) {
    m.lastBeat = f.beatIndex;
    const beatsIn = f.beatIndex - m.moveStart;
    // Two-beat moves (spin, jump) only change on even beats so they finish cleanly.
    const evenBeat = beatsIn % 2 === 0;
    if (tier !== m.tier || m.move === null || (beatsIn >= p.changeEvery && evenBeat)) {
      const list = tier === 2 ? p.dance : p.groove;
      let next = pick(list, f.beatIndex + m.seed * 97);
      if (next === m.move && list.length > 1) next = list[(list.indexOf(next) + 1) % list.length];
      m.move = next;
      m.moveStart = f.beatIndex;
      m.tier = tier;
    }
  }

  // Idle: just breathing, no wobbling.
  const breath = Math.sin((f.t + m.seed * 10) * 1.9);
  let target: Pose = { x: 0, y: 0, rot: 0.4 * Math.sin((f.t + m.seed * 10) * 0.5), sx: 1 - 0.006 * breath, sy: 1 + 0.013 * breath };

  if (tier > 0 && m.move) {
    const A = p.scale * Math.min(1.3, 0.35 + e);
    const mv = movePose(m.move, f.beatIndex - m.moveStart, f.beatPhase, A);
    target = { x: mv.x, y: mv.y, rot: mv.rot + target.rot, sx: mv.sx * target.sx, sy: mv.sy * target.sy };
  }

  if (p.robotic) {
    target.rot = Math.round(target.rot / 3) * 3;
    target.y = Math.round(target.y / 6) * 6;
  }

  // Short smoothing hides any seam when a move changes.
  const k = 1 - Math.exp(-f.dt / 0.045);
  const cur = m.pose;
  cur.x += (target.x - cur.x) * k;
  cur.y += (target.y - cur.y) * k;
  cur.rot += (target.rot - cur.rot) * k;
  cur.sx += (target.sx - cur.sx) * k;
  cur.sy += (target.sy - cur.sy) * k;

  const motion = f.motion;
  return {
    x: cur.x * motion,
    y: cur.y * motion,
    rot: p.robotic ? Math.round((cur.rot * motion) / 3) * 3 : cur.rot * motion,
    sx: 1 + (cur.sx - 1) * motion,
    sy: 1 + (cur.sy - 1) * motion,
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
