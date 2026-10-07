/* Secret Sounds Discovery Crate
   One shuffle, one record, one discovery. Records live in records.json. */
(() => {
  "use strict";

  const CRATE_SIZE = 7;
  const PLAYED_KEY = "ssdc-played";
  const CITIES = ["brisbane", "melbourne", "sydney"];

  const $ = (id) => document.getElementById(id);
  const els = {
    deck: $("deck"),
    crate: $("crate-sleeves"),
    turntable: $("turntable"),
    record: $("record"),
    label: $("record-label"),
    labelText: $("record-label-text"),
    tonearm: $("tonearm"),
    stand: $("stand"),
    result: $("result"),
    artist: $("r-artist"),
    track: $("r-track"),
    line: $("r-line"),
    spotify: $("r-spotify"),
    tickets: $("r-tickets"),
    ticketsText: $("r-tickets-text"),
    shuffle: $("shuffle"),
    lineupOpen: $("lineup-open"),
    lineup: $("lineup"),
    lineupClose: $("lineup-close"),
    lineupList: $("lineup-list"),
    status: $("status"),
  };

  const params = new URLSearchParams(location.search);
  const city = CITIES.includes((params.get("city") || "").toLowerCase()) ? params.get("city").toLowerCase() : null;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let artists = {};
  let pool = [];
  let current = null;
  let busy = false;
  let pulls = 0;

  /* ---------- Analytics ---------- */

  window.dataLayer = window.dataLayer || [];

  function deviceType() {
    const ua = navigator.userAgent;
    if (/iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "tablet";
    if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
    return "desktop";
  }

  function campaignSource() {
    if (params.get("utm_source")) return params.get("utm_source");
    try {
      const ref = document.referrer && new URL(document.referrer).hostname;
      if (ref && ref !== location.hostname) return ref;
    } catch (e) { /* ignore */ }
    return "direct";
  }

  const context = {
    city: city || "unknown",
    device_type: deviceType(),
    campaign_source: campaignSource(),
    campaign_medium: params.get("utm_medium") || undefined,
    campaign_name: params.get("utm_campaign") || undefined,
  };

  function track(event, record, artistId) {
    const data = { event, ...context };
    const a = artists[record ? record.artist : artistId];
    if (a) data.artist = a.name;
    if (record) {
      data.track = record.track;
      data.record_id = record.id;
    }
    window.dataLayer.push(data);
  }

  /* ---------- Helpers ---------- */

  function random() {
    if (window.crypto && crypto.getRandomValues) {
      return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
    }
    return Math.random();
  }

  function readPlayed() {
    try { return JSON.parse(sessionStorage.getItem(PLAYED_KEY)) || []; } catch (e) { return []; }
  }

  function writePlayed(list) {
    try { sessionStorage.setItem(PLAYED_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function animate(el, keyframes, options) {
    if (!el.animate) return Promise.resolve();
    return el.animate(keyframes, options).finished.catch(() => {});
  }

  function ticketUrl(artist) {
    return (city && artist.tickets[city]) || artist.tickets.default;
  }

  function spotifyUrl(record) {
    if (record.spotifyUrl) return record.spotifyUrl;
    // Fallback until direct track links are added to records.json.
    const q = `${artists[record.artist].name} ${record.track.replace(/\s*\(feat\..*\)$/i, "")}`;
    return `https://open.spotify.com/search/${encodeURIComponent(q)}`;
  }

  function initials(name) {
    return name.replace(/^the\s+/i, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 3);
  }

  function makeSleeve(record, variant) {
    const el = document.createElement("div");
    el.className = `sleeve sleeve--${variant}`;
    applySleeve(el, record, variant === "stand");
    return el;
  }

  function applySleeve(el, record, withMeta) {
    el.style.setProperty("--bg", record.sleeve.bg);
    el.style.setProperty("--fg", record.sleeve.fg);
    el.dataset.pattern = record.sleeve.pattern;
    el.textContent = "";
    if (record.image) {
      const img = document.createElement("img");
      img.src = record.image;
      img.alt = "";
      el.append(img);
    } else {
      const art = document.createElement("span");
      art.className = "sleeve-art";
      el.append(art);
    }
    if (withMeta) {
      const meta = document.createElement("span");
      meta.className = "sleeve-meta";
      const a = document.createElement("span");
      a.className = "sleeve-artist";
      a.textContent = artists[record.artist].name;
      const t = document.createElement("span");
      t.className = "sleeve-track";
      t.textContent = record.track;
      meta.append(a, t);
      el.append(meta);
    }
  }

  function randomRecord() {
    return pool[Math.floor(random() * pool.length)];
  }

  /* ---------- Selection ---------- */

  // Each artist gets its share of the crate (artist.weight), split across that
  // artist's remaining records by record.weight (default 1). Records already
  // pulled this session are skipped until the whole crate has been heard.
  function selectRandomRecord() {
    let played = readPlayed();
    let candidates = pool.filter((r) => !played.includes(r.id));
    if (!candidates.length) {
      played = current ? [current.id] : [];
      candidates = pool.filter((r) => !played.includes(r.id));
      if (!candidates.length) candidates = pool.slice();
    }

    const groupTotals = {};
    candidates.forEach((r) => {
      groupTotals[r.artist] = (groupTotals[r.artist] || 0) + (r.weight ?? 1);
    });
    const weighted = candidates.map((r) => [r, (artists[r.artist].weight * (r.weight ?? 1)) / groupTotals[r.artist]]);
    const total = weighted.reduce((sum, [, w]) => sum + w, 0);

    let x = random() * total;
    let picked = weighted[weighted.length - 1][0];
    for (const [r, w] of weighted) {
      x -= w;
      if (x < 0) { picked = r; break; }
    }

    played.push(picked.id);
    writePlayed(played);
    return picked;
  }

  /* ---------- Rendering ---------- */

  function fillCrate() {
    els.crate.textContent = "";
    for (let i = 0; i < CRATE_SIZE; i++) {
      els.crate.append(makeSleeve(randomRecord(), "crate"));
    }
  }

  function setRecordOnPlatter(record) {
    els.label.style.setProperty("--bg", record.sleeve.bg);
    els.label.style.setProperty("--fg", record.sleeve.fg);
    els.labelText.textContent = initials(artists[record.artist].name);
    els.record.classList.add("is-loaded");
  }

  function setPlaying(on) {
    els.record.classList.toggle("is-spinning", on);
    els.tonearm.classList.toggle("is-on", on);
    els.turntable.classList.toggle("is-playing", on);
  }

  function fillResult(record) {
    const artist = artists[record.artist];
    els.artist.textContent = artist.name;
    els.track.textContent = record.track;
    els.line.textContent = record.line;
    els.spotify.href = spotifyUrl(record);
    els.tickets.href = ticketUrl(artist);
    els.ticketsText.textContent = `☆ ${artist.name.toLowerCase()} tickets`;
  }

  /* ---------- Shuffle ---------- */

  async function shuffle() {
    if (busy || !pool.length) return;
    busy = true;
    els.shuffle.disabled = true;
    track(pulls ? "shuffle_again_clicked" : "shuffle_clicked", current);

    const record = selectRandomRecord();
    const motion = !reducedMotion.matches;
    const oldSleeve = els.stand.querySelector(".sleeve");

    if (motion) {
      setPlaying(false);
      if (oldSleeve) {
        animate(oldSleeve, [{ opacity: 1 }, { opacity: 0, transform: "translateX(30%) rotate(8deg)" }], { duration: 200, easing: "ease-in", fill: "forwards" });
      }
      animate(els.result, [{ opacity: 1 }, { opacity: 0.25 }], { duration: 150, fill: "forwards" });

      // 1. Flick through the crate.
      const sleeves = [...els.crate.children];
      sleeves.forEach((s, i) => {
        const base = getComputedStyle(s).transform;
        const start = base === "none" ? "" : base;
        animate(s, [
          { transform: start },
          { transform: `${start} translateY(-18%) rotate(-10deg)`, offset: 0.45 },
          { transform: start },
        ], { duration: 260, delay: i * 35, easing: "ease-out" });
      });
      await wait(260 + CRATE_SIZE * 35 - 120);
    }

    // 2. Pull one sleeve out and land it on the turntable.
    const from = els.crate.children[3];
    const sleeve = makeSleeve(record, "stand");
    els.stand.textContent = "";
    els.stand.append(sleeve);

    if (motion && from) {
      const a = from.getBoundingClientRect();
      const b = sleeve.getBoundingClientRect();
      const dx = a.left + a.width / 2 - (b.left + b.width / 2);
      const dy = a.top + a.height / 2 - (b.top + b.height / 2);
      const s = a.width / b.width;
      from.style.visibility = "hidden";
      els.deck.classList.add("is-flying");
      await animate(sleeve, [
        { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(-6deg)` },
        { transform: `translate(${dx * 0.5}px, ${dy - 40}px) scale(${(s + 1) / 2}) rotate(-12deg)`, offset: 0.35 },
        { transform: "none" },
      ], { duration: 460, easing: "cubic-bezier(.3,.7,.3,1)" });
      els.deck.classList.remove("is-flying");
      // Refill the gap in the crate.
      applySleeve(from, randomRecord(), false);
      from.style.visibility = "";
      animate(from, [{ transform: `${getComputedStyle(from).transform} translateY(40%)`, opacity: 0 }, { opacity: 1 }], { duration: 250, easing: "ease-out" });
    }

    // 3. Drop the record and spin it.
    setRecordOnPlatter(record);
    if (motion) {
      animate(els.record, [{ transform: "scale(.88)", opacity: 0.4 }, { transform: "scale(1)", opacity: 1 }], { duration: 160, easing: "ease-out" });
      await wait(120);
    }
    setPlaying(motion);

    // 4. Reveal.
    current = record;
    pulls++;
    fillResult(record);
    const first = els.result.hidden;
    els.result.hidden = false;
    els.result.getAnimations?.().forEach((anim) => anim.cancel());
    els.result.classList.remove("is-revealing");
    void els.result.offsetWidth;
    els.result.classList.add("is-revealing");
    els.shuffle.textContent = "shuffle again";
    els.shuffle.classList.replace("btn--pink", "btn--white");
    els.status.textContent = `Now spinning: ${artists[record.artist].name}, ${record.track}.`;
    track("record_revealed", record);

    if (first) els.result.focus({ preventScroll: true });
    revealInView();

    els.shuffle.disabled = false;
    busy = false;
  }

  // Keep the CTAs on screen without jumping the page when they already fit.
  function revealInView() {
    const bottom = els.tickets.getBoundingClientRect().bottom + 16;
    if (bottom > window.innerHeight) {
      window.scrollBy({ top: bottom - window.innerHeight, behavior: reducedMotion.matches ? "auto" : "smooth" });
    }
  }

  /* ---------- Lineup ---------- */

  function buildLineup() {
    els.lineupList.textContent = "";
    Object.values(artists).forEach((artist) => {
      if (city && !artist.cities.includes(city)) return;
      const sample = pool.find((r) => r.artist === artist.id);
      const li = document.createElement("li");
      li.className = "lineup-item";
      if (sample) {
        const sw = makeSleeve(sample, "swatch");
        sw.classList.add("lineup-swatch");
        sw.setAttribute("aria-hidden", "true");
        li.append(sw);
      }
      const text = document.createElement("div");
      text.className = "lineup-text";
      const name = document.createElement("p");
      name.className = "lineup-name";
      name.textContent = artist.name;
      const note = document.createElement("p");
      note.className = "lineup-note";
      note.textContent = artist.note || "";
      text.append(name, note);
      const link = document.createElement("a");
      link.className = "lineup-tickets";
      link.href = ticketUrl(artist);
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "tickets";
      link.setAttribute("aria-label", `${artist.name}: get tickets (opens ticket site)`);
      link.addEventListener("click", () => track("ticket_clicked", null, artist.id));
      li.append(text, link);
      els.lineupList.append(li);
    });
  }

  function openLineup() {
    track("lineup_viewed", current);
    if (typeof els.lineup.showModal === "function") els.lineup.showModal();
    else els.lineup.setAttribute("open", "");
  }

  function closeLineup() {
    if (typeof els.lineup.close === "function") els.lineup.close();
    else els.lineup.removeAttribute("open");
  }

  /* ---------- Boot ---------- */

  els.shuffle.addEventListener("click", shuffle);
  els.spotify.addEventListener("click", () => track("spotify_clicked", current));
  els.tickets.addEventListener("click", () => track("ticket_clicked", current));
  els.lineupOpen.addEventListener("click", openLineup);
  els.lineupClose.addEventListener("click", closeLineup);
  els.lineup.addEventListener("click", (e) => {
    if (e.target === els.lineup) closeLineup();
  });

  fetch("records.json")
    .then((res) => {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    })
    .then((data) => {
      data.artists.forEach((a) => { artists[a.id] = a; });
      pool = data.records.filter((r) => {
        const a = artists[r.artist];
        if (!a) return false;
        const cities = r.cities || a.cities;
        return !city || !cities || cities.includes(city);
      });
      fillCrate();
      buildLineup();
      track("discovery_crate_opened");
    })
    .catch(() => {
      els.shuffle.disabled = true;
      els.status.textContent = "The crate couldn't be loaded. Please refresh to try again.";
    });
})();
