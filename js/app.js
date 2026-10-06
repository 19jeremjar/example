/* THE AVALANCHES: ON AIR — player logic */
(() => {
  "use strict";

  // ─── Config ───────────────────────────────────────────────
  // Folders of tracks from js/mixtapes.js (an older flat `mixtapes` list still works).
  const FOLDERS = (() => {
    const src =
      typeof folders !== "undefined" && Array.isArray(folders) ? folders :
      typeof mixtapes !== "undefined" && Array.isArray(mixtapes) ? [{ title: "Mixtapes", tracks: mixtapes }] : [];
    return src
      .map((f, fi) => ({
        title: String((f && f.title) || `Folder ${fi + 1}`),
        facts: f && Array.isArray(f.facts) ? f.facts.map(String) : [],
        tracks: (f && Array.isArray(f.tracks) ? f.tracks : [])
          .filter((t) => t && typeof t.youtubeId === "string" && t.youtubeId.trim())
          .map((t) => ({
            title: String(t.title || ""),
            youtubeId: t.youtubeId.trim(),
            track: t.track ? String(t.track) : "",
            facts: Array.isArray(t.facts) ? t.facts.map(String) : [],
          })),
      }))
      .filter((f) => f.tracks.length);
  })();

  // Every track in one list; each knows its folder and position.
  const LIBRARY = [];
  FOLDERS.forEach((f, fi) => f.tracks.forEach((t, pos) => {
    t.folder = fi;
    t.pos = pos;
    t.index = LIBRARY.length;
    LIBRARY.push(t);
  }));

  const STORAGE_KEY = "avalanches-on-air:last";
  const NAMES_KEY = "avalanches-on-air:names";
  // Choosing from the menu or skipping only loads a mixtape (press Play to start)…
  // …unless something is already playing, in which case the music carries on.
  const KEEP_PLAYING_ON_CHANGE = true;
  const WHEEL_STEP_DEG = 26;     // rotation per menu step on the click wheel
  const SEEK_STEP_SECONDS = 15;  // wheel scrub in the now-playing view
  const API_TIMEOUT_MS = 15000;
  const MUTED_RETRY_MS = 1600;   // if sound is blocked, start muted after this long
  const PLAY_STALL_MS = 4500;    // …and give up (ask for a tap) after this long
  const REVEAL_DELAY_MS = 1100;  // keep the static up while YouTube flashes its play icon
  const LOADING_STATIC_SOUND = true; // quiet radio hiss while tuning in

  const YT_STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };

  // ─── Elements ─────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const el = {
    screen: $("screen"),
    statusIcon: $("status-icon"),
    statusLabel: $("status-label"),
    lcdTrack: $("lcd-track"),
    fact: $("fact"),
    factText: $("fact-text"),
    factClose: $("fact-close"),
    batt: $("batt"),
    battPct: $("batt-pct"),
    battFill: $("batt-fill"),
    idle: $("idle"),
    idleArt: $("idle-art"),
    noise: $("noise"),
    viz: $("viz"),
    fallback: $("fallback"),
    fallbackLink: $("fallback-link"),
    nowTitle: $("now-title"),
    nowTitleText: $("now-title-text"),
    nowStatus: $("now-status"),
    nowTime: $("now-time"),
    progressBar: $("progress-bar"),
    menu: $("menu"),
    menuList: $("menu-list"),
    live: $("live"),
    wheel: $("wheel"),
    btnMenu: $("btn-menu"),
    btnPrev: $("btn-prev"),
    btnNext: $("btn-next"),
    btnPlay: $("btn-play"),
    btnSelect: $("btn-select"),
    btnShuffle: $("btn-shuffle"),
  };

  // ─── State ────────────────────────────────────────────────
  const state = {
    index: 0,
    view: "now",          // "now" | "menu"
    menuFolder: null,     // null = folder list, otherwise the folder being browsed
    menuActions: [],
    highlight: 0,
    phase: "idle",        // idle | ready | loading | playing | paused | ended | blocked | error
    started: false,       // has the current video actually started rendering?
    revealed: false,      // has the static cleared to show the video?
    wantPlay: false,      // has playback been requested for the current video?
    mutedFallback: false, // playing muted because the browser blocked sound
    player: null,
    playerReady: false,
    loadedId: null,       // video id currently loaded/cued in the player
    pending: null,        // { id, autoplay } waiting for the player to be ready
  };

  let apiPromise = null;
  let progressTimer = 0;
  let revealTimer = 0;
  let audioCtx = null;
  const stallTimers = [];

  // ─── Helpers ──────────────────────────────────────────────
  const current = () => LIBRARY[state.index];

  function randomInt(maxExclusive) {
    if (maxExclusive <= 1) return 0;
    const c = window.crypto;
    if (c && c.getRandomValues) {
      // Rejection sampling: unbiased random integer in [0, maxExclusive).
      const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
      const buf = new Uint32Array(1);
      do { c.getRandomValues(buf); } while (buf[0] >= limit);
      return buf[0] % maxExclusive;
    }
    return Math.floor(Math.random() * maxExclusive);
  }

  // A random index that is never the current one (when there is more than one).
  function randomOtherIndex(n, currentIndex) {
    if (n <= 1) return 0;
    const r = randomInt(n - 1);
    return r >= currentIndex ? r + 1 : r;
  }

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const mm = h ? String(m).padStart(2, "0") : String(m);
    return (h ? h + ":" : "") + mm + ":" + String(s).padStart(2, "0");
  }

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  }

  function announce(msg) {
    el.live.textContent = "";
    // Next frame so repeated messages are re-read by screen readers.
    requestAnimationFrame(() => { el.live.textContent = msg; });
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ youtubeId: current().youtubeId, folder: current().folder, index: state.index }));
    } catch (_) { /* storage unavailable — fine */ }
  }

  function restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return 0;
      const saved = JSON.parse(raw);
      const byId = Math.max(
        LIBRARY.findIndex((m) => m.youtubeId === saved.youtubeId && m.folder === saved.folder),
        LIBRARY.findIndex((m) => m.youtubeId === saved.youtubeId),
      );
      if (byId >= 0) return byId;
      if (Number.isInteger(saved.index) && saved.index >= 0 && saved.index < LIBRARY.length) return saved.index;
    } catch (_) { /* ignore */ }
    return 0;
  }

  function isPlayingish() {
    return state.phase === "playing" || (state.phase === "loading" && state.wantPlay);
  }

  // ─── Track names (from YouTube) ───────────────────────────
  const trackNames = (() => {
    try { return JSON.parse(localStorage.getItem(NAMES_KEY)) || {}; } catch (_) { return {}; }
  })();

  function cleanTitle(t) {
    return String(t)
      .replace(/\s*[([](?:official|lyric|lyrics|audio|video|visuali[sz]er|hd|hq|4k|remaster(?:ed)?)[^)\]]*[)\]]/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function trackName(m) {
    return m.track || m.title || trackNames[m.youtubeId] || "";
  }

  function displayName(m) {
    return trackName(m) || `Track ${m.pos + 1}`;
  }

  function positionLabel(m) {
    const f = FOLDERS[m.folder];
    return `${f.title} · ${m.pos + 1}/${f.tracks.length}`;
  }

  function learnName(id, raw) {
    if (!id || !raw) return;
    const name = cleanTitle(raw) || String(raw);
    if (trackNames[id] === name) return;
    trackNames[id] = name;
    try { localStorage.setItem(NAMES_KEY, JSON.stringify(trackNames)); } catch (_) { /* ignore */ }
    if (current() && current().youtubeId === id) renderTitle();
  }

  // Best effort: look the name up before the video loads. The player fills it in otherwise.
  function fetchName(m) {
    if (!m || trackName(m) || !window.fetch) return;
    const url = "https://www.youtube.com/oembed?format=json&url="
      + encodeURIComponent(`https://www.youtube.com/watch?v=${m.youtubeId}`);
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j && j.title) learnName(m.youtubeId, j.title); })
      .catch(() => { /* offline or blocked — the player will tell us */ });
  }

  function learnFromPlayer() {
    const p = state.player;
    if (!p || !p.getVideoData) return;
    const d = p.getVideoData();
    if (d && d.video_id && d.title) learnName(d.video_id, d.title);
  }

  // ─── Rendering ────────────────────────────────────────────
  const SPINNER = ["|", "/", "-", "\\"];
  let spinnerFrame = 0;
  let spinnerTimer = 0;

  const STATUS_TEXT = {
    idle: "Press play",
    ready: "Ready · press play",
    loading: "Tuning in…",
    playing: "Playing",
    paused: "Paused",
    ended: "Finished",
    blocked: "Tap play to start",
    error: "No signal",
  };

  function renderStatus() {
    const muted = state.phase === "playing" && state.mutedFallback;
    el.nowStatus.textContent = muted ? "Muted · tap ▶ for sound" : (STATUS_TEXT[state.phase] || "");
  }

  function setPhase(phase) {
    state.phase = phase;
    el.screen.dataset.phase = phase;
    renderStatus();

    clearInterval(spinnerTimer);
    if (phase === "loading") {
      const tick = () => { el.statusIcon.textContent = SPINNER[spinnerFrame++ % 4]; };
      tick();
      spinnerTimer = setInterval(tick, 140);
    } else {
      el.statusIcon.textContent =
        phase === "playing" ? "▶" :
        phase === "paused" ? "❚❚" :
        phase === "error" ? "!" : "■";
    }

    el.btnPlay.setAttribute("aria-label", isPlayingish() ? "Pause" : "Play");

    if (phase === "playing") startProgress(); else stopProgress();
    if (phase === "playing") scheduleReveal(); else if (phase !== "loading") hideVideo();
    if (phase === "playing") scheduleFact(); else if (phase !== "loading") cancelFact();
    updateIdle();
    startViz();
  }

  // The video only shows once it has been playing for a moment, so YouTube's own
  // play/pause flash happens behind the static.
  function scheduleReveal() {
    if (state.revealed || revealTimer) return;
    revealTimer = setTimeout(() => {
      revealTimer = 0;
      if (state.phase === "playing") { state.revealed = true; updateIdle(); }
    }, REVEAL_DELAY_MS);
  }

  function hideVideo() {
    clearTimeout(revealTimer);
    revealTimer = 0;
    state.revealed = false;
  }

  function renderTitle() {
    const m = current();
    if (!m) {
      el.nowTitleText.textContent = "No mixtapes";
      return;
    }
    const name = displayName(m);
    if (scrambleTimer) return; // the scramble lands on the new name itself
    el.lcdTrack.textContent = name;
    el.lcdTrack.title = name;
    el.nowTitleText.textContent = name;
    el.nowTitle.title = name;
    if (state.view === "now") el.statusLabel.textContent = positionLabel(m);
    el.menuList.querySelectorAll(".menu-item").forEach((b) => {
      const on = b.dataset.track ? Number(b.dataset.track) === state.index
        : b.dataset.folder ? Number(b.dataset.folder) === m.folder : false;
      b.setAttribute("aria-current", on ? "true" : "false");
    });
    fitMarquee();
  }

  // Shuffle: the names roll like a slot machine before landing on the new track.
  const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#*+?";
  let scrambleTimer = 0;
  function scrambleTitle() {
    if (reduceMotion.matches) return;
    clearInterval(scrambleTimer);
    const start = performance.now();
    const DURATION = 520;
    const roll = (text, t) => {
      const settled = Math.floor(text.length * t);
      let out = text.slice(0, settled);
      for (let i = settled; i < text.length; i++) {
        out += text[i] === " " ? " " : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
      }
      return out;
    };
    el.nowTitleText.classList.remove("is-marquee");
    scrambleTimer = setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / DURATION);
      const name = displayName(current());
      el.nowTitleText.textContent = roll(name, t * t);
      el.lcdTrack.textContent = roll(name, t);
      if (t >= 1) {
        clearInterval(scrambleTimer);
        scrambleTimer = 0;
        renderTitle();
      }
    }, 45);
  }

  // Long track names scroll back and forth, like an old iPod.
  function fitMarquee() {
    if (scrambleTimer) return;
    const span = el.nowTitleText;
    span.classList.remove("is-marquee");
    span.style.removeProperty("--marquee");
    const over = span.scrollWidth - el.nowTitle.clientWidth;
    if (over > 2 && !reduceMotion.matches) {
      span.style.setProperty("--marquee", `${-over}px`);
      span.style.setProperty("--marquee-dur", `${Math.max(5, over / 22)}s`);
      span.classList.add("is-marquee");
    }
  }

  function updateIdle() {
    // Our own screen covers the video until it's really playing, and while paused —
    // so YouTube's title / play-button overlays never show.
    const showIdle = state.phase !== "error" && !state.revealed;
    const tuning = state.phase === "loading" || state.phase === "playing";
    el.idle.dataset.hidden = showIdle ? "false" : "true";
    el.idle.dataset.mode = tuning ? "static" : "art";
    // The fuzz sound follows the fuzz picture.
    if (showIdle && tuning && state.wantPlay) startStaticSound(); else stopStaticSound();
    if (showIdle) startIdleAnimation(); else stopIdleAnimation();
  }

  function showFallback() {
    const m = current();
    el.fallbackLink.href = `https://www.youtube.com/watch?v=${encodeURIComponent(m.youtubeId)}`;
    el.fallback.hidden = false;
    state.wantPlay = false;
    setPhase("error");
    announce(`${displayName(m)} can’t be played here. You can watch it on YouTube or shuffle for another.`);
  }

  function hideFallback() {
    el.fallback.hidden = true;
  }

  // ─── Progress ─────────────────────────────────────────────
  function updateProgress() {
    const p = state.player;
    if (!p || !state.playerReady || typeof p.getCurrentTime !== "function") return;
    const t = p.getCurrentTime() || 0;
    const d = p.getDuration() || 0;
    el.progressBar.style.width = d > 0 ? `${Math.min(100, (t / d) * 100)}%` : "0%";
    el.nowTime.textContent = d > 0 ? `${formatTime(t)} / ${formatTime(d)}` : formatTime(t);
  }

  function startProgress() {
    stopProgress();
    updateProgress();
    progressTimer = setInterval(updateProgress, 500);
  }

  function stopProgress() {
    clearInterval(progressTimer);
    progressTimer = 0;
  }

  function resetProgress() {
    el.progressBar.style.width = "0%";
    el.nowTime.textContent = "";
  }

  // ─── Idle / paused visual: critter + screen noise ─────────
  const IDLE_FRAMES = [
    ["    ,/\\,,/\\,     ", "   ( =o  o= )  ♪ ", "  \\(   ~~   )/   ", "    \\_/  \\_/     "],
    ["    ,/\\,,/\\,     ", "   ( =o  o= )   ♫", "  /(   ~~   )\\   ", "    \\_/  \\_/     "],
    ["    ,/\\,,/\\,     ", "   ( =-  -= )  ♪ ", "  \\(   ~~   )/   ", "     \\_/\\_/      "],
    ["    ,/\\,,/\\,     ", "   ( =o  o= ) ♫  ", "  /(   ~~   )\\   ", "    \\_/  \\_/     "],
  ];
  const LOADING_FRAMES = [
    ["   .  ·  .  ·    ", "  ( =o  o= )     ", "  tuning in       ", "   ·  .  ·  .    "],
    ["   ·  .  ·  .    ", "  ( =o  o= )     ", "  tuning in.      ", "   .  ·  .  ·    "],
    ["   .  ·  .  ·    ", "  ( =O  O= )     ", "  tuning in..     ", "   ·  .  ·  .    "],
    ["   ·  .  ·  .    ", "  ( =o  o= )     ", "  tuning in...    ", "   .  ·  .  ·    "],
  ];
  const PAUSED_FRAMES = [
    ["    ,/\\,,/\\,     ", "   ( =-  -= )  z ", "  (    ~~    )   ", "    \\_/  \\_/     "],
    ["    ,/\\,,/\\,     ", "   ( =-  -= )   Z", "  (    ~~    )  z", "    \\_/  \\_/     "],
  ];

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const noiseCtx = el.noise.getContext("2d");
  const noiseImage = noiseCtx ? noiseCtx.createImageData(el.noise.width, el.noise.height) : null;
  let idleRaf = 0;
  let idleFrame = 0;
  let lastNoise = 0;
  let lastArt = 0;

  function drawNoise() {
    if (!noiseImage) return;
    const d = noiseImage.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() * 255;
      d[i] = v * 0.85; d[i + 1] = v; d[i + 2] = v * 0.92; d[i + 3] = 255;
    }
    noiseCtx.putImageData(noiseImage, 0, 0);
    // A bright band rolling up the screen, like a detuned TV.
    const h = el.noise.height;
    const y = h - ((performance.now() / 18) % (h + 12));
    noiseCtx.fillStyle = "rgba(255, 255, 255, 0.28)";
    noiseCtx.fillRect(0, y, el.noise.width, 5);
  }

  let staticSound = null;

  // Browsers (iOS especially) only allow page audio after a tap, so warm the
  // audio up on the first one.
  function unlockAudio() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (_) { /* no Web Audio */ }
  }
  ["pointerdown", "keydown", "touchstart"].forEach((ev) =>
    document.addEventListener(ev, unlockAudio, { capture: true, passive: true }));
  function startStaticSound() {
    if (!LOADING_STATIC_SOUND || staticSound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const buf = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const band = audioCtx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 2200;
      band.Q.value = 0.6;
      const g = audioCtx.createGain();
      const t = audioCtx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.08, t + 0.08);
      src.connect(band).connect(g).connect(audioCtx.destination);
      src.start();
      staticSound = { src, g };
    } catch (_) { staticSound = null; }
  }

  function stopStaticSound() {
    if (!staticSound) return;
    const { src, g } = staticSound;
    staticSound = null;
    try {
      const t = audioCtx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 0.25);
      src.stop(t + 0.3);
    } catch (_) { /* ignore */ }
  }

  function drawArt() {
    const frames =
      state.phase === "loading" ? LOADING_FRAMES :
      state.phase === "paused" || state.phase === "blocked" ? PAUSED_FRAMES : IDLE_FRAMES;
    el.idleArt.textContent = frames[idleFrame % frames.length].join("\n");
  }

  function idleLoop(ts) {
    if (ts - lastNoise > 80) { drawNoise(); lastNoise = ts; }
    if (ts - lastArt > 420) { idleFrame++; drawArt(); lastArt = ts; }
    idleRaf = requestAnimationFrame(idleLoop);
  }

  function startIdleAnimation() {
    drawArt();
    if (reduceMotion.matches) { drawNoise(); return; }
    if (!idleRaf) idleRaf = requestAnimationFrame(idleLoop);
  }

  function stopIdleAnimation() {
    if (idleRaf) cancelAnimationFrame(idleRaf);
    idleRaf = 0;
  }

  // ─── Visualiser ───────────────────────────────────────────
  // YouTube doesn't expose its audio to the page, so this is a beat-driven
  // simulation: a tempo per mixtape, kick on the low bars, hats up top.
  const VIZ_BARS = 24;
  const VIZ_SEGS = 9;
  const VIZ_COLOR = "#2350ff";
  const vizCtx = el.viz.getContext("2d");
  const viz = {
    levels: new Float32Array(VIZ_BARS),
    peaks: new Float32Array(VIZ_BARS),
    wobble: new Float32Array(VIZ_BARS).map(() => Math.random()),
    raf: 0,
    bpm: 112,
  };

  function vizDraw() {
    if (!vizCtx) return;
    const W = el.viz.width;
    const H = el.viz.height;
    const bw = 4;
    const segH = 2;
    const gap = 1;
    vizCtx.clearRect(0, 0, W, H);
    for (let i = 0; i < VIZ_BARS; i++) {
      const x = i * (bw + 1);
      const lit = Math.round(viz.levels[i] * VIZ_SEGS);
      const peak = Math.min(VIZ_SEGS - 1, Math.round(viz.peaks[i] * VIZ_SEGS));
      for (let s = 0; s < VIZ_SEGS; s++) {
        const y = H - (s + 1) * (segH + gap) + gap;
        if (s < lit) vizCtx.fillStyle = VIZ_COLOR;
        else if (s === peak && peak > 0) vizCtx.fillStyle = "#141414";
        else vizCtx.fillStyle = "rgba(20, 20, 20, 0.08)";
        vizCtx.fillRect(x, y, bw, segH);
      }
    }
  }

  function vizLoop(ts) {
    const active = state.phase === "playing";
    const beatMs = 60000 / viz.bpm;
    const kick = Math.pow(1 - (ts % beatMs) / beatMs, 3);
    const half = beatMs / 2;
    const hat = Math.pow(1 - (ts % half) / half, 6);
    const bar = Math.floor(ts / (beatMs * 4));
    const swell = 0.8 + 0.2 * Math.sin(bar * 1.7);
    let moving = false;

    for (let i = 0; i < VIZ_BARS; i++) {
      const f = i / (VIZ_BARS - 1);
      viz.wobble[i] = Math.min(1, Math.max(0, viz.wobble[i] + (Math.random() - 0.5) * 0.22 + (0.5 - viz.wobble[i]) * 0.05));
      const target = active
        ? Math.min(1, swell * (0.2 + 0.8 * kick * Math.pow(1 - f, 1.2) + 0.45 * hat * Math.pow(f, 1.1) + 0.6 * viz.wobble[i] * (1 - 0.3 * f)))
        : 0;
      const k = target > viz.levels[i] ? 0.55 : 0.14;
      viz.levels[i] += (target - viz.levels[i]) * k;
      viz.peaks[i] = Math.max(viz.levels[i], viz.peaks[i] - 0.015);
      if (viz.levels[i] > 0.01 || viz.peaks[i] > 0.01) moving = true;
    }
    vizDraw();
    viz.raf = active || moving ? requestAnimationFrame(vizLoop) : 0;
  }

  function startViz() {
    if (reduceMotion.matches) {
      viz.levels.forEach((_, i) => { viz.levels[i] = state.phase === "playing" ? 0.25 + 0.4 * viz.wobble[i] : 0; });
      vizDraw();
      return;
    }
    if (!viz.raf && !document.hidden) viz.raf = requestAnimationFrame(vizLoop);
  }

  function stopViz() {
    if (viz.raf) cancelAnimationFrame(viz.raf);
    viz.raf = 0;
  }

  // ─── YouTube ──────────────────────────────────────────────
  function loadYouTubeApi() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("YouTube API timed out")), API_TIMEOUT_MS);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        clearTimeout(timer);
        if (typeof prev === "function") prev();
        resolve(window.YT);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.onerror = () => { clearTimeout(timer); reject(new Error("YouTube API failed to load")); };
      document.head.appendChild(s);
    }).catch((err) => { apiPromise = null; throw err; });
    return apiPromise;
  }

  function createPlayer(YT) {
    const { id, autoplay } = state.pending;
    const vars = {
      autoplay: autoplay ? 1 : 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3,
      modestbranding: 1,
      playsinline: 1,
      rel: 0,
    };
    if (/^https?:$/.test(location.protocol)) vars.origin = location.origin;

    state.loadedId = id;
    state.player = new YT.Player("yt-mount", {
      host: "https://www.youtube-nocookie.com",
      videoId: id,
      playerVars: vars,
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError,
      },
    });
  }

  function onPlayerReady() {
    state.playerReady = true;
    const iframe = state.player.getIframe && state.player.getIframe();
    if (iframe) {
      iframe.setAttribute("title", "Mixtape video");
      iframe.setAttribute("tabindex", "-1");
    }
    const p = state.pending;
    state.pending = null;
    if (!p) return;
    if (p.id !== state.loadedId) {
      applyToPlayer(p.id, p.autoplay);
    } else if (p.autoplay) {
      state.player.playVideo();
      watchForStall();
    } else {
      setPhase("ready");
    }
  }

  function onPlayerStateChange(e) {
    // Ignore events from a video we've since moved away from.
    const data = state.player.getVideoData ? state.player.getVideoData() : null;
    if (data && data.video_id && data.video_id !== current().youtubeId) return;

    switch (e.data) {
      case YT_STATE.PLAYING:
        clearStallTimers();
        state.started = true;
        state.wantPlay = true;
        if (state.mutedFallback && !state.player.isMuted()) state.mutedFallback = false;
        learnFromPlayer();
        setPhase("playing");
        break;
      case YT_STATE.PAUSED:
        state.wantPlay = false;
        setPhase("paused");
        updateProgress();
        break;
      case YT_STATE.BUFFERING:
        setPhase("loading");
        break;
      case YT_STATE.CUED:
        learnFromPlayer();
        if (state.phase !== "error" && !state.wantPlay) setPhase("ready");
        break;
      case YT_STATE.ENDED:
        setPhase("ended");
        // Roll straight into the next mixtape, like a tape flipping over.
        select(neighbour(1), { play: true });
        break;
      default:
        break;
    }
  }

  function onPlayerError() {
    clearStallTimers();
    showFallback();
  }

  function clearStallTimers() {
    while (stallTimers.length) clearTimeout(stallTimers.pop());
  }

  // Browsers sometimes refuse to start sound without a direct tap on the video.
  // First nudge it, then fall back to muted playback, then ask for a tap.
  function watchForStall() {
    clearStallTimers();
    const id = state.loadedId;
    const stillWaiting = () => state.wantPlay && !state.started && state.loadedId === id && state.phase !== "error";
    stallTimers.push(setTimeout(() => {
      const p = state.player;
      if (!stillWaiting() || !p || !state.playerReady) return;
      if (p.getPlayerState() === YT_STATE.BUFFERING) return; // just slow, not blocked
      state.mutedFallback = true;
      p.mute();
      p.playVideo();
    }, MUTED_RETRY_MS));
    stallTimers.push(setTimeout(() => {
      if (stillWaiting()) { state.wantPlay = false; setPhase("blocked"); }
    }, PLAY_STALL_MS));
  }

  // Called from taps: a direct user gesture is allowed to turn the sound back on.
  function restoreSound() {
    const p = state.player;
    if (state.mutedFallback && p && state.playerReady) {
      p.unMute();
      state.mutedFallback = false;
      renderStatus();
    }
  }

  function applyToPlayer(id, autoplay) {
    state.loadedId = id;
    if (autoplay) {
      restoreSound();
      state.player.loadVideoById(id);
      watchForStall();
    } else {
      state.player.cueVideoById(id);
    }
  }

  // Load the current mixtape into the (lazily created) player.
  function loadCurrent(autoplay) {
    const id = current().youtubeId;
    state.wantPlay = autoplay;
    setPhase("loading");

    if (state.player && state.playerReady) {
      applyToPlayer(id, autoplay);
      if (!autoplay) setPhase("ready");
      return;
    }

    state.pending = { id, autoplay };
    if (state.player) return; // still booting; onReady picks up `pending`

    loadYouTubeApi()
      .then((YT) => {
        if (!state.player && state.pending) createPlayer(YT);
      })
      .catch(() => {
        state.pending = null;
        showFallback();
      });
  }

  // ─── Actions ──────────────────────────────────────────────
  function select(i, { play = false, announceAs } = {}) {
    if (!LIBRARY.length) return;
    state.index = ((i % LIBRARY.length) + LIBRARY.length) % LIBRARY.length;
    state.started = false;
    hideVideo();
    cancelFact(true);
    clearStallTimers();
    hideFallback();
    resetProgress();
    viz.bpm = 92 + (hash(current().youtubeId) % 44);
    renderTitle();
    save();
    fetchName(current());
    loadCurrent(play);
    const name = displayName(current());
    announce(announceAs || `${name}${play ? ", playing" : " selected. Press play to listen."}`);
  }

  function togglePlay() {
    if (!LIBRARY.length) return;
    const m = current();
    const p = state.player;

    if (state.phase === "error") {
      // Try once more — the network may have come back.
      select(state.index, { play: true });
      return;
    }
    if (!p || !state.playerReady || state.loadedId !== m.youtubeId) {
      if (state.pending) {
        state.pending.autoplay = !state.pending.autoplay;
        state.wantPlay = state.pending.autoplay;
        setPhase(state.wantPlay ? "loading" : "ready");
        return;
      }
      loadCurrent(true);
      announce(`${displayName(m)}, playing`);
      return;
    }

    const ps = p.getPlayerState();
    if ((ps === YT_STATE.PLAYING || ps === YT_STATE.BUFFERING) && state.mutedFallback) {
      // Playing silently: this tap turns the sound on instead of pausing.
      restoreSound();
      announce("Sound on");
    } else if (ps === YT_STATE.PLAYING || ps === YT_STATE.BUFFERING) {
      state.wantPlay = false;
      p.pauseVideo();
      announce("Paused");
    } else {
      restoreSound();
      state.wantPlay = true;
      p.playVideo();
      if (!state.started) { setPhase("loading"); watchForStall(); }
      announce(`${displayName(m)}, playing`);
    }
  }

  // Previous / next stay inside the current folder (wrapping around).
  function neighbour(delta) {
    const m = current();
    const tracks = FOLDERS[m.folder].tracks;
    return tracks[(m.pos + delta + tracks.length) % tracks.length].index;
  }

  function step(delta) {
    select(neighbour(delta), { play: KEEP_PLAYING_ON_CHANGE && isPlayingish() });
    if (state.view === "menu" && state.menuFolder === current().folder) setHighlight(current().pos + 1);
  }

  function shuffle() {
    if (!LIBRARY.length) return;
    // Any track in any folder — never the one playing now (even if it's in two folders).
    let next = randomOtherIndex(LIBRARY.length, state.index);
    for (let i = 0; i < 20 && LIBRARY[next].youtubeId === current().youtubeId; i++) {
      next = randomOtherIndex(LIBRARY.length, state.index);
    }
    el.btnShuffle.classList.remove("is-spun");
    void el.btnShuffle.offsetWidth; // restart the icon animation
    el.btnShuffle.classList.add("is-spun");
    if (state.view === "menu") closeMenu(false);
    const m = LIBRARY[next];
    scrambleTitle();
    select(next, { play: true, announceAs: `Shuffled to ${displayName(m)} from ${FOLDERS[m.folder].title}, playing` });
  }

  // ─── Menu: folders → tracks ──────────────────────────────
  function renderMenu() {
    const atRoot = state.menuFolder === null;
    const entries = atRoot
      ? FOLDERS.map((f, fi) => ({
          label: f.title,
          count: f.tracks.length,
          data: { folder: fi },
          current: current().folder === fi,
          act: () => enterFolder(fi, current().folder === fi ? current().pos + 1 : 1),
        }))
      : [{ label: "‹ Back", back: true, data: { back: 1 }, act: menuBack }].concat(
          FOLDERS[state.menuFolder].tracks.map((t) => ({
            label: displayName(t),
            data: { track: t.index },
            current: t.index === state.index,
            act: () => {
              select(t.index, { play: KEEP_PLAYING_ON_CHANGE && isPlayingish() });
              closeMenu(true);
            },
          })));

    state.menuActions = entries.map((e) => e.act);
    const frag = document.createDocumentFragment();
    entries.forEach((e, i) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.className = e.back ? "menu-item is-back" : "menu-item";
      b.id = `menu-item-${i}`;
      b.dataset.pos = String(i);
      Object.entries(e.data).forEach(([k, v]) => { b.dataset[k] = String(v); });
      b.tabIndex = -1;
      b.setAttribute("aria-current", e.current ? "true" : "false");
      b.innerHTML = '<span class="mi-title"></span><span class="mi-mark" aria-hidden="true">♪</span><span class="mi-count" aria-hidden="true"></span><span class="mi-chev" aria-hidden="true">›</span>';
      b.querySelector(".mi-title").textContent = e.label;
      if (e.back) {
        b.querySelector(".mi-chev").textContent = "";
        b.setAttribute("aria-label", "Back to folders");
      }
      if (e.count) {
        b.querySelector(".mi-count").textContent = String(e.count);
        b.setAttribute("aria-label", `${e.label}, folder, ${e.count} tracks`);
      }
      b.addEventListener("click", () => { setHighlight(i); e.act(); });
      li.appendChild(b);
      frag.appendChild(li);
    });
    el.menuList.textContent = "";
    el.menuList.appendChild(frag);
    el.menuList.setAttribute("aria-label", atRoot ? "Folders" : FOLDERS[state.menuFolder].title);
    el.statusLabel.textContent = atRoot ? "Mixtapes" : FOLDERS[state.menuFolder].title;
    el.btnMenu.setAttribute("aria-label", atRoot ? "Menu: back to now playing" : "Menu: back to folders");
  }

  function enterFolder(fi, highlight) {
    state.menuFolder = fi;
    renderMenu();
    setHighlight(highlight, { focus: true });
  }

  // MENU goes up a level: tracks → folders → now playing.
  function menuBack() {
    if (state.menuFolder !== null) {
      const fi = state.menuFolder;
      state.menuFolder = null;
      renderMenu();
      setHighlight(fi, { focus: true });
    } else {
      closeMenu(true);
    }
  }

  function menuItems() { return el.menuList.querySelectorAll(".menu-item"); }

  function setHighlight(i, { focus } = {}) {
    const items = menuItems();
    if (!items.length) return;
    state.highlight = Math.max(0, Math.min(items.length - 1, i));
    items.forEach((b, idx) => {
      const on = idx === state.highlight;
      b.classList.toggle("is-hl", on);
      b.tabIndex = on ? 0 : -1;
    });
    const target = items[state.highlight];
    target.scrollIntoView({ block: "nearest" });
    const focusInMenu = el.menu.contains(document.activeElement);
    if (focus || focusInMenu) target.focus({ preventScroll: true });
  }

  function openMenu() {
    if (state.view === "menu" || !LIBRARY.length) return;
    state.view = "menu";
    state.menuFolder = null;
    el.screen.dataset.view = "menu";
    el.menu.hidden = false;
    el.btnMenu.setAttribute("aria-expanded", "true");
    el.btnSelect.setAttribute("aria-label", "Select highlighted item");
    renderMenu();
    setHighlight(current().folder, { focus: true });
  }

  function closeMenu(returnFocus) {
    if (state.view !== "menu") return;
    const hadFocus = el.menu.contains(document.activeElement);
    state.view = "now";
    el.screen.dataset.view = "now";
    el.menu.hidden = true;
    el.statusLabel.textContent = positionLabel(current());
    el.btnMenu.setAttribute("aria-expanded", "false");
    el.btnMenu.setAttribute("aria-label", "Menu: browse folders");
    el.btnSelect.setAttribute("aria-label", "Select: play or pause");
    if (returnFocus || hadFocus) el.btnMenu.focus({ preventScroll: true });
  }

  function toggleMenu() {
    if (state.view === "menu") menuBack(); else openMenu();
  }

  function pressCenter() {
    if (state.view === "menu") {
      const act = state.menuActions[state.highlight];
      if (act) act();
    } else {
      togglePlay();
    }
  }

  // ─── Click wheel rotation ─────────────────────────────────
  function tick() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const t = audioCtx.currentTime;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "square";
      o.frequency.value = 1800;
      g.gain.setValueAtTime(0.025, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
      o.connect(g).connect(audioCtx.destination);
      o.start(t);
      o.stop(t + 0.015);
    } catch (_) { /* no audio — fine */ }
  }

  function wheelStep(dir) {
    tick();
    if (state.view === "menu") {
      setHighlight(state.highlight + dir);
      return;
    }
    // In now-playing, the wheel scrubs through the mix.
    const p = state.player;
    if (p && state.playerReady && state.started && state.loadedId === current().youtubeId) {
      const d = p.getDuration() || 0;
      const t = Math.max(0, Math.min(d ? d - 1 : Infinity, (p.getCurrentTime() || 0) + dir * SEEK_STEP_SECONDS));
      p.seekTo(t, true);
      updateProgress();
    }
  }

  (function setupWheelRotation() {
    let active = null; // { id, lastAngle, acc, total, captured }
    let suppressClick = false;

    const angleOf = (e) => {
      const r = el.wheel.getBoundingClientRect();
      return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * (180 / Math.PI);
    };

    el.wheel.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest(".wheel-center")) return;
      active = { id: e.pointerId, lastAngle: angleOf(e), acc: 0, total: 0, captured: false };
    });

    el.wheel.addEventListener("pointermove", (e) => {
      if (!active || e.pointerId !== active.id) return;
      const a = angleOf(e);
      let d = a - active.lastAngle;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      active.lastAngle = a;
      active.acc += d;
      active.total += Math.abs(d);

      if (!active.captured && active.total > 10) {
        active.captured = true;
        try { el.wheel.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      }
      while (active.acc >= WHEEL_STEP_DEG) { active.acc -= WHEEL_STEP_DEG; wheelStep(1); }
      while (active.acc <= -WHEEL_STEP_DEG) { active.acc += WHEEL_STEP_DEG; wheelStep(-1); }
    });

    const end = (e) => {
      if (!active || e.pointerId !== active.id) return;
      if (active.captured) {
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 0);
      }
      active = null;
    };
    el.wheel.addEventListener("pointerup", end);
    el.wheel.addEventListener("pointercancel", end);

    // A spin shouldn't also count as a button press.
    el.wheel.addEventListener("click", (e) => {
      if (suppressClick) { e.stopPropagation(); e.preventDefault(); }
    }, true);

    // Trackpads / mouse wheels scroll the menu too.
    el.wheel.addEventListener("wheel", (e) => {
      if (state.view !== "menu") return;
      e.preventDefault();
      wheelStep(e.deltaY > 0 ? 1 : -1);
    }, { passive: false });
  })();

  // ─── Wiring ───────────────────────────────────────────────
  el.btnMenu.addEventListener("click", toggleMenu);
  el.btnPrev.addEventListener("click", () => step(-1));
  el.btnNext.addEventListener("click", () => step(1));
  el.btnPlay.addEventListener("click", togglePlay);
  el.btnSelect.addEventListener("click", pressCenter);
  el.btnShuffle.addEventListener("click", shuffle);

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.documentElement.classList.contains("intro-active")) {
      if (introEl.contains(e.target) && e.key !== "Escape") return; // Enter/Space on the card's own button
      finishIntro(); // any other key dismisses the tip (and still does its job below)
      if (e.key === "Escape") { e.preventDefault(); return; }
    }
    const t = e.target;
    if (t && t.closest && t.closest("input, textarea, select, [contenteditable='true']")) return;
    const onControl = t && t.closest && t.closest("button, a");

    switch (e.key) {
      case " ":
      case "Spacebar":
        if (onControl) return;
        e.preventDefault();
        togglePlay();
        break;
      case "k":
      case "K":
        togglePlay();
        break;
      case "ArrowLeft":
        e.preventDefault();
        step(-1);
        break;
      case "ArrowRight":
        e.preventDefault();
        step(1);
        break;
      case "ArrowUp":
      case "ArrowDown":
        if (state.view !== "menu") return;
        e.preventDefault();
        setHighlight(state.highlight + (e.key === "ArrowDown" ? 1 : -1), { focus: true });
        break;
      case "Home":
      case "End":
        if (state.view !== "menu") return;
        e.preventDefault();
        setHighlight(e.key === "Home" ? 0 : menuItems().length - 1, { focus: true });
        break;
      case "Enter":
        if (state.view === "menu" && !onControl) { e.preventDefault(); pressCenter(); }
        break;
      case "Escape":
        if (state.view === "menu") { e.preventDefault(); closeMenu(true); }
        break;
      case "m":
      case "M":
        toggleMenu();
        break;
      case "s":
      case "S":
        shuffle();
        break;
      default:
        break;
    }
  });

  // Keep the menu highlight in sync when tabbing/clicking into it.
  el.menuList.addEventListener("focusin", (e) => {
    const b = e.target.closest(".menu-item");
    if (b) setHighlight(Number(b.dataset.pos));
  });

  // Pause the animations when the tab is hidden.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { stopIdleAnimation(); stopViz(); } else { updateIdle(); startViz(); }
  });

  if (window.ResizeObserver) new ResizeObserver(() => fitMarquee()).observe(el.nowTitle);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitMarquee);

  // ─── "Did you know?" facts ───────────────────────────────
  // 5s into a track a fact slides up over the video and stays until closed:
  // the song's own fact first if it has one, otherwise one about its folder /
  // album. Long tracks swap in a new one every so often, never repeating the
  // last few.
  const FACT_FIRST_MS = 5000;
  const FACT_EVERY_MS = 75000;
  const factState = { timer: 0, hideTimer: 0, shownFor: null, recent: [] };

  function pickFact(m) {
    const own = m.facts || [];
    const album = FOLDERS[m.folder].facts || [];
    const fresh = (list) => list.filter((f) => !factState.recent.includes(f));
    let pool = factState.shownFor !== m.index ? fresh(own) : [];
    if (!pool.length) pool = fresh(own.concat(album));
    if (!pool.length) pool = own.concat(album).filter((f) => f !== factState.recent[factState.recent.length - 1]);
    return pool.length ? pool[randomInt(pool.length)] : "";
  }

  function showFact() {
    factState.timer = 0;
    const m = current();
    if (state.phase !== "playing" || document.documentElement.classList.contains("intro-active")) return;
    const fact = pickFact(m);
    if (fact) {
      factState.shownFor = m.index;
      factState.recent = factState.recent.concat(fact).slice(-4);
      el.factText.textContent = fact;
      el.fact.hidden = false;
      el.fact.classList.remove("is-leaving");
      // It stays up until closed (or the track changes).
    }
    factState.timer = setTimeout(showFact, FACT_EVERY_MS);
  }

  function hideFact() {
    clearTimeout(factState.hideTimer);
    factState.hideTimer = 0;
    if (el.fact.hidden) return;
    if (reduceMotion.matches) { el.fact.hidden = true; return; }
    el.fact.classList.add("is-leaving");
    setTimeout(() => { if (el.fact.classList.contains("is-leaving")) el.fact.hidden = true; }, 300);
  }

  function scheduleFact() {
    if (factState.timer) return;
    factState.timer = setTimeout(showFact, FACT_FIRST_MS);
  }

  // Pausing stops the countdown; changing track also clears what's on screen.
  function cancelFact(clearScreen) {
    clearTimeout(factState.timer);
    factState.timer = 0;
    if (clearScreen) hideFact();
  }

  el.factClose.addEventListener("click", hideFact);

  // ─── Battery ──────────────────────────────────────────────
  // Shows the device's real battery where the browser shares it; otherwise a
  // pretend one that drains slowly while music plays and is "charged" overnight.
  const BATTERY_KEY = "avalanches-on-air:battery";
  const battery = { level: 1, charging: false, real: false };

  function renderBattery() {
    const pct = Math.max(0, Math.min(100, Math.round(battery.level * 100)));
    el.battPct.textContent = `${pct}%`;
    el.battFill.style.width = `${Math.max(4, pct)}%`;
    el.batt.dataset.level = pct <= 10 ? "critical" : pct <= 20 ? "low" : "ok";
    el.batt.dataset.charging = battery.charging ? "true" : "false";
    el.batt.setAttribute("aria-label", `Battery ${pct}%${battery.charging ? ", charging" : ""}`);
  }

  (function setupBattery() {
    try {
      const saved = JSON.parse(localStorage.getItem(BATTERY_KEY));
      if (saved && Date.now() - saved.t < 3 * 3600 * 1000) battery.level = saved.level;
    } catch (_) { /* fresh battery */ }
    renderBattery();

    if (navigator.getBattery) {
      navigator.getBattery().then((b) => {
        const update = () => {
          battery.real = true;
          battery.level = b.level;
          battery.charging = b.charging;
          renderBattery();
        };
        update();
        b.addEventListener("levelchange", update);
        b.addEventListener("chargingchange", update);
      }).catch(() => { /* not shared — keep the pretend one */ });
    }

    setInterval(() => {
      if (battery.real || state.phase !== "playing") return;
      battery.level = Math.max(0.05, battery.level - 0.01);
      renderBattery();
      try { localStorage.setItem(BATTERY_KEY, JSON.stringify({ level: battery.level, t: Date.now() })); } catch (_) { /* ignore */ }
    }, 75000);
  })();

  // ─── Intro tip (first visit) ─────────────────────────────
  // Three cards over the iPod: a welcome, then one pointing at MENU, then Shuffle.
  // "Got it", or using any control, puts it away for good (?intro shows it again).
  const INTRO_KEY = "avalanches-on-air:intro";
  const introEl = $("intro");

  function finishIntro() {
    const html = document.documentElement;
    if (!html.classList.contains("intro-active")) return;
    try { localStorage.setItem(INTRO_KEY, "done"); } catch (_) { /* ignore */ }
    const done = () => {
      html.classList.remove("intro-active");
      html.classList.add("intro-done");
    };
    if (reduceMotion.matches) { done(); return; }
    introEl.classList.add("is-leaving");
    introEl.addEventListener("animationend", done, { once: true });
    setTimeout(done, 400); // in case animations are off
  }

  const INTRO_STEPS = [
    {
      target: "none",
      title: "Welcome",
      html: "Albums, remixes and DJ sets from The Avalanches, all on one little iPod.",
      button: "Next",
    },
    {
      target: "menu",
      title: "Use the wheel",
      html: "Press <b>MENU</b> to see the folders. Spin the wheel to scroll, then press the centre to choose.",
      button: "Next",
    },
    {
      target: "shuffle",
      title: "Discover something new",
      html: "Press <b>Shuffle</b> to play a random track.",
      button: "Got it",
    },
  ];
  let introStep = 0;

  function showIntroStep(i) {
    introStep = i;
    const step = INTRO_STEPS[i];
    introEl.dataset.target = step.target;
    document.documentElement.dataset.introTarget = step.target;
    $("intro-count").textContent = String(i + 1);
    $("intro-total").textContent = String(INTRO_STEPS.length);
    $("intro-title").textContent = step.title;
    $("intro-text").innerHTML = step.html;
    $("intro-next").textContent = step.button;
    if (i > 0 && !reduceMotion.matches) {
      introEl.classList.remove("is-swapping");
      void introEl.offsetWidth;
      introEl.classList.add("is-swapping");
    }
  }

  if (introEl) {
    showIntroStep(0);
    $("intro-next").addEventListener("click", () => {
      if (introStep < INTRO_STEPS.length - 1) {
        showIntroStep(introStep + 1);
        $("intro-next").focus({ preventScroll: true });
      } else {
        finishIntro();
        el.btnShuffle.focus({ preventScroll: true });
      }
    });
    $("intro-close").addEventListener("click", finishIntro);
    // Pressing any iPod control also dismisses it (and the control still works).
    [el.wheel, el.btnShuffle].forEach((c) => c.addEventListener("pointerdown", finishIntro));
    [el.btnMenu, el.btnPrev, el.btnNext, el.btnPlay, el.btnSelect, el.btnShuffle].forEach((b) => b.addEventListener("click", finishIntro));
  }

  // ─── Boot ─────────────────────────────────────────────────
  if (!LIBRARY.length) {
    el.nowTitleText.textContent = "No mixtapes";
    [el.btnMenu, el.btnPrev, el.btnNext, el.btnPlay, el.btnSelect, el.btnShuffle].forEach((b) => { b.disabled = true; });
    setPhase("idle");
    return;
  }
  state.index = restore();
  state.highlight = state.index;
  viz.bpm = 92 + (hash(current().youtubeId) % 44);
  renderTitle();
  fetchName(current());
  el.btnSelect.setAttribute("aria-label", "Select: play or pause");
  setPhase("idle"); // no iframe until a mixtape is chosen or play is pressed
})();
