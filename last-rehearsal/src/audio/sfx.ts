// Every sound in the game is synthesised here with the Web Audio API, so no
// recordings are shipped. Nothing plays until the player has tapped "Enter
// the room" (unlock() is called from that click), and everything respects the
// sound toggle.

import { REVEAL_AUDIO_URL, type Drum } from '../config/game';

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let enabled = true;
let noiseBuffer: AudioBuffer | null = null;

function getCtx(): Ctx | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);
  return ctx;
}

/** Call from a user gesture. Creates or resumes the audio context. */
export function unlock() {
  const c = getCtx();
  if (c && c.state === 'suspended') void c.resume();
}

export function setEnabled(on: boolean) {
  enabled = on;
  if (master && ctx) master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.02);
}

function ready(): Ctx | null {
  if (!enabled) return null;
  const c = getCtx();
  if (!c || c.state !== 'running') return null;
  return c;
}

function noise(c: Ctx): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const buf = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

function env(c: Ctx, peak: number, attack: number, decay: number, at: number) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  g.connect(master!);
  return g;
}

export function drum(kind: Drum, when = 0) {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + when;
  if (kind === 'kick') {
    const o = c.createOscillator();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    o.connect(env(c, 1, 0.003, 0.35, t));
    o.start(t);
    o.stop(t + 0.4);
  } else if (kind === 'snare') {
    const n = c.createBufferSource();
    n.buffer = noise(c);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 0.7;
    n.connect(bp).connect(env(c, 0.7, 0.002, 0.18, t));
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    o.connect(env(c, 0.4, 0.002, 0.1, t));
    n.start(t);
    n.stop(t + 0.25);
    o.start(t);
    o.stop(t + 0.15);
  } else {
    const n = c.createBufferSource();
    n.buffer = noise(c);
    n.loop = true;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6000;
    n.connect(hp).connect(env(c, 0.35, 0.004, 1.1, t));
    n.start(t);
    n.stop(t + 1.2);
  }
}

/** A plucked string (Karplus–Strong), rendered into a buffer. */
function pluck(c: Ctx, freq: number, seconds: number): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  const period = Math.max(2, Math.round(c.sampleRate / freq));
  const ring = new Float32Array(period).map(() => Math.random() * 2 - 1);
  let idx = 0;
  for (let i = 0; i < len; i++) {
    const next = (idx + 1) % period;
    const v = (ring[idx] + ring[next]) * 0.4985;
    d[i] = ring[idx];
    ring[idx] = v;
    idx = next;
  }
  return buf;
}

const distortionCurve = (() => {
  let curve: Float32Array | null = null;
  return () => {
    if (curve) return curve;
    curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * 3.2);
    }
    return curve;
  };
})();

/** A strummed power chord through a bit of drive. */
export function guitarChord(when = 0, root = 82.41) {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + when;
  const shaper = c.createWaveShaper();
  shaper.curve = distortionCurve();
  const tone = c.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 3200;
  const out = env(c, 0.5, 0.01, 2.2, t);
  shaper.connect(tone).connect(out);
  [1, 1.5, 2, 3].forEach((ratio, i) => {
    const s = c.createBufferSource();
    s.buffer = pluck(c, root * ratio, 2.4);
    s.connect(shaper);
    s.start(t + i * 0.018);
  });
}

export function click() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = 'square';
  o.frequency.value = 1400;
  o.connect(env(c, 0.15, 0.001, 0.03, t));
  o.start(t);
  o.stop(t + 0.05);
}

export function buzz() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = 70;
  o.connect(env(c, 0.25, 0.01, 0.3, t));
  o.start(t);
  o.stop(t + 0.35);
}

export function chime() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime;
  [660, 880].forEach((f, i) => {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(env(c, 0.2, 0.005, 0.5, t + i * 0.09));
    o.start(t + i * 0.09);
    o.stop(t + i * 0.09 + 0.6);
  });
}

let revealClip: HTMLAudioElement | null = null;

/** The final moment: an approved clip if one is configured, otherwise a count-in and a big chord. */
export function revealSting() {
  if (!enabled) return;
  if (REVEAL_AUDIO_URL) {
    revealClip ??= new Audio(REVEAL_AUDIO_URL);
    revealClip.currentTime = 0;
    void revealClip.play().catch(() => undefined);
    return;
  }
  const step = 0.32;
  // Four stick clicks, then everything at once.
  for (let i = 0; i < 4; i++) drum('snare', i * step);
  drum('kick', 4 * step);
  drum('cymbal', 4 * step);
  guitarChord(4 * step);
}
