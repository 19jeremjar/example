import { describe, expect, it } from 'vitest';
import { AutoGain, BeatTracker, LevelClassifier, computeRms, estimateNoiseFloor, normalizeEnergy, smoothEnergy } from '../lib/audioAnalysis';
import { AnimationEngine, Frame, MoveId, PROFILES, createMover, movePose, stepPose } from '../lib/animation';

describe('audio analysis', () => {
  it('computes RMS', () => {
    expect(computeRms(new Float32Array([0, 0, 0]))).toBe(0);
    expect(computeRms(new Float32Array([1, -1, 1, -1]))).toBeCloseTo(1);
    const sine = new Float32Array(1000).map((_, i) => 0.5 * Math.sin((i / 1000) * Math.PI * 20));
    expect(computeRms(sine)).toBeCloseTo(0.5 / Math.SQRT2, 2);
  });

  it('noise floor ignores brief spikes', () => {
    const samples = Array.from({ length: 60 }, () => 0.003);
    samples[10] = 0.4;
    expect(estimateNoiseFloor(samples)).toBeCloseTo(0.003);
    expect(estimateNoiseFloor([])).toBeGreaterThan(0);
  });

  it('energy is 0 near the floor, rises with loudness, and respects sensitivity', () => {
    const floor = 0.002;
    expect(normalizeEnergy(0.002, floor, 1)).toBe(0);
    expect(normalizeEnergy(0.0026, floor, 1)).toBe(0); // ordinary wobble stays calm
    expect(normalizeEnergy(0.02, floor, 1)).toBeGreaterThan(0.6); // ~20 dB above the room
    expect(normalizeEnergy(1, floor, 1)).toBe(1);
    expect(normalizeEnergy(0.01, floor, 2)).toBeGreaterThan(normalizeEnergy(0.01, floor, 1));
  });

  it('auto gain lets steady quiet music reach high energy but keeps the room calm', () => {
    const g = new AutoGain();
    const floor = 0.002;
    // quiet music ~12 dB above the room, held for a few seconds
    let e = 0;
    for (let i = 0; i < 300; i++) e = g.energy(0.008, floor, 1, 1 / 60);
    expect(e).toBeGreaterThan(0.85);
    expect(e).toBeGreaterThan(normalizeEnergy(0.008, floor, 1));
    const calm = new AutoGain();
    let room = 0;
    for (let i = 0; i < 300; i++) room = calm.energy(0.0024, floor, 1, 1 / 60);
    expect(room).toBe(0);
  });

  it('smoothing attacks fast and releases slowly', () => {
    expect(smoothEnergy(0, 1, 0.1)).toBeGreaterThan(0.6);
    expect(smoothEnergy(1, 0, 0.1)).toBeGreaterThan(0.85);
  });

  it('level classifier uses hysteresis and a hold time', () => {
    const c = new LevelClassifier();
    const run = (e: number, secs: number) => {
      for (let t = 0; t < secs; t += 0.05) c.update(e, 0.05);
      return c.level;
    };
    expect(run(0.2, 0.3)).toBe('quiet'); // hold time not elapsed
    expect(run(0.2, 1)).toBe('moderate');
    expect(run(0.12, 2)).toBe('moderate'); // between off/on: stays
    expect(run(0.6, 2)).toBe('loud');
    expect(run(0.4, 2)).toBe('loud');
    expect(run(0.03, 3)).toBe('quiet');
  });

  it('beat tracker locks onto a 128 BPM kick', () => {
    const bt = new BeatTracker();
    const dt = 1 / 60;
    const period = 60 / 128;
    let state = bt.update(0, dt);
    const beatTimes: number[] = [];
    let lastIndex = state.index;
    for (let i = 0; i < 60 * 12; i++) {
      const t = i * dt;
      const sincekick = t % period;
      const raw = sincekick < 0.06 ? 0.9 : 0.25; // kick + steady music bed
      state = bt.update(raw, dt);
      if (state.index !== lastIndex) {
        lastIndex = state.index;
        if (t > 6) beatTimes.push(t);
      }
    }
    expect(state.locked).toBe(true);
    expect(state.bpm).toBeGreaterThan(120);
    expect(state.bpm).toBeLessThan(136);
    // Beats land close to kicks.
    const errs = beatTimes.map((t) => {
      const ph = (t % period) / period;
      return Math.min(ph, 1 - ph) * period;
    });
    const avgErr = errs.reduce((a, b) => a + b, 0) / errs.length;
    expect(avgErr).toBeLessThan(0.09);
  });

  it('beat tracker keeps a steady fallback groove without onsets', () => {
    const bt = new BeatTracker();
    let s = bt.update(0.5, 1 / 60);
    for (let i = 0; i < 600; i++) s = bt.update(0.5, 1 / 60);
    expect(s.locked).toBe(false);
    expect(s.index).toBeGreaterThan(15); // ~112 BPM for 10 s
    expect(s.bpm).toBeGreaterThan(105);
    expect(s.bpm).toBeLessThan(120);
  });
});

describe('dancing', () => {
  // Simulate 10 s at 120 BPM with a given drive.
  const simulate = (profile: keyof typeof PROFILES, drive: number, motion = 1) => {
    const m = createMover(0.3);
    const poses = [];
    const moves = new Set<string>();
    for (let i = 0; i < 600; i++) {
      const t = i / 60;
      const f: Frame = { t, dt: 1 / 60, energy: drive, level: 'quiet', drive, wind: drive, motion, beatPhase: (t * 2) % 1, beatIndex: Math.floor(t * 2), beat: 0, bpm: 120 };
      poses.push(stepPose(m, PROFILES[profile], f));
      if (m.move) moves.add(m.move);
    }
    return { poses, moves };
  };
  const maxOf = (ps: { y: number; rot: number; x: number; sx: number }[]) => ({
    up: Math.max(...ps.map((p) => -p.y)),
    rot: Math.max(...ps.map((p) => Math.abs(p.rot))),
    x: Math.max(...ps.map((p) => Math.abs(p.x))),
    flip: Math.min(...ps.map((p) => p.sx)),
  });

  it('quiet characters just breathe — no wobbling', () => {
    const q = maxOf(simulate('bouncy', 0).poses);
    expect(q.up).toBeLessThan(0.5);
    expect(q.rot).toBeLessThan(0.6);
    expect(q.x).toBeLessThan(0.5);
  });

  it('loud music makes real dance moves: big jumps, travel and spins', () => {
    const { poses, moves } = simulate('bouncy', 1);
    const d = maxOf(poses);
    expect(d.up).toBeGreaterThan(60); // jumps
    expect(moves.size).toBeGreaterThanOrEqual(2); // switches moves
    const all = new Set<string>();
    for (const id of ['bouncy', 'sidestep', 'chaotic', 'relaxed'] as const) simulate(id, 1).moves.forEach((mv) => all.add(mv));
    expect(all.has('spin') || all.has('jump')).toBe(true);
  });

  it('moderate sound grooves on the beat (bounces land on beats)', () => {
    const p = movePose('bounce', 0, 0, 1);
    const mid = movePose('bounce', 0, 0.5, 1);
    expect(p.y).toBeCloseTo(0);
    expect(mid.y).toBeLessThan(-30);
    expect(p.sy).toBeLessThan(1); // squash on landing
  });

  it('every move is continuous across beats and safe at zero amplitude', () => {
    const moves: MoveId[] = ['bounce', 'sidestep', 'sway', 'squat', 'twist', 'spin', 'jump', 'shimmy', 'lean', 'stomp'];
    for (const mv of moves) {
      for (let b = 0; b < 4; b++) {
        const end = movePose(mv, b, 0.9999, 1);
        const next = movePose(mv, b + 1, 0, 1);
        if (mv === 'spin' || mv === 'jump') {
          if (b % 2 === 1) expect(Math.abs(end.y - next.y)).toBeLessThan(1);
        } else {
          expect(Math.abs(end.x - next.x)).toBeLessThan(1.5);
          expect(Math.abs(end.y - next.y)).toBeLessThan(1);
        }
      }
      const zero = movePose(mv, 1, 0.3, 0);
      expect(Math.abs(zero.y)).toBeLessThan(1e-9);
    }
  });

  it('static mode freezes poses', () => {
    for (const p of simulate('chaotic', 1, 0).poses) {
      expect({ x: p.x + 0, y: p.y + 0, rot: p.rot + 0, sx: p.sx, sy: p.sy }).toEqual({ x: 0, y: 0, rot: 0, sx: 1, sy: 1 });
    }
  });

  it('robotic profile moves in steps; lazy profile ignores moderate sound', () => {
    for (const p of simulate('robotic', 0.8).poses) expect(Math.abs(p.rot % 3)).toBeLessThan(1e-9);
    const lazy = maxOf(simulate('lazy', 0.3).poses);
    const bouncy = maxOf(simulate('bouncy', 0.3).poses);
    expect(lazy.up).toBeLessThan(bouncy.up / 3);
    expect(maxOf(simulate('lazy', 1).poses).up).toBeGreaterThan(60); // …until it's loud
  });

  it('engine notifies subscribers immediately', () => {
    const e = new AnimationEngine();
    let last: Frame | null = null;
    e.subscribe((f) => (last = f));
    expect(last).not.toBeNull();
  });
});
