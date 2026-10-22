/* THE 1975 — HOUSE OF SECRETS — game logic
 *
 * Four clues are hidden around the house. Each points to a song.
 * Name all four songs and the box in the middle opens.
 */
(() => {
  "use strict";

  const CFG = window.HOUSE_CONFIG;
  const ART = window.ART;
  const KEYS = ["tv", "photo", "hat", "drawer"];
  const NAMES = { tv: "The television", photo: "The photograph", hat: "The rabbit hat", drawer: "The cabinet drawer" };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // ─── Progress (localStorage) ─────────────────────────────
  const fresh = () => ({
    solved: { tv: false, photo: false, hat: false, drawer: false },
    photoRead: false,
    hatLifted: false,
    drawerOpen: false,
    pieces: [false, false, false],
    opened: false,
  });

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(CFG.storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        return { ...fresh(), ...saved, solved: { ...fresh().solved, ...saved.solved } };
      }
    } catch (e) {}
    return fresh();
  }

  function save() {
    try { localStorage.setItem(CFG.storageKey, JSON.stringify(state)); } catch (e) {}
  }

  const solvedCount = () => KEYS.filter((k) => state.solved[k]).length;
  const clueNumber = (key) => KEYS.indexOf(key) + 1;
  const normalize = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]/g, "");

  // ─── Clue pictures ───────────────────────────────────────
  function artFor(key) {
    const song = CFG.songs[key];
    if (song.image) {
      return `<svg class="art" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">` +
        `<image href="${song.image}" width="600" height="400" preserveAspectRatio="xMidYMid slice"/></svg>`;
    }
    return ART[song.art].draw();
  }

  const cropFor = (key) => (CFG.songs[key].image ? [150, 100, 300, 200] : ART[CFG.songs[key].art].crop);

  // ─── Narration ───────────────────────────────────────────
  const narrationEl = $("#narration");
  let typeTimer = 0;

  function say(text) {
    clearInterval(typeTimer);
    narrationEl.textContent = "";
    let i = 0;
    typeTimer = setInterval(() => {
      narrationEl.textContent = text.slice(0, ++i);
      if (i >= text.length) clearInterval(typeTimer);
    }, 16);
  }

  // ─── Room state → scene and tracker ──────────────────────
  const scene = $("#scene");
  const boxLight = $(".box-light", scene);
  const PERIMETER = 2 * (boxLight.width.baseVal.value + boxLight.height.baseVal.value);

  function renderScene() {
    const n = solvedCount();
    const lit = state.opened ? PERIMETER : (n / 4) * PERIMETER;
    boxLight.style.strokeDasharray = `${lit} ${PERIMETER}`;
    boxLight.style.opacity = n || state.opened ? 1 : 0;
    scene.classList.toggle("tv-on", state.solved.tv);
    scene.classList.toggle("photo-straight", state.solved.photo);
    scene.classList.toggle("hat-moved", state.hatLifted);
    scene.classList.toggle("drawer-open", state.drawerOpen);
    scene.classList.toggle("ready", n === 4);
    scene.classList.toggle("opened", state.opened);
    KEYS.forEach((k) => {
      const done = state.solved[k];
      $(`.marker[data-for="${k}"]`, scene).classList.toggle("done", done);
      const spot = $(`[data-obj="${k}"]`, scene);
      spot.classList.toggle("solved", done);
      spot.setAttribute("tabindex", done ? "-1" : "0");
      spot.setAttribute("aria-disabled", String(done));
    });
  }

  function renderTracker() {
    const n = solvedCount();
    KEYS.forEach((k) => {
      const slot = $(`#slot-${k}`);
      $(".slot-value", slot).textContent = state.solved[k] ? CFG.songs[k].title : "?";
      slot.classList.toggle("found", state.solved[k]);
    });
    $("#progress").textContent = n === 4 ? "All 4 songs found. Tap the box." : `${n} of 4 songs found`;
  }

  function refresh() {
    renderScene();
    renderTracker();
    save();
  }

  function flickerBox() {
    boxLight.classList.remove("flicker");
    void boxLight.getBoundingClientRect();
    boxLight.classList.add("flicker");
  }

  // Numbered markers beside each clue, so it's clear where to look.
  function placeMarkers() {
    const layer = $("#markers", scene);
    KEYS.forEach((k, i) => {
      const spot = $(`[data-obj="${k}"]`, scene);
      const b = spot.getBBox();
      const m = document.createElementNS("http://www.w3.org/2000/svg", "g");
      m.setAttribute("class", "marker");
      m.dataset.for = k;
      // The hat sits on the cabinet, so its marker goes top-left and the drawer's lower down.
      const at = { hat: [b.x + 14, b.y + 20], drawer: [b.x + b.width - 6, b.y + 60] }[k] || [b.x + b.width - 6, b.y + 6];
      m.setAttribute("transform", `translate(${at[0]} ${at[1]})`);
      m.innerHTML = `<circle r="22"/><text class="marker-num" y="8">${i + 1}</text><path class="marker-tick" d="M-9 0 L-3 7 L10 -7"/>`;
      m.addEventListener("click", () => open(k));
      layer.appendChild(m);
    });
  }

  // ─── Inspect window ──────────────────────────────────────
  const modal = $("#modal");
  const modalBody = $("#modal-body");
  let cleanup = null;
  let returnFocus = null;
  let autoClose = 0;

  function openWindow(title, build, kicker = "") {
    if (!modal.hidden) closeWindow();
    clearTimeout(autoClose);
    returnFocus = document.activeElement;
    $("#modal-kicker").textContent = kicker;
    $("#modal-title").textContent = title;
    modalBody.innerHTML = "";
    modal.hidden = false;
    document.body.classList.add("modal-open");
    cleanup = build(modalBody) || null;
    requestAnimationFrame(() => $("#modal-close").focus({ preventScroll: true }));
  }

  function closeWindow() {
    clearTimeout(autoClose);
    if (modal.hidden) return;
    if (typeof cleanup === "function") cleanup();
    cleanup = null;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    if (returnFocus && returnFocus.focus) returnFocus.focus({ preventScroll: true });
    if (solvedCount() === 4 && !state.opened) say("All 4 songs found. Tap the box in the middle.");
  }

  $("#modal-close").addEventListener("click", closeWindow);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeWindow(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeWindow(); });

  const el = (html) => {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  // The standard layout of a clue window: what to do, the interaction, then the guess.
  function clueWindow(key, build) {
    openWindow(NAMES[key], (body) => {
      body.appendChild(el(`<p class="window-how">${CFG.songs[key].clue}</p>`));
      const done = build(body);
      body.appendChild(guessForm(key));
      return done;
    }, `Clue ${clueNumber(key)} of 4`);
  }

  // "Which song is it?" for one clue.
  function guessForm(key) {
    const song = CFG.songs[key];
    const form = el(`
      <form class="guess" autocomplete="off">
        <label class="guess-label" for="guess-${key}">Which song is it?</label>
        <div class="guess-row">
          <input id="guess-${key}" class="guess-input" type="text" placeholder="Type the song title" spellcheck="false" autocapitalize="words" enterkeyhint="done">
          <button type="submit" class="btn btn-solid">Guess</button>
        </div>
        <div class="guess-foot">
          <p class="guess-msg" aria-live="polite"></p>
          <button type="button" class="link-btn" data-act="hint">Need a hint?</button>
        </div>
      </form>`);
    const input = $("input", form), msg = $(".guess-msg", form), hintBtn = $("[data-act=hint]", form);
    let misses = 0;

    function showSolved(justNow) {
      form.innerHTML = justNow
        ? `<p class="stamp correct"><span>Correct</span>${song.title}</p>`
        : `<p class="stamp"><span>Song ${clueNumber(key)}</span>${song.title}</p>`;
    }
    if (state.solved[key]) { showSolved(); return form; }

    function showHint() {
      msg.classList.add("is-hint");
      msg.textContent = song.hint;
      hintBtn.hidden = true;
    }
    hintBtn.addEventListener("click", showHint);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const g = normalize(input.value);
      if (!g) return;
      if (song.answers.some((a) => normalize(a) === g)) {
        state.solved[key] = true;
        refresh();
        flickerBox();
        showSolved(true);
        form.scrollIntoView({ block: "nearest", behavior: "smooth" });
        const n = solvedCount();
        say(n === 4 ? `Correct: ${song.title}. All 4 songs found.` : `Correct: ${song.title}. ${n} of 4 songs found.`);
        // Let "Correct" sink in, then close the window.
        autoClose = setTimeout(closeWindow, 1800);
      } else {
        misses++;
        form.classList.remove("shake");
        void form.offsetWidth;
        form.classList.add("shake");
        if (misses >= 2) showHint();
        else { msg.classList.remove("is-hint"); msg.textContent = "Not quite. Try again."; }
        input.select();
      }
    });
    return form;
  }

  // ─── Clue 1 · The television ─────────────────────────────
  function openTV() {
    clueWindow("tv", (body) => {
      const TARGET = 64;
      const solved = state.solved.tv;
      let on = solved, ch = solved ? 3 : 1, tune = solved ? TARGET : 14, locked = false;
      body.appendChild(el(`
        <div class="tv">
          <div class="tv-screen">
            <div class="tv-layer tv-art">${artFor("tv")}</div>
            <div class="tv-layer tv-ident">
              <span class="oval">75</span>
              <span class="ident-name">THE1975</span>
            </div>
            <canvas class="tv-layer tv-static" width="120" height="90"></canvas>
            <div class="tv-layer tv-scan"></div>
            <p class="tv-osd"></p>
            <p class="tv-off">Press Power</p>
          </div>
          <div class="tv-panel">
            <button type="button" class="tv-btn" data-act="power">Power</button>
            <button type="button" class="tv-btn" data-act="ch">Channel</button>
          </div>
          <label class="tv-tune"><span>Tune</span>
            <input type="range" min="0" max="100" value="${tune}" aria-label="Tune">
          </label>
        </div>`));
      const steps = el(`<ol class="steps"><li data-s="1">Press Power</li><li data-s="2">Press Channel until you reach CH 3</li><li data-s="3">Slide Tune until the picture is clear</li></ol>`);
      body.appendChild(steps);

      const tv = $(".tv", body), screen = $(".tv-screen", body), osd = $(".tv-osd", body);
      const art = $(".tv-art", body), canvas = $(".tv-static", body), range = $("input[type=range]", body);
      const g = canvas.getContext("2d");
      const img = g.createImageData(canvas.width, canvas.height);
      let raf = 0, last = 0, staticLevel = 0;

      function drawStatic(t) {
        raf = requestAnimationFrame(drawStatic);
        if (t - last < 70) return;
        last = t;
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const v = 70 + Math.random() * 120;
          d[i] = d[i + 1] = d[i + 2] = v;
          d[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
      }

      const clarity = () => Math.max(0, 1 - Math.abs(tune - TARGET) / 46);

      function render() {
        tv.classList.toggle("on", on);
        screen.dataset.ch = on ? ch : "off";
        const c = clarity();
        if (!on) { staticLevel = 0; osd.textContent = ""; }
        else if (ch === 1) { staticLevel = 0.6; osd.textContent = "CH 1"; }
        else if (ch === 2) { staticLevel = 0.06; osd.textContent = "CH 2"; }
        else {
          staticLevel = Math.max(0.03, 0.55 * (1 - c) ** 1.4);
          art.style.filter = `blur(${((1 - c) * 9).toFixed(1)}px) saturate(${0.4 + c * 0.6})`;
          art.style.transform = c < 0.85 ? `translateY(${((1 - c) * 14 * Math.sin(Date.now() / 90)).toFixed(1)}px) scale(1.05)` : "scale(1.02)";
          osd.textContent = c > 0.9 ? "CH 3 · CLEAR" : `CH 3 · ${Math.round(c * 100)}%`;
          if (c > 0.9 && !locked) {
            locked = true;
            if (!state.solved.tv) say("The picture is clear. Which song is named after this place?");
          }
        }
        canvas.style.opacity = staticLevel;
        // tick off the steps as they're done
        $('[data-s="1"]', steps).classList.toggle("done", on);
        $('[data-s="2"]', steps).classList.toggle("done", on && ch === 3);
        $('[data-s="3"]', steps).classList.toggle("done", on && ch === 3 && c > 0.9);
      }

      body.addEventListener("click", (e) => {
        const b = e.target.closest(".tv-btn");
        if (!b) return;
        if (b.dataset.act === "power") {
          on = !on;
        } else if (on) {
          ch = ch % 3 + 1;
        }
        render();
      });
      range.addEventListener("input", () => {
        tune = +range.value;
        if (on && ch === 3) render();
      });

      raf = requestAnimationFrame(drawStatic);
      const wobble = setInterval(() => { if (on && ch === 3 && clarity() < 0.85) render(); }, 120);
      render();
      return () => { cancelAnimationFrame(raf); clearInterval(wobble); };
    });
  }

  // ─── Clue 2 · The photograph ─────────────────────────────
  function openPhoto() {
    clueWindow("photo", (body) => {
      const song = CFG.songs.photo;
      const crop = cropFor("photo");
      const full = [0, 0, 600, 400];
      let rot = state.solved.photo || state.photoRead ? 0 : 90, flipped = false, wide = state.solved.photo;
      const note = (song.note || []).map((l) => `<span>${l}</span>`).join("");
      body.appendChild(el(`
        <div class="photo-stage">
          <div class="photo-card">
            <div class="photo-face photo-front"><div class="photo-img">${artFor("photo")}</div></div>
            <div class="photo-face photo-back"><p class="handwriting">${note}</p></div>
          </div>
        </div>`));
      body.appendChild(el(`
        <div class="controls">
          <button type="button" class="btn btn-ghost" data-act="rotate">Rotate ↻</button>
          <button type="button" class="btn btn-ghost" data-act="flip">Turn over</button>
        </div>`));

      const card = $(".photo-card", body);
      const pic = $(".photo-img svg", body);
      pic.setAttribute("viewBox", (wide ? full : crop).join(" "));
      let anim = 0;

      function zoomOut() {
        wide = true;
        const t0 = performance.now(), dur = 1400;
        const step = (t) => {
          const k = Math.min(1, (t - t0) / dur), e = 1 - (1 - k) ** 3;
          pic.setAttribute("viewBox", crop.map((v, i) => v + (full[i] - v) * e).join(" "));
          if (k < 1) anim = requestAnimationFrame(step);
        };
        anim = requestAnimationFrame(step);
        say("Now you can see the whole picture.");
      }

      function render() {
        card.style.transform = `rotate(${rot}deg) rotateY(${flipped ? 180 : 0}deg)`;
        if (!wide && state.photoRead && !flipped && rot % 360 === 0) setTimeout(zoomOut, 700);
      }

      body.addEventListener("click", (e) => {
        const b = e.target.closest("[data-act]");
        if (!b || !b.closest(".controls")) return;
        if (b.dataset.act === "rotate") rot += 90;
        else {
          flipped = !flipped;
          if (flipped && !state.photoRead) { state.photoRead = true; save(); }
          say(flipped ? "There's writing on the back." : rot % 360 ? "It's still sideways. Tap Rotate." : "");
        }
        render();
      });
      render();
      return () => cancelAnimationFrame(anim);
    });
  }

  // ─── Clue 3 · The rabbit hat ─────────────────────────────
  function openHat() {
    clueWindow("hat", (body) => {
      const note = (CFG.songs.hat.note || []).map((l) => `<span>${l}</span>`).join("");
      body.appendChild(el(`
        <div class="hat-stage ${state.hatLifted ? "lifted" : ""}">
          <div class="note"><p class="handwriting">${note}</p></div>
          <svg class="hat-big" viewBox="0 0 260 240" aria-hidden="true">
            <path d="M74 140 Q30 40 70 6 Q110 40 104 138Z" fill="#f2efe9"/>
            <path d="M78 130 Q56 56 72 24 Q92 56 94 128Z" fill="#dcaea8"/>
            <path d="M152 138 Q166 30 222 10 Q236 66 186 144Z" fill="#f2efe9"/>
            <path d="M160 130 Q174 50 214 26 Q222 70 180 134Z" fill="#dcaea8"/>
            <path d="M24 226 Q24 128 130 122 Q236 128 236 226Z" fill="#f2efe9" stroke="#d8d2c8" stroke-width="3"/>
            <path d="M36 186 Q130 168 224 186 M30 206 Q130 190 230 206" stroke="#d6cfc4" stroke-width="5" fill="none"/>
            <rect x="14" y="212" width="232" height="24" rx="12" fill="#e2dccf"/>
          </svg>
        </div>`));
      body.appendChild(el(`<div class="controls"><button type="button" class="btn btn-ghost" data-act="lift">${state.hatLifted ? "Put it back" : "Lift the hat"}</button></div>`));
      const stage = $(".hat-stage", body), btn = $("[data-act=lift]", body);
      btn.addEventListener("click", () => {
        const lifted = stage.classList.toggle("lifted");
        btn.textContent = lifted ? "Put it back" : "Lift the hat";
        if (lifted && !state.hatLifted) {
          state.hatLifted = true;
          refresh();
          say("There was a note under the hat.");
        }
      });
    });
  }

  // ─── Clue 4 · The cabinet drawer ─────────────────────────
  function openDrawer() {
    clueWindow("drawer", (body) => {
      const slot = el(`<div></div>`);
      body.appendChild(slot);
      if (state.drawerOpen) { buildPuzzle(slot); return; }
      const closed = el(`
        <div class="drawer-closed">
          <div class="drawer-face"><span class="drawer-pull"></span></div>
          <button type="button" class="btn btn-solid" data-act="open">Open the drawer</button>
        </div>`);
      slot.appendChild(closed);
      $("[data-act=open]", closed).addEventListener("click", () => {
        state.drawerOpen = true;
        refresh();
        closed.classList.add("opening");
        setTimeout(() => { slot.innerHTML = ""; buildPuzzle(slot); }, 500);
        say("Three torn pieces of a photo. Drag them into the frame.");
      });
    });
  }

  function buildPuzzle(slot) {
    // Three strips with shared jagged edges, in percent of the photo.
    const e1 = [[34, 0], [31, 14], [37, 27], [30, 41], [36, 56], [29, 70], [35, 84], [32, 100]];
    const e2 = [[67, 0], [70, 12], [64, 26], [71, 40], [65, 55], [72, 69], [66, 85], [69, 100]];
    const pt = ([x, y]) => `${x}% ${y}%`;
    const shapes = [
      [[0, 0], ...e1, [0, 100]],
      [...e1, ...e2.slice().reverse()],
      [...e2, [100, 100], [100, 0]],
    ];
    const start = [{ x: -16, y: 30, r: -11 }, { x: 14, y: -24, r: 8 }, { x: 9, y: 26, r: -5 }];

    slot.appendChild(el(`
      <div class="puzzle">
        <div class="puzzle-board">
          <div class="puzzle-outline" aria-hidden="true"></div>
          ${shapes.map((s, i) => `
            <div class="piece" data-i="${i}" tabindex="0" role="button" aria-label="Photo piece ${i + 1}. Drag into the frame, or press Enter."
              style="clip-path: polygon(${s.map(pt).join(",")})">${artFor("drawer")}</div>`).join("")}
        </div>
      </div>`));
    const status = el(`<p class="window-text">Drag each piece into the dotted frame.</p>`);
    slot.appendChild(status);

    const board = $(".puzzle-board", slot);
    const pieces = $$(".piece", slot);
    const pos = pieces.map((_, i) => (state.pieces[i] ? { x: 0, y: 0, r: 0 } : { ...start[i] }));
    let z = 2;

    const place = (p, i) => { p.style.transform = `translate(${pos[i].x}%, ${pos[i].y}%) rotate(${pos[i].r}deg)`; };
    pieces.forEach((p, i) => { place(p, i); p.classList.toggle("placed", state.pieces[i]); });

    function snap(p, i) {
      pos[i] = { x: 0, y: 0, r: 0 };
      state.pieces[i] = true;
      p.classList.add("placed");
      place(p, i);
      save();
      checkDone();
    }

    function checkDone(initial) {
      const left = state.pieces.filter((x) => !x).length;
      if (left) { if (!initial) status.textContent = `${left} piece${left > 1 ? "s" : ""} left.`; return; }
      board.classList.add("complete");
      status.textContent = "The photo is back together.";
      if (!initial && !state.solved.drawer) say("The photo is back together. Which song is it?");
    }

    pieces.forEach((p, i) => {
      let sx, sy, ox, oy, rect;
      p.addEventListener("pointerdown", (e) => {
        if (state.pieces[i]) return;
        e.preventDefault();
        p.setPointerCapture(e.pointerId);
        rect = board.getBoundingClientRect();
        sx = e.clientX; sy = e.clientY; ox = pos[i].x; oy = pos[i].y;
        p.style.zIndex = ++z;
        p.classList.add("dragging");
      });
      p.addEventListener("pointermove", (e) => {
        if (!p.classList.contains("dragging")) return;
        pos[i].x = ox + ((e.clientX - sx) / rect.width) * 100;
        pos[i].y = oy + ((e.clientY - sy) / rect.height) * 100;
        place(p, i);
      });
      const drop = () => {
        if (!p.classList.contains("dragging")) return;
        p.classList.remove("dragging");
        if (Math.abs(pos[i].x) < 8 && Math.abs(pos[i].y) < 8) snap(p, i);
      };
      p.addEventListener("pointerup", drop);
      p.addEventListener("pointercancel", drop);
      p.addEventListener("keydown", (e) => {
        if ((e.key === "Enter" || e.key === " ") && !state.pieces[i]) { e.preventDefault(); snap(p, i); }
      });
    });
    checkDone(true);
  }

  // ─── The box ─────────────────────────────────────────────
  function openBox() {
    if (state.opened) { showReveal(); return; }
    const n = solvedCount();
    if (n < 4) {
      openWindow("The box", (body) => {
        body.appendChild(el(`<p class="window-how">The box opens once you've named all 4 songs.</p>`));
        body.appendChild(el(`
          <ol class="box-list">
            ${KEYS.map((k, i) => `<li class="${state.solved[k] ? "done" : ""}"><span>${i + 1}</span>${state.solved[k] ? CFG.songs[k].title : NAMES[k]}</li>`).join("")}
          </ol>`));
        body.appendChild(el(`<p class="window-text">${n} of 4 found. Tap the numbered objects in the room to find the rest.</p>`));
      });
      return;
    }
    // All four found: open it.
    state.opened = true;
    save();
    say("The box is opening…");
    scene.classList.add("opening");
    flickerBox();
    setTimeout(renderScene, 600);
    setTimeout(showReveal, 2600);
  }

  // ─── Reveal ──────────────────────────────────────────────
  function showReveal() {
    const reveal = $("#reveal");
    $("#reveal-songs").innerHTML = KEYS.map((k) => `<li>${CFG.songs[k].title}</li>`).join("");
    const link = $("#signup-link");
    link.href = CFG.signupUrl;
    link.textContent = `${CFG.signupLabel} ↗`;
    $("#game").classList.add("fading");
    setTimeout(() => {
      reveal.hidden = false;
      requestAnimationFrame(() => reveal.classList.add("show"));
    }, 700);
  }

  // ─── How to play ─────────────────────────────────────────
  function showHowTo() {
    openWindow("How to play", (body) => {
      body.appendChild(el(`
        <ol class="how">
          <li><span>1</span>Tap the numbered objects to find four clues.</li>
          <li><span>2</span>Each clue leads to a song by The 1975. Type its name.</li>
          <li><span>3</span>Name all four songs to open the box in the middle.</li>
        </ol>`));
      body.appendChild(el(`<p class="window-text">Stuck? Tap <strong>Hint</strong> at the top to see where to look next.</p>`));
      const start = el(`<div class="controls"><button type="button" class="btn btn-solid">Start</button></div>`);
      $("button", start).addEventListener("click", closeWindow);
      body.appendChild(start);
    });
  }
  $("#howto-btn").addEventListener("click", showHowTo);

  // ─── Hint button: what to do next ────────────────────────
  $("#hint-btn").addEventListener("click", () => {
    const next = KEYS.find((k) => !state.solved[k]);
    const target = next || "box";
    say(next
      ? `Next: clue ${clueNumber(next)}, ${NAMES[next].toLowerCase()}. Look for the ${clueNumber(next)}.`
      : state.opened ? "You've opened the box." : "All 4 songs found. Tap the box in the middle.");
    const spot = $(`[data-obj="${target}"]`, scene);
    spot.classList.remove("pulse");
    void spot.getBoundingClientRect();
    spot.classList.add("pulse");
    revealSpot(spot);
  });

  // On phones, pan so an object is in view.
  const scroller = $("#scene-scroll");
  function revealSpot(spot) {
    if (scroller.scrollWidth <= scroller.clientWidth) return;
    const b = spot.getBBox();
    const cx = ((b.x + b.width / 2) / 1600) * scroller.scrollWidth;
    scroller.scrollTo({ left: cx - scroller.clientWidth / 2, behavior: "smooth" });
  }

  // ─── Wiring ──────────────────────────────────────────────
  const handlers = { tv: openTV, photo: openPhoto, hat: openHat, drawer: openDrawer, box: openBox };
  function open(key) {
    if (state.solved[key]) return; // solved objects are greyed out
    handlers[key]();
  }

  $$(".hotspot", scene).forEach((spot) => {
    spot.addEventListener("click", () => open(spot.dataset.obj));
    spot.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(spot.dataset.obj); }
    });
  });

  $("#pan-left").addEventListener("click", () => scroller.scrollBy({ left: -scroller.clientWidth / 2, behavior: "smooth" }));
  $("#pan-right").addEventListener("click", () => scroller.scrollBy({ left: scroller.clientWidth / 2, behavior: "smooth" }));
  const panState = () => {
    const max = scroller.scrollWidth - scroller.clientWidth;
    $("#pan-left").hidden = scroller.scrollLeft < 8;
    $("#pan-right").hidden = scroller.scrollLeft > max - 8;
  };
  scroller.addEventListener("scroll", panState, { passive: true });
  window.addEventListener("resize", panState);

  // Phones: trim the empty black above and below the set so the room is taller.
  const narrow = window.matchMedia("(max-width: 760px)");
  const fitScene = () => scene.setAttribute("viewBox", narrow.matches ? "0 80 1600 770" : "0 0 1600 900");
  fitScene();
  narrow.addEventListener("change", fitScene);

  function reset() {
    state = fresh();
    save();
    location.reload();
  }
  $("#reset-btn").addEventListener("click", () => {
    if (confirm("Start over? Your progress will be cleared.")) reset();
  });
  $("#again-btn").addEventListener("click", reset);

  $("#enter-btn").addEventListener("click", () => {
    const intro = $("#intro");
    intro.classList.add("leaving");
    setTimeout(() => {
      intro.hidden = true;
      $("#game").hidden = false;
      requestAnimationFrame(() => $("#game").classList.add("show"));
      placeMarkers();
      renderScene();
      if (scroller.scrollWidth > scroller.clientWidth) scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) / 2;
      panState();
      const n = solvedCount();
      if (state.opened) say("The box is open. Tap it to see the message again.");
      else if (n) say(`Welcome back. You've found ${n} of 4 songs.`);
      else { say("Tap number 1, the TV, to begin."); showHowTo(); }
    }, 600);
  });

  renderTracker();
})();
