import { describe, expect, it } from 'vitest';
import { LevelClassifier, computeRms, estimateNoiseFloor, normalizeEnergy, smoothEnergy } from '../lib/audioAnalysis';
import { AnimationEngine, PROFILES, createMover, stepPose, Frame } from '../lib/animation';

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
    expect(normalizeEnergy(0.003, floor, 1)).toBe(0); // ordinary wobble stays calm
    const music = normalizeEnergy(0.05, floor, 1);
    expect(music).toBeGreaterThan(0.5);
    expect(normalizeEnergy(1, floor, 1)).toBe(1);
    expect(normalizeEnergy(0.02, floor, 2)).toBeGreaterThan(normalizeEnergy(0.02, floor, 1));
  });

  it('smoothing attacks fast and releases slowly', () => {
    const up = smoothEnergy(0, 1, 0.1);
    const down = smoothEnergy(1, 0, 0.1);
    expect(up).toBeGreaterThan(0.6);
    expect(down).toBeGreaterThan(0.85);
  });

  it('level classifier uses hysteresis and a hold time', () => {
    const c = new LevelClassifier();
    const run = (e: number, secs: number) => {
      for (let t = 0; t < secs; t += 0.05) c.update(e, 0.05);
      return c.level;
    };
    expect(run(0.3, 0.5)).toBe('quiet'); // hold time not elapsed
    expect(run(0.3, 1)).toBe('moderate');
    expect(run(0.2, 2)).toBe('moderate'); // between off/on thresholds: stays
    expect(run(0.7, 2)).toBe('loud');
    expect(run(0.5, 2)).toBe('loud');
    expect(run(0.05, 3)).toBe('quiet');
  });
});

describe('animation', () => {
  const frame = (t: number, drive: number, motion = 1): Frame => ({ t, dt: 1 / 60, energy: drive, level: 'quiet', drive, wind: drive, motion });

  it('idle characters barely move; dancing ones move a lot', () => {
    const amp = (drive: number) => {
      const m = createMover(0.3);
      let maxY = 0;
      let maxRot = 0;
      for (let i = 0; i < 600; i++) {
        const p = stepPose(m, PROFILES.bouncy, frame(i / 60, drive));
        maxY = Math.max(maxY, -p.y);
        maxRot = Math.max(maxRot, Math.abs(p.rot));
      }
      return { maxY, maxRot };
    };
    const idle = amp(0);
    const dance = amp(1);
    expect(idle.maxY).toBeLessThan(1);
    expect(idle.maxRot).toBeLessThan(2);
    expect(dance.maxY).toBeGreaterThan(20);
    expect(dance.maxRot).toBeGreaterThan(5);
  });

  it('static mode freezes poses', () => {
    const m = createMover(0.1);
    for (let i = 0; i < 120; i++) {
      const p = stepPose(m, PROFILES.chaotic, frame(i / 60, 1, 0));
      expect({ x: p.x + 0, y: p.y + 0, rot: p.rot + 0, sx: p.sx, sy: p.sy }).toEqual({ x: 0, y: 0, rot: 0, sx: 1, sy: 1 });
    }
  });

  it('robotic profile moves in steps; lazy profile ignores moderate sound', () => {
    const m = createMover(0.2);
    for (let i = 0; i < 200; i++) {
      const p = stepPose(m, PROFILES.robotic, frame(i / 60, 0.8));
      expect(Math.abs(p.rot % 3)).toBeLessThan(1e-9);
    }
    const lazy = createMover(0.2);
    const bouncy = createMover(0.2);
    let lazyY = 0;
    let bouncyY = 0;
    for (let i = 0; i < 600; i++) {
      lazyY = Math.max(lazyY, -stepPose(lazy, PROFILES.lazy, frame(i / 60, 0.4)).y);
      bouncyY = Math.max(bouncyY, -stepPose(bouncy, PROFILES.bouncy, frame(i / 60, 0.4)).y);
    }
    expect(lazyY).toBeLessThan(bouncyY / 3);
  });

  it('every profile is defined', () => {
    for (const p of Object.values(PROFILES)) expect(p.tempo).toBeGreaterThan(0);
  });

  it('engine notifies subscribers with smoothed energy (no React needed)', () => {
    const e = new AnimationEngine();
    let last: Frame | null = null;
    e.subscribe((f) => (last = f));
    expect(last).not.toBeNull();
  });
});
