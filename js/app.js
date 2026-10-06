/* THE AVALANCHES: ON AIR — player logic */
(() => {
  "use strict";

  // ─── Config ───────────────────────────────────────────────
  const LIBRARY = (typeof mixtapes !== "undefined" && Array.isArray(mixtapes) ? mixtapes : [])
    .filter((m) => m && typeof m.youtubeId === "string" && m.youtubeId.trim())
    .map((m, i) => ({ title: String(m.title || `Mixtape ${i + 1}`), youtubeId: m.youtubeId.trim() }));

  const STORAGE_KEY = "avalanches-on-air:last";
  // Choosing from the menu or skipping only loads a mixtape (press Play to start)…
  // …unless something is already playing, in which case the music carries on.
  const KEEP_PLAYING_ON_CHANGE = true;
  const WHEEL_STEP_DEG = 26;     // rotation per menu step on the click wheel
  const SEEK_STEP_SECONDS = 15;  // wheel scrub in the now-playing view
  const API_TIMEOUT_MS = 15000;
  const PLAY_STALL_MS = 5000;

  const YT_STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };

  // ─── Elements ─────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const el = {
    screen: $("screen"),
    statusIcon: $("status-icon"),
    statusLabel: $("status-label"),
    idle: $("idle"),
    idleArt: $("idle-art"),
    noise: $("noise"),
    fallback: $("fallback"),
    fallbackLink: $("fallback-link"),
    nowTitle: $("now-title"),
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
    highlight: 0,
    phase: "idle",        // idle | ready | loading | playing | paused | ended | blocked | error
    started: false,       // has the current video actually started rendering?
    player: null,
    playerReady: false,
    loadedId: null,       // video id currently loaded/cued in the player
    pending: null,        // { id, autoplay } waiting for the player to be ready
  };

  let apiPromise = null;
  let progressTimer = 0;
  let stallTimer = 0;

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

  function announce(msg) {
    el.live.textContent = "";
    // Next frame so repeated messages are re-read by screen readers.
    requestAnimationFrame(() => { el.live.textContent = msg; });
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ youtubeId: current().youtubeId, index: state.index }));
    } catch (_) { /* storage unavailable — fine */ }
  }

  function restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return 0;
      const saved = JSON.parse(raw);
      const byId = LIBRARY.findIndex((m) => m.youtubeId === saved.youtubeId);
      if (byId >= 0) return byId;
      if (Number.isInteger(saved.index) && saved.index >= 0 && saved.index < LIBRARY.length) return saved.index;
    } catch (_) { /* ignore */ }
    return 0;
  }

  function isPlayingish() {
    return state.phase === "playing" || (state.phase === "loading" && state.pending && state.pending.autoplay)
      || (state.phase === "loading" && state.started);
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

  function setPhase(phase) {
    state.phase = phase;
    el.screen.dataset.phase = phase;
    el.nowStatus.textContent = STATUS_TEXT[phase] || "";

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

    const playing = phase === "playing" || phase === "loading";
    el.btnPlay.setAttribute("aria-label", playing ? "Pause" : "Play");

    if (phase === "playing") startProgress(); else stopProgress();
    updateIdle();
  }

  function renderTitle() {
    const m = current();
    el.nowTitle.textContent = m ? m.title : "No mixtapes";
    el.nowTitle.title = m ? m.title : "";
    el.menuList.querySelectorAll(".menu-item").forEach((b, i) => {
      b.setAttribute("aria-current", i === state.index ? "true" : "false");
    });
    if (state.view === "now") el.statusLabel.textContent = "On Air";
  }

  function updateIdle() {
    const showIdle = !state.started && state.phase !== "error";
    el.idle.dataset.hidden = showIdle ? "false" : "true";
    if (showIdle) startIdleAnimation(); else stopIdleAnimation();
  }

  function showFallback() {
    const m = current();
    el.fallbackLink.href = `https://www.youtube.com/watch?v=${encodeURIComponent(m.youtubeId)}`;
    el.fallback.hidden = false;
    setPhase("error");
    announce(`${m.title} can’t be played here. You can watch it on YouTube or shuffle for another.`);
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

  // ─── Idle visual: dancing critter + screen noise ──────────
  const IDLE_FRAMES = [
    [
      "    ,/\\,,/\\,     ",
      "   ( =o  o= )  ♪ ",
      "  \\(   ~~   )/   ",
      "    \\_/  \\_/     ",
    ],
    [
      "    ,/\\,,/\\,     ",
      "   ( =o  o= )   ♫",
      "  /(   ~~   )\\   ",
      "    \\_/  \\_/     ",
    ],
    [
      "    ,/\\,,/\\,     ",
      "   ( =-  -= )  ♪ ",
      "  \\(   ~~   )/   ",
      "     \\_/\\_/      ",
    ],
    [
      "    ,/\\,,/\\,     ",
      "   ( =o  o= ) ♫  ",
      "  /(   ~~   )\\   ",
      "    \\_/  \\_/     ",
    ],
  ];
  const LOADING_FRAMES = [
    ["   .  ·  .  ·    ", "  ( =o  o= )     ", "  tuning in       ", "   ·  .  ·  .    "],
    ["   ·  .  ·  .    ", "  ( =o  o= )     ", "  tuning in.      ", "   .  ·  .  ·    "],
    ["   .  ·  .  ·    ", "  ( =O  O= )     ", "  tuning in..     ", "   ·  .  ·  .    "],
    ["   ·  .  ·  .    ", "  ( =o  o= )     ", "  tuning in...    ", "   .  ·  .  ·    "],
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
  }

  function drawArt() {
    const frames = state.phase === "loading" ? LOADING_FRAMES : IDLE_FRAMES;
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
      iframe.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture");
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
        clearTimeout(stallTimer);
        state.started = true;
        setPhase("playing");
        break;
      case YT_STATE.PAUSED:
        setPhase("paused");
        updateProgress();
        break;
      case YT_STATE.BUFFERING:
        setPhase("loading");
        break;
      case YT_STATE.CUED:
        if (state.phase !== "error") setPhase("ready");
        break;
      case YT_STATE.ENDED:
        setPhase("ended");
        // Roll straight into the next mixtape, like a tape flipping over.
        select((state.index + 1) % LIBRARY.length, { play: true });
        break;
      default:
        break;
    }
  }

  function onPlayerError() {
    clearTimeout(stallTimer);
    showFallback();
  }

  // Mobile browsers sometimes refuse to start playback without a direct tap.
  function watchForStall() {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      if (state.phase === "loading" && !state.started) setPhase("blocked");
    }, PLAY_STALL_MS);
  }

  function applyToPlayer(id, autoplay) {
    state.loadedId = id;
    if (autoplay) {
      state.player.loadVideoById(id);
      watchForStall();
    } else {
      state.player.cueVideoById(id);
    }
  }

  // Load the current mixtape into the (lazily created) player.
  function loadCurrent(autoplay) {
    const id = current().youtubeId;
    setPhase("loading");

    if (state.player && state.playerReady) {
      applyToPlayer(id, autoplay);
      if (!autoplay) setPhase("ready");
      return;
    }

    state.pending = { id, autoplay };
    if (state.player) return; // still booting — onReady picks up `pending`

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
    clearTimeout(stallTimer);
    hideFallback();
    resetProgress();
    renderTitle();
    save();
    loadCurrent(play);
    announce(announceAs || `${current().title}${play ? ", playing" : " selected. Press play to listen."}`);
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
      if (state.pending) { state.pending.autoplay = !state.pending.autoplay; setPhase(state.pending.autoplay ? "loading" : "ready"); return; }
      loadCurrent(true);
      announce(`${m.title}, playing`);
      return;
    }

    const ps = p.getPlayerState();
    if (ps === YT_STATE.PLAYING || ps === YT_STATE.BUFFERING) {
      p.pauseVideo();
      announce("Paused");
    } else {
      p.playVideo();
      if (!state.started) { setPhase("loading"); watchForStall(); }
      announce(`${m.title}, playing`);
    }
  }

  function step(delta) {
    select(state.index + delta, { play: KEEP_PLAYING_ON_CHANGE && isPlayingish() });
    if (state.view === "menu") setHighlight(state.index);
  }

  function shuffle() {
    if (!LIBRARY.length) return;
    const next = randomOtherIndex(LIBRARY.length, state.index);
    el.btnShuffle.classList.remove("is-spun");
    void el.btnShuffle.offsetWidth; // restart the icon animation
    el.btnShuffle.classList.add("is-spun");
    if (state.view === "menu") closeMenu(false);
    select(next, { play: true, announceAs: `Shuffled to ${LIBRARY[next].title}, playing` });
  }

  // ─── Menu ─────────────────────────────────────────────────
  function buildMenu() {
    const frag = document.createDocumentFragment();
    LIBRARY.forEach((m, i) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "menu-item";
      b.id = `mix-${i}`;
      b.dataset.index = String(i);
      b.tabIndex = -1;
      b.innerHTML = '<span class="mi-title"></span><span class="mi-mark" aria-hidden="true">♪</span><span class="mi-chev" aria-hidden="true">›</span>';
      b.querySelector(".mi-title").textContent = m.title;
      b.addEventListener("click", () => {
        select(i, { play: KEEP_PLAYING_ON_CHANGE && isPlayingish() });
        closeMenu(true);
      });
      li.appendChild(b);
      frag.appendChild(li);
    });
    el.menuList.appendChild(frag);
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
    el.screen.dataset.view = "menu";
    el.menu.hidden = false;
    el.statusLabel.textContent = "Mixtapes";
    el.btnMenu.setAttribute("aria-expanded", "true");
    el.btnMenu.setAttribute("aria-label", "Menu: back to now playing");
    el.btnSelect.setAttribute("aria-label", "Select highlighted mixtape");
    setHighlight(state.index, { focus: true });
  }

  function closeMenu(returnFocus) {
    if (state.view !== "menu") return;
    const hadFocus = el.menu.contains(document.activeElement);
    state.view = "now";
    el.screen.dataset.view = "now";
    el.menu.hidden = true;
    el.statusLabel.textContent = "On Air";
    el.btnMenu.setAttribute("aria-expanded", "false");
    el.btnMenu.setAttribute("aria-label", "Menu: show mixtape list");
    el.btnSelect.setAttribute("aria-label", "Select: play or pause");
    if (returnFocus || hadFocus) el.btnMenu.focus({ preventScroll: true });
  }

  function toggleMenu() {
    if (state.view === "menu") closeMenu(false); else openMenu();
  }

  function pressCenter() {
    if (state.view === "menu") {
      const i = state.highlight;
      select(i, { play: KEEP_PLAYING_ON_CHANGE && isPlayingish() });
      closeMenu(false);
    } else {
      togglePlay();
    }
  }

  // ─── Click wheel rotation ─────────────────────────────────
  let audioCtx = null;
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
        setHighlight(e.key === "Home" ? 0 : LIBRARY.length - 1, { focus: true });
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
    if (b) setHighlight(Number(b.dataset.index));
  });

  // Pause the idle animation when the tab is hidden.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopIdleAnimation(); else updateIdle();
  });

  // ─── Boot ─────────────────────────────────────────────────
  buildMenu();
  if (!LIBRARY.length) {
    el.nowTitle.textContent = "No mixtapes";
    [el.btnMenu, el.btnPrev, el.btnNext, el.btnPlay, el.btnSelect, el.btnShuffle].forEach((b) => { b.disabled = true; });
    setPhase("idle");
    return;
  }
  state.index = restore();
  state.highlight = state.index;
  renderTitle();
  el.btnSelect.setAttribute("aria-label", "Select: play or pause");
  setPhase("idle"); // no iframe until a mixtape is chosen or play is pressed
})();
