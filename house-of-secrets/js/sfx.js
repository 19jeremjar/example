/* HOUSE OF SECRETS — analogue sound effects, synthesised with Web Audio (no files) */
window.SFX = (() => {
  "use strict";

  let ctx = null, master = null, noiseBuf = null, staticNode = null, staticGain = null;
  let muted = false;

  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function setMuted(m) {
    muted = m;
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.02);
  }

  function tone(freq, dur, { type = "sine", vol = 0.3, to = null, delay = 0 } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise(dur, { freq = 1200, q = 0.8, vol = 0.3, type = "bandpass", to = null, delay = 0 } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    f.Q.value = q;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t, Math.random());
    s.stop(t + dur + 0.05);
  }

  // Continuous TV static; level 0–1.
  function setStatic(level) {
    if (!ctx) return;
    if (!staticNode && level > 0) {
      staticNode = ctx.createBufferSource();
      staticNode.buffer = noiseBuf;
      staticNode.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 2200;
      f.Q.value = 0.5;
      staticGain = ctx.createGain();
      staticGain.gain.value = 0;
      staticNode.connect(f).connect(staticGain).connect(master);
      staticNode.start();
    }
    if (staticGain) staticGain.gain.setTargetAtTime(level * 0.08, ctx.currentTime, 0.05);
    if (staticNode && level <= 0) {
      const n = staticNode;
      staticNode = null;
      setTimeout(() => { try { n.stop(); } catch (e) {} }, 200);
    }
  }

  return {
    init, setMuted, setStatic,
    click: () => { tone(1800, 0.03, { type: "square", vol: 0.08 }); noise(0.03, { freq: 3000, vol: 0.15 }); },
    tap: () => tone(420, 0.06, { type: "triangle", vol: 0.12, to: 300 }),
    thunk: () => { tone(140, 0.18, { vol: 0.4, to: 60 }); noise(0.08, { freq: 500, vol: 0.2 }); },
    paper: () => noise(0.35, { freq: 2500, q: 0.4, vol: 0.22, to: 5000 }),
    drawer: () => { noise(0.6, { freq: 300, q: 1.5, vol: 0.35, to: 900, type: "lowpass" }); tone(90, 0.5, { vol: 0.15, to: 70 }); },
    unlock: () => { tone(900, 0.05, { type: "square", vol: 0.1 }); tone(1300, 0.08, { type: "square", vol: 0.1, delay: 0.09 }); noise(0.1, { freq: 4000, vol: 0.2, delay: 0.09 }); },
    tick: () => noise(0.025, { freq: 5000, q: 4, vol: 0.25 }),
    buzz: () => tone(110, 0.3, { type: "sawtooth", vol: 0.12 }),
    tvOn: () => { tone(15000, 0.4, { vol: 0.03 }); noise(0.25, { freq: 2000, vol: 0.25 }); tone(60, 0.25, { vol: 0.3, to: 40 }); },
    chime: () => { [523.25, 783.99, 1046.5].forEach((f, i) => tone(f, 1.4, { vol: 0.16, delay: i * 0.12 })); },
    hum: () => { tone(50, 2.6, { type: "sawtooth", vol: 0.08, to: 120 }); tone(100, 2.6, { vol: 0.12, to: 240 }); noise(2.4, { freq: 200, vol: 0.12, to: 3000, delay: 0.2 }); },
    swell: () => { [261.63, 392, 523.25, 659.25].forEach((f, i) => tone(f, 4, { vol: 0.09, delay: i * 0.25 })); },
  };
})();
