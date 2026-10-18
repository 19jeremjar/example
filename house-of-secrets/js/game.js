/* THE 1975 — HOUSE OF SECRETS — game logic */
(() => {
  "use strict";

  const CFG = window.HOUSE_CONFIG;
  const ART = window.LANDMARKS;
  const SFX = window.SFX;
  const CITY_KEYS = ["tv", "photo", "drawer"];
  const SECRETS = ["clock", "sign", "lamp"];

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // ─── Progress (localStorage) ─────────────────────────────
  const fresh = () => ({
    code: false,
    drawerOpen: false,
    pieces: [false, false, false],
    photoRead: false,
    cities: { tv: false, photo: false, drawer: false },
    secrets: [],
    lampOff: false,
    door: false,
    muted: false,
  });

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(CFG.storageKey);
      if (raw) return Object.assign(fresh(), JSON.parse(raw));
    } catch (e) {}
    return fresh();
  }

  function save() {
    try { localStorage.setItem(CFG.storageKey, JSON.stringify(state)); } catch (e) {}
  }

  const solvedCount = () => CITY_KEYS.filter((k) => state.cities[k]).length;
  const normalize = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");

  // ─── Landmark art ────────────────────────────────────────
  // Built-in drawings, or a custom image from the config, as one SVG.
  function artFor(key) {
    const city = CFG.cities[key];
    if (city.image) {
      return `<svg class="landmark" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">` +
        `<image href="${city.image}" width="600" height="400" preserveAspectRatio="xMidYMid slice"/></svg>`;
    }
    return ART[city.art].draw();
  }

  function cropFor(key) {
    const city = CFG.cities[key];
    if (city.image) {
      const [x, y, w, h] = city.crop || [30, 20, 35, 35];
      return [x * 6, y * 4, w * 6, h * 4];
    }
    return ART[city.art].crop;
  }

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
    }, 18);
  }

  // ─── Room state → scene ──────────────────────────────────
  const scene = $("#scene");
  const PERIMETER = 2 * (388 + 204);

  function renderScene() {
    const n = solvedCount();
    const light = $(".door-light", scene);
    const lit = state.door ? PERIMETER : (n / 3) * PERIMETER;
    light.style.strokeDasharray = `${lit} ${PERIMETER}`;
    light.style.opacity = n || state.door ? 1 : 0.06;
    $(".door-logo", scene).style.opacity = state.door ? 1 : 0;
    scene.classList.toggle("tv-on", state.cities.tv);
    scene.classList.toggle("drawer-open", state.drawerOpen);
    scene.classList.toggle("hat-moved", state.code);
    scene.classList.toggle("photo-straight", state.cities.photo);
    scene.classList.toggle("lamp-off", state.lampOff);
    scene.classList.toggle("ready", n === 3 && !state.door);
  }

  function renderTracker() {
    const code = $("#slot-code");
    code.classList.toggle("found", state.code);
    $(".slot-value", code).textContent = state.code ? CFG.code.split("").join(" ") : "· · · ·";
    CITY_KEYS.forEach((k) => {
      const el = $(`#slot-${k}`);
      $(".slot-label", el).textContent = CFG.cities[k].label;
      $(".slot-value", el).textContent = state.cities[k] ? CFG.cities[k].name : "———";
      el.classList.toggle("found", state.cities[k]);
    });
    $("#slot-secrets .slot-value").textContent = `${state.secrets.length} / ${SECRETS.length}`;
  }

  function refresh() {
    renderScene();
    renderTracker();
    save();
  }

  function flickerDoor() {
    const light = $(".door-light", scene);
    light.classList.remove("flicker");
    void light.getBoundingClientRect();
    light.classList.add("flicker");
  }

  function findSecret(id) {
    if (state.secrets.includes(id)) return false;
    state.secrets.push(id);
    refresh();
    return true;
  }

  // ─── Inspect window ──────────────────────────────────────
  const modal = $("#modal");
  const modalBody = $("#modal-body");
  let cleanup = null;
  let returnFocus = null;

  function openWindow(title, build) {
    if (cleanup) closeWindow();
    returnFocus = document.activeElement;
    $("#modal-title").textContent = title;
    modalBody.innerHTML = "";
    modal.hidden = false;
    document.body.classList.add("modal-open");
    cleanup = build(modalBody) || null;
    requestAnimationFrame(() => {
      const first = modalBody.querySelector("button, input, [tabindex]");
      (first || $("#modal-close")).focus({ preventScroll: true });
    });
  }

  function closeWindow() {
    if (modal.hidden) return;
    if (typeof cleanup === "function") cleanup();
    cleanup = null;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    if (returnFocus && returnFocus.focus) returnFocus.focus({ preventScroll: true });
  }

  $("#modal-close").addEventListener("click", () => { SFX.tap(); closeWindow(); });
  modal.addEventListener("click", (e) => { if (e.target === modal) closeWindow(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeWindow(); });

  const el = (html) => {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  // A "where is this?" form for one city.
  function guessForm(key, { onSolve } = {}) {
    const city = CFG.cities[key];
    const form = el(`
      <form class="guess" autocomplete="off">
        <label class="guess-label" for="guess-${key}">${city.label} · Where is this?</label>
        <div class="guess-row">
          <input id="guess-${key}" class="guess-input" type="text" placeholder="Type a city" spellcheck="false" autocapitalize="words">
          <button type="submit" class="btn btn-solid">Guess</button>
        </div>
        <p class="guess-msg" aria-live="polite"></p>
      </form>`);
    const input = $("input", form), msg = $(".guess-msg", form);
    let misses = 0;
    const nope = ["Not quite.", "That doesn't feel right.", "Look closer.", "The house doesn't think so."];

    function showSolved() {
      form.innerHTML = `<p class="stamp"><span>${city.label}</span>${city.name}</p>`;
    }
    if (state.cities[key]) { showSolved(); return form; }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const g = normalize(input.value);
      if (!g) return;
      if (city.answers.some((a) => normalize(a) === g)) {
        state.cities[key] = true;
        SFX.chime();
        refresh();
        flickerDoor();
        showSolved();
        const n = solvedCount();
        say(n === 3
          ? `${city.name}. That's all three. Somewhere in the room, something is humming.`
          : `${city.name}. A third of the rectangle flickers to life. ${n} of 3.`);
        if (onSolve) onSolve();
      } else {
        misses++;
        SFX.buzz();
        form.classList.remove("shake");
        void form.offsetWidth;
        form.classList.add("shake");
        msg.textContent = misses >= 3 && city.hint ? `Hint: ${city.hint}` : nope[(misses - 1) % nope.length];
        input.select();
      }
    });
    return form;
  }

  // ─── Object 01 · The television ──────────────────────────
  function openTV() {
    openWindow("The television", (body) => {
      const TARGET = 64;
      let on = state.cities.tv, ch = state.cities.tv ? 3 : 1, tune = state.cities.tv ? TARGET : 14, locked = false;
      body.appendChild(el(`
        <div class="tv">
          <div class="tv-screen">
            <div class="tv-layer tv-art">${artFor("tv")}</div>
            <div class="tv-layer tv-ident">
              <span class="oval">75</span>
              <span class="ident-name">THE1975</span>
              <span class="ident-sub">Consumption · please stand by</span>
            </div>
            <canvas class="tv-layer tv-static" width="120" height="90"></canvas>
            <div class="tv-layer tv-scan"></div>
            <p class="tv-osd"></p>
          </div>
          <div class="tv-panel">
            <span class="tv-brand">ColorTrak</span>
            <button type="button" class="tv-btn" data-act="power">Power</button>
            <button type="button" class="tv-btn" data-act="ch">Channel</button>
          </div>
          <label class="tv-tune"><span>Fine tune</span>
            <input type="range" min="0" max="100" value="${tune}" aria-label="Fine tune">
          </label>
        </div>`));
      body.appendChild(el(`<p class="window-text">An old set, still warm. Someone sat here watching before climbing inside the house.</p>`));
      body.appendChild(guessForm("tv"));

      const tv = $(".tv", body), screen = $(".tv-screen", body), osd = $(".tv-osd", body);
      const art = $(".tv-art", body), canvas = $(".tv-static", body), range = $("input[type=range]", body);
      const g = canvas.getContext("2d");
      const img = g.createImageData(canvas.width, canvas.height);
      let raf = 0, last = 0, staticLevel = 1;

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

      function clarity() { return Math.max(0, 1 - Math.abs(tune - TARGET) / 46); }

      function render() {
        tv.classList.toggle("on", on);
        screen.dataset.ch = on ? ch : "off";
        if (!on) { staticLevel = 0; osd.textContent = ""; }
        else if (ch === 1) { staticLevel = 0.6; osd.textContent = "CH 1"; }
        else if (ch === 2) { staticLevel = 0.06; osd.textContent = "CH 2"; }
        else {
          const c = clarity();
          staticLevel = Math.max(0.03, 0.55 * (1 - c) ** 1.4);
          art.style.filter = `blur(${((1 - c) * 9).toFixed(1)}px) contrast(${0.8 + c * 0.25}) saturate(${0.4 + c * 0.6})`;
          art.style.transform = c < 0.85 ? `translateY(${((1 - c) * 18 * Math.sin(Date.now() / 90)).toFixed(1)}px) scale(1.05)` : "scale(1.02)";
          const pct = Math.round(c * 100);
          osd.textContent = c > 0.9 ? "CH 3 · SIGNAL LOCKED" : `CH 3 · SIGNAL ${pct}%`;
          if (c > 0.9 && !locked) {
            locked = true;
            if (!state.cities.tv) say("The picture settles. You know this place.");
          }
        }
        canvas.style.opacity = staticLevel;
        SFX.setStatic(staticLevel);
      }

      body.addEventListener("click", (e) => {
        const b = e.target.closest("[data-act]");
        if (!b) return;
        if (b.dataset.act === "power") {
          on = !on;
          on ? SFX.tvOn() : SFX.thunk();
          if (on && ch === 1) say("Snow. Try another channel.");
        } else if (on) {
          SFX.click();
          ch = ch % 3 + 1;
          if (ch === 2) say("A station ident. Somebody's idea of a joke.");
          if (ch === 3 && clarity() < 0.9) say("Something's there behind the snow. Try the fine tune dial.");
        }
        render();
      });
      range.addEventListener("input", () => {
        tune = +range.value;
        if (on && ch === 3) { if (tune % 4 === 0) SFX.tick(); render(); }
      });

      raf = requestAnimationFrame(drawStatic);
      const wobble = setInterval(() => { if (on && ch === 3 && clarity() < 0.85) render(); }, 120);
      render();
      if (!state.cities.tv) say("A stack of old televisions. The wood-grain one at the bottom is still plugged in.");
      return () => { cancelAnimationFrame(raf); clearInterval(wobble); SFX.setStatic(0); };
    });
  }

  // ─── Object 02 · The framed photograph ───────────────────
  function openPhoto() {
    openWindow("The photograph", (body) => {
      const city = CFG.cities.photo;
      const crop = cropFor("photo");
      const full = [0, 0, 600, 400];
      let rot = state.cities.photo || state.photoRead ? 0 : 90, flipped = false, wide = state.cities.photo;
      const note = (city.backNote || []).map((l) => l ? `<span>${l}</span>` : "<br>").join("");
      body.appendChild(el(`
        <div class="photo-stage">
          <div class="photo-card">
            <div class="photo-face photo-front">
              <div class="photo-img">${artFor("photo")}</div>
              <span class="photo-box" aria-hidden="true"></span>
            </div>
            <div class="photo-face photo-back"><p class="handwriting">${note}</p></div>
          </div>
        </div>`));
      body.appendChild(el(`
        <div class="controls">
          <button type="button" class="btn btn-ghost" data-act="rotate">Rotate ↻</button>
          <button type="button" class="btn btn-ghost" data-act="flip">Turn over</button>
        </div>`));
      body.appendChild(el(`<p class="window-text">Black and white, hung crooked. Whatever it shows is hiding behind that white rectangle.</p>`));
      body.appendChild(guessForm("photo"));

      const card = $(".photo-card", body);
      const svg = $(".photo-img svg", body);
      svg.setAttribute("viewBox", (wide ? full : crop).join(" "));
      let anim = 0;

      function zoomOut() {
        wide = true;
        const t0 = performance.now(), dur = 1600;
        const step = (t) => {
          const k = Math.min(1, (t - t0) / dur), e = 1 - (1 - k) ** 3;
          svg.setAttribute("viewBox", crop.map((v, i) => v + (full[i] - v) * e).join(" "));
          if (k < 1) anim = requestAnimationFrame(step);
        };
        anim = requestAnimationFrame(step);
        SFX.swell();
        say("You step back from the frame. Now you can see the whole picture.");
      }

      function render() {
        card.style.transform = `rotate(${rot}deg) rotateY(${flipped ? 180 : 0}deg)`;
        if (!wide && state.photoRead && !flipped && rot % 360 === 0) setTimeout(zoomOut, 700);
      }

      body.addEventListener("click", (e) => {
        const b = e.target.closest("[data-act]");
        if (!b) return;
        SFX.paper();
        if (b.dataset.act === "rotate") {
          rot += 90;
          if (rot % 360 === 0 && !state.photoRead) say("Upright now. Still only a sliver of something white and curved.");
        } else {
          flipped = !flipped;
          if (flipped) {
            say("There's handwriting on the back.");
            if (!state.photoRead) { state.photoRead = true; save(); }
          } else if (rot % 360 !== 0) {
            say("It's still on its side.");
          }
        }
        render();
      });
      render();
      if (!state.cities.photo) say("You lift the photograph off its nail. It's sideways.");
      return () => cancelAnimationFrame(anim);
    });
  }

  // ─── Object 04 · The rabbit hat ──────────────────────────
  function openHat() {
    openWindow("The rabbit hat", (body) => {
      const digits = CFG.code.split("").map((d) => `<b>${d}</b>`).join("");
      body.appendChild(el(`
        <div class="hat-stage ${state.code ? "lifted" : ""}">
          <div class="note">
            <p class="note-code">${digits}</p>
            <p class="handwriting"><span>for the drawer.</span><span>and for the box.</span></p>
          </div>
          <svg class="hat-big" viewBox="0 0 260 240" aria-hidden="true">
            <path d="M74 140 Q30 40 70 6 Q110 40 104 138Z" fill="#ece7df"/>
            <path d="M78 130 Q56 56 72 24 Q92 56 94 128Z" fill="#d9aaa4"/>
            <path d="M152 138 Q166 30 222 10 Q236 66 186 144Z" fill="#ece7df"/>
            <path d="M160 130 Q174 50 214 26 Q222 70 180 134Z" fill="#d9aaa4"/>
            <path d="M24 226 Q24 128 130 122 Q236 128 236 226Z" fill="#ece7df"/>
            <path d="M36 186 Q130 168 224 186 M30 206 Q130 190 230 206" stroke="#d6cfc4" stroke-width="5" fill="none"/>
            <rect x="14" y="212" width="232" height="24" rx="12" fill="#ddd6ca"/>
          </svg>
        </div>`));
      body.appendChild(el(`<div class="controls"><button type="button" class="btn btn-ghost" data-act="lift">${state.code ? "Put it back" : "Lift the hat"}</button></div>`));
      body.appendChild(el(`<p class="window-text">The one from <em>Sincerity Is Scary</em>. It's sitting a little too neatly, as if something's underneath.</p>`));
      const stage = $(".hat-stage", body), btn = $("[data-act=lift]", body);
      btn.addEventListener("click", () => {
        const lifted = stage.classList.toggle("lifted");
        btn.textContent = lifted ? "Put it back" : "Lift the hat";
        SFX.paper();
        if (lifted && !state.code) {
          state.code = true;
          refresh();
          setTimeout(SFX.unlock, 500);
          say(`A folded note: ${CFG.code.split("").join(", ")}. You copy it into your notes.`);
        }
      });
    });
  }

  // ─── Object 03 · The desk drawer ─────────────────────────
  function openDrawer() {
    openWindow("The cabinet drawer", (body) => {
      if (state.drawerOpen) { buildPuzzle(body); return; }
      const wheels = [0, 0, 0, 0];
      body.appendChild(el(`
        <div class="lock">
          ${wheels.map((_, i) => `
            <div class="wheel" data-i="${i}">
              <button type="button" class="wheel-btn" data-d="1" aria-label="Digit ${i + 1} up">▲</button>
              <span class="wheel-digit" aria-live="polite">0</span>
              <button type="button" class="wheel-btn" data-d="-1" aria-label="Digit ${i + 1} down">▼</button>
            </div>`).join("")}
        </div>`));
      body.appendChild(el(`<p class="window-text">Locked. A brass combination lock with four wheels. ${state.code ? "You've seen four digits somewhere." : "The combination must be somewhere in this room."}</p>`));
      const lock = $(".lock", body);
      lock.addEventListener("click", (e) => {
        const b = e.target.closest(".wheel-btn");
        if (!b) return;
        const w = b.closest(".wheel"), i = +w.dataset.i;
        wheels[i] = (wheels[i] + +b.dataset.d + 10) % 10;
        $(".wheel-digit", w).textContent = wheels[i];
        SFX.tick();
        if (wheels.join("") === CFG.code) {
          lock.classList.add("open");
          SFX.unlock();
          state.drawerOpen = true;
          refresh();
          setTimeout(() => {
            SFX.drawer();
            say("Click. The drawer slides open. Inside: three torn pieces of a photograph.");
            body.innerHTML = "";
            buildPuzzle(body);
          }, 700);
        }
      });
      say(state.code ? "A four-digit lock. You have four digits." : "The drawer won't budge.");
    });
  }

  function buildPuzzle(body) {
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

    body.appendChild(el(`
      <div class="puzzle">
        <div class="puzzle-board">
          <div class="puzzle-outline" aria-hidden="true"></div>
          ${shapes.map((s, i) => `
            <div class="piece" data-i="${i}" tabindex="0" role="button" aria-label="Photo fragment ${i + 1}. Drag into place, or press Enter."
              style="clip-path: polygon(${s.map(pt).join(",")})">${artFor("drawer")}</div>`).join("")}
        </div>
      </div>`));
    const text = el(`<p class="window-text">Drag the fragments together.</p>`);
    body.appendChild(text);
    const formSlot = el(`<div></div>`);
    body.appendChild(formSlot);

    const board = $(".puzzle-board", body);
    const pieces = $$(".piece", body);
    const pos = pieces.map((_, i) => state.pieces[i] ? { x: 0, y: 0, r: 0 } : { ...start[i] });
    let z = 2;

    const place = (p, i) => { p.style.transform = `translate(${pos[i].x}%, ${pos[i].y}%) rotate(${pos[i].r}deg)`; };
    pieces.forEach((p, i) => { place(p, i); p.classList.toggle("placed", state.pieces[i]); });

    function snap(p, i) {
      pos[i] = { x: 0, y: 0, r: 0 };
      state.pieces[i] = true;
      p.classList.add("placed");
      place(p, i);
      SFX.thunk();
      save();
      checkDone();
    }

    function checkDone(initial) {
      if (!state.pieces.every(Boolean)) return;
      board.classList.add("complete");
      text.textContent = state.cities.drawer ? "Taped back together." : "A bridge at dusk, lit up over a river.";
      if (!formSlot.firstChild) formSlot.appendChild(guessForm("drawer"));
      if (!initial && !state.cities.drawer) say("The pieces fit. A bridge at dusk, lit up over a river.");
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
        SFX.paper();
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
        if (Math.abs(pos[i].x) < 7 && Math.abs(pos[i].y) < 7) snap(p, i);
        else SFX.tap();
      };
      p.addEventListener("pointerup", drop);
      p.addEventListener("pointercancel", drop);
      p.addEventListener("keydown", (e) => {
        if ((e.key === "Enter" || e.key === " ") && !state.pieces[i]) { e.preventDefault(); snap(p, i); }
      });
    });
    checkDone(true);
  }

  // ─── Object 05 · The rectangle ───────────────────────────
  function openDoor() {
    const n = solvedCount();
    if (state.door) { showReveal(); return; }
    openWindow("The rectangle", (body) => {
      const lights = CITY_KEYS.map((k) => `<li class="${state.cities[k] ? "on" : ""}"><i></i>${state.cities[k] ? CFG.cities[k].name : CFG.cities[k].label}</li>`).join("");
      body.appendChild(el(`<ul class="door-status">${lights}</ul>`));
      if (n < 3) {
        body.appendChild(el(`<p class="window-text">A rectangle of nothing, hanging in the dark. The outline is cold. ${n ? `${n} of 3 places found, and the light has crept that far around the frame.` : "There's a dead keypad on the wall below it."}</p>`));
        say(n ? "The rectangle is still waiting on the rest of the places." : "Dark. Something needs to power this.");
        return;
      }
      let entry = "";
      body.appendChild(el(`
        <div class="keypad">
          <p class="keypad-display" aria-live="polite">_ _ _ _</p>
          <div class="keypad-keys">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button type="button" data-k="${d}">${d}</button>`).join("")}
            <button type="button" data-k="clear" aria-label="Clear">C</button>
            <button type="button" data-k="0">0</button>
            <button type="button" data-k="enter" aria-label="Enter">↵</button>
          </div>
        </div>`));
      body.appendChild(el(`<p class="window-text">The outline hums. The keypad below it has woken up and wants four digits.</p>`));
      const display = $(".keypad-display", body), pad = $(".keypad", body);
      const show = () => { display.textContent = entry.padEnd(4, "_").split("").join(" "); };
      function submit() {
        if (entry === CFG.code) {
          SFX.unlock();
          pad.classList.add("ok");
          setTimeout(powerUp, 500);
        } else {
          SFX.buzz();
          pad.classList.remove("shake");
          void pad.offsetWidth;
          pad.classList.add("shake");
          say(state.code ? "Wrong. You've seen the right four digits before." : "Wrong. Four digits are hiding somewhere in this room.");
          entry = "";
          show();
        }
      }
      pad.addEventListener("click", (e) => {
        const k = e.target.closest("[data-k]");
        if (!k) return;
        SFX.click();
        const v = k.dataset.k;
        if (v === "clear") entry = "";
        else if (v === "enter") { submit(); return; }
        else if (entry.length < 4) entry += v;
        show();
        if (entry.length === 4) setTimeout(submit, 180);
      });
      say("The rectangle is humming. It wants a code.");
    });
  }

  function powerUp() {
    closeWindow();
    state.door = true;
    save();
    SFX.hum();
    say("The power comes back.");
    scene.classList.add("powering");
    flickerDoor();
    setTimeout(() => { renderScene(); }, 900);
    setTimeout(showReveal, 3200);
  }

  // ─── Reveal ──────────────────────────────────────────────
  function showReveal() {
    const reveal = $("#reveal");
    $("#reveal-cities").innerHTML = CITY_KEYS.map((k) => `<span>${CFG.cities[k].name}</span>`).join("");
    const link = $("#signup-link");
    link.href = CFG.signupUrl;
    link.textContent = `${CFG.signupLabel} ↗`;
    $("#game").classList.add("fading");
    setTimeout(() => {
      reveal.hidden = false;
      requestAnimationFrame(() => reveal.classList.add("show"));
      SFX.swell();
    }, 700);
  }

  // ─── Secrets ─────────────────────────────────────────────
  function openClock() {
    SFX.tick();
    const isNew = findSecret("clock");
    say(isNew
      ? "Secret found. The clock only has four numbers on its face: 1, 9, 7, 5. Its hands haven't moved in years."
      : "1, 9, 7, 5. The clock still isn't moving.");
  }

  function openSign() {
    SFX.paper();
    const isNew = findSecret("sign");
    say(isNew ? "Secret found. La poésie est dans la rue: poetry is in the street." : "Poetry is in the street.");
  }

  function toggleLamp() {
    state.lampOff = !state.lampOff;
    SFX.click();
    const isNew = findSecret("lamp");
    refresh();
    say(isNew
      ? "Secret found. With the lamp off, the rectangle looks brighter. Funny how that works."
      : state.lampOff ? "Click. Darker." : "Click. Warm again.");
  }

  // ─── Hints ───────────────────────────────────────────────
  const hints = [
    [() => !state.cities.tv, "tv", "One of those old televisions still works. Turn it on and flick through the channels."],
    [() => !state.cities.photo, "photo", "That photograph is hanging crooked. Take it down, turn it the right way up, and read the back."],
    [() => !state.code, "hat", "The rabbit-ear hat on the cabinet is sitting a little too neatly."],
    [() => !state.drawerOpen, "drawer", "You have a four-digit code. The cabinet drawer has a four-digit lock."],
    [() => !state.cities.drawer, "drawer", "Put the torn photograph in the drawer back together."],
    [() => !state.door, "door", "Every place is found. The rectangle is waiting."],
  ];

  $("#hint-btn").addEventListener("click", () => {
    SFX.tap();
    const h = hints.find(([test]) => test());
    if (!h) { say("Nothing left to find. Except maybe a secret or two."); return; }
    say(h[2]);
    const spot = $(`[data-obj="${h[1]}"]`, scene);
    spot.classList.remove("pulse");
    void spot.getBoundingClientRect();
    spot.classList.add("pulse");
    revealSpot(spot);
  });

  // On small screens, pan so the hinted object is in view.
  function revealSpot(spot) {
    const scroller = $("#scene-scroll");
    if (scroller.scrollWidth <= scroller.clientWidth) return;
    const box = spot.getBBox();
    const cx = ((box.x + box.width / 2) / 1600) * scroller.scrollWidth;
    scroller.scrollTo({ left: cx - scroller.clientWidth / 2, behavior: "smooth" });
  }

  // ─── Wiring ──────────────────────────────────────────────
  const handlers = { tv: openTV, photo: openPhoto, hat: openHat, drawer: openDrawer, door: openDoor, clock: openClock, sign: openSign, lamp: toggleLamp };

  $$(".hotspot", scene).forEach((spot) => {
    const go = () => { SFX.init(); SFX.tap(); handlers[spot.dataset.obj](); };
    spot.addEventListener("click", go);
    spot.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
    });
  });

  const scroller = $("#scene-scroll");
  $("#pan-left").addEventListener("click", () => scroller.scrollBy({ left: -scroller.clientWidth / 2, behavior: "smooth" }));
  $("#pan-right").addEventListener("click", () => scroller.scrollBy({ left: scroller.clientWidth / 2, behavior: "smooth" }));

  // Phones: trim the empty black above and below the set so the room is taller.
  const narrow = window.matchMedia("(max-width: 760px)");
  const fitScene = () => scene.setAttribute("viewBox", narrow.matches ? "0 80 1600 770" : "0 0 1600 900");
  fitScene();
  narrow.addEventListener("change", fitScene);
  const panState = () => {
    const max = scroller.scrollWidth - scroller.clientWidth;
    $("#pan-left").hidden = scroller.scrollLeft < 8;
    $("#pan-right").hidden = scroller.scrollLeft > max - 8;
  };
  scroller.addEventListener("scroll", panState, { passive: true });
  window.addEventListener("resize", panState);

  const soundBtn = $("#sound-btn");
  function renderSound() {
    soundBtn.textContent = state.muted ? "Sound off" : "Sound on";
    soundBtn.setAttribute("aria-pressed", String(!state.muted));
    SFX.setMuted(state.muted);
  }
  soundBtn.addEventListener("click", () => {
    SFX.init();
    state.muted = !state.muted;
    renderSound();
    save();
  });

  function reset() {
    const muted = state.muted;
    state = fresh();
    state.muted = muted;
    try { localStorage.removeItem(CFG.storageKey); } catch (e) {}
    save();
    location.reload();
  }
  $("#reset-btn").addEventListener("click", () => {
    if (confirm("Start again from the beginning? Your progress will be cleared.")) reset();
  });
  $("#again-btn").addEventListener("click", reset);

  $("#enter-btn").addEventListener("click", () => {
    SFX.init();
    renderSound();
    SFX.thunk();
    const intro = $("#intro");
    intro.classList.add("leaving");
    setTimeout(() => {
      intro.hidden = true;
      $("#game").hidden = false;
      requestAnimationFrame(() => $("#game").classList.add("show"));
      if (scroller.scrollWidth > scroller.clientWidth) scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) / 2;
      panState();
      const started = solvedCount() || state.code || state.secrets.length;
      if (state.door) say("The rectangle is still glowing.");
      else say(started
        ? `Welcome back. ${solvedCount()} of 3 places found so far.`
        : "You're inside. It's quieter than you expected. Look around and click on anything that catches your eye.");
    }, 650);
  });

  renderSound();
  renderScene();
  renderTracker();
})();
