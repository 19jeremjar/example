/* HOUSE OF SECRETS — landmark illustrations
 * Each one draws into a 600 × 400 viewBox. `crop` is the photograph's
 * starting close-up, in the same units.
 */
window.LANDMARKS = (() => {
  "use strict";

  const svg = (body) =>
    `<svg class="landmark" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${body}</svg>`;

  // ─── Flinders Street Station, Melbourne ──────────────────
  function flinders() {
    let windows = "";
    for (let x = 58; x < 230; x += 34) windows += arch(x, 236, 18, 30);
    for (let x = 372; x < 496; x += 34) windows += arch(x, 236, 18, 30);
    for (let x = 58; x < 230; x += 34) windows += `<rect x="${x}" y="290" width="18" height="22" fill="#5a3121"/>`;
    for (let x = 372; x < 496; x += 34) windows += `<rect x="${x}" y="290" width="18" height="22" fill="#5a3121"/>`;
    const clocks = [270, 300, 330].map((cx) =>
      `<circle cx="${cx}" cy="212" r="9" fill="#f3ead2" stroke="#2b2118" stroke-width="2"/>` +
      `<path d="M${cx} 212 V205 M${cx} 212 H${cx + 5}" stroke="#2b2118" stroke-width="1.6"/>`).join("");
    return svg(`
      <defs>
        <linearGradient id="fl-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#6f9bbd"/><stop offset="1" stop-color="#ead8b0"/>
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill="url(#fl-sky)"/>
      <path d="M0 210 L40 196 L40 170 L70 170 L70 205 L590 205 L600 200 V330 H0Z" fill="#9aa7ad" opacity=".35"/>
      <rect x="30" y="200" width="540" height="130" fill="#d79f48"/>
      <rect x="30" y="200" width="540" height="10" fill="#b0532e"/>
      <rect x="30" y="268" width="540" height="7" fill="#b0532e"/>
      ${windows}
      <rect x="236" y="150" width="128" height="180" fill="#dcaa56"/>
      <rect x="236" y="150" width="128" height="8" fill="#b0532e"/>
      <path d="M258 330 V262 Q300 222 342 262 V330Z" fill="#3a2418"/>
      ${clocks}
      <rect x="244" y="132" width="112" height="22" fill="#c98f3e"/>
      <path d="M244 134 Q244 60 300 52 Q356 60 356 134Z" fill="#6f907b"/>
      <path d="M262 132 Q264 78 300 64" stroke="#8fae98" stroke-width="4" fill="none"/>
      <rect x="292" y="36" width="16" height="20" fill="#c98f3e"/>
      <path d="M292 36 L300 18 L308 36Z" fill="#6f907b"/>
      <rect x="500" y="104" width="54" height="226" fill="#d79f48"/>
      <rect x="500" y="104" width="54" height="7" fill="#b0532e"/>
      <path d="M496 106 L527 64 L558 106Z" fill="#6f907b"/>
      <circle cx="527" cy="148" r="15" fill="#f3ead2" stroke="#2b2118" stroke-width="2.5"/>
      <path d="M527 148 V138 M527 148 H535" stroke="#2b2118" stroke-width="2"/>
      ${arch(518, 190, 18, 34)}
      <rect x="0" y="330" width="600" height="70" fill="#3b3733"/>
      <path d="M0 362 H600 M0 372 H600" stroke="#7b746c" stroke-width="2"/>
      <path d="M0 336 H600" stroke="#55504a" stroke-width="3"/>
      <g transform="translate(60 318)">
        <rect width="150" height="44" rx="6" fill="#4f8a3f"/>
        <rect y="26" width="150" height="10" fill="#e3c34a"/>
        <rect x="10" y="6" width="22" height="16" fill="#cfe1e6"/><rect x="40" y="6" width="22" height="16" fill="#cfe1e6"/>
        <rect x="70" y="6" width="22" height="16" fill="#cfe1e6"/><rect x="100" y="6" width="22" height="16" fill="#cfe1e6"/>
        <path d="M75 0 L95 -26 M95 -26 H70" stroke="#2b2b2b" stroke-width="2"/>
      </g>
      <path d="M0 304 H600" stroke="#2b2b2b" stroke-width="1" opacity=".4"/>`);
  }

  function arch(x, y, w, h) {
    const r = w / 2;
    return `<path d="M${x} ${y + h} V${y + r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h}Z" fill="#5a3121"/>`;
  }

  // ─── Sydney Opera House ──────────────────────────────────
  function opera() {
    const shells = [
      // rear group
      "M330 262 Q338 160 424 116 Q410 196 444 262Z",
      "M300 262 Q300 182 372 148 Q364 212 392 262Z",
      "M262 262 Q264 212 316 190 Q310 232 332 262Z",
      // front group
      "M452 262 Q458 182 534 150 Q522 212 552 262Z",
      "M422 262 Q428 206 482 186 Q476 232 496 262Z",
      "M520 262 Q530 226 572 210 Q566 242 582 262Z",
    ];
    const ribs = shells.map((d) => `<path d="${d}" fill="#f4f2ec" stroke="#cfccc5" stroke-width="1.2"/>`).join("");
    const shade = [
      "M330 262 Q338 160 424 116 Q376 172 368 262Z",
      "M300 262 Q300 182 372 148 Q332 196 330 262Z",
      "M452 262 Q458 182 534 150 Q490 196 486 262Z",
    ].map((d) => `<path d="${d}" fill="#d8d5ce"/>`).join("");
    let lines = "";
    for (let i = 0; i < 9; i++) lines += `<path d="M${334 + i * 10} 262 Q${352 + i * 6} ${200 - i * 6} ${424 - i * 2} ${118 + i * 3}" stroke="#e2dfd8" stroke-width="1" fill="none"/>`;
    return svg(`
      <defs>
        <linearGradient id="op-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#9fb8cc"/><stop offset="1" stop-color="#eee9df"/>
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill="url(#op-sky)"/>
      <path d="M0 252 Q60 238 120 246 Q180 236 250 250 V270 H0Z" fill="#7d8e83" opacity=".7"/>
      <path d="M8 246 Q118 112 228 246" stroke="#8b979e" stroke-width="7" fill="none"/>
      <path d="M8 246 Q118 132 228 246" stroke="#8b979e" stroke-width="2" fill="none"/>
      <path d="M0 232 H244" stroke="#8b979e" stroke-width="4"/>
      <rect x="14" y="210" width="16" height="42" fill="#a3a49b"/><rect x="206" y="210" width="16" height="42" fill="#a3a49b"/>
      <rect x="0" y="272" width="600" height="128" fill="#6f8794"/>
      <polygon points="196,286 596,286 586,260 214,260" fill="#c4ae8f"/>
      <rect x="196" y="286" width="400" height="12" fill="#a8916f"/>
      ${ribs}${shade}${lines}
      <path d="M332 262 L350 236 L368 262Z M454 262 L470 238 L488 262Z" fill="#5f6a70"/>
      <path d="M0 320 Q30 316 60 320 T120 320 T180 320 T240 320 T300 320 T360 320 T420 320 T480 320 T540 320 T600 320" stroke="#93a8b3" stroke-width="2" fill="none"/>
      <path d="M0 350 Q30 346 60 350 T120 350 T180 350 T240 350 T300 350 T360 350 T420 350 T480 350 T540 350 T600 350" stroke="#93a8b3" stroke-width="2" fill="none" opacity=".7"/>
      <path d="M60 300 L120 292 L130 300Z" fill="#f2efe8"/><path d="M98 300 V270 L118 296Z" fill="#f2efe8"/>`);
  }

  // ─── Story Bridge, Brisbane ──────────────────────────────
  function story() {
    const deck = 252;
    const top = (x) => {
      // Cantilever profile: rises to a peak over each pier, dips to mid-span.
      const pts = [[20, deck], [196, 118], [300, 214], [404, 118], [580, deck]];
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        if (x >= x0 && x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
      }
      return deck;
    };
    let truss = "";
    for (let x = 20, i = 0; x < 580; x += 16, i++) {
      const y = top(x), nx = x + 16, ny = top(nx);
      truss += `<path d="M${x} ${y} V${deck}" />`;
      truss += i % 2 ? `<path d="M${x} ${y} L${nx} ${deck}"/>` : `<path d="M${x} ${deck} L${nx} ${ny}"/>`;
    }
    let lights = "";
    for (let x = 28; x < 580; x += 22) lights += `<circle cx="${x}" cy="${deck + 4}" r="2.2" fill="#ffe7a8"/>`;
    let skyline = "";
    const blocks = [[0, 150], [40, 120], [70, 168], [110, 96], [150, 140], [190, 110], [430, 130], [470, 84], [505, 150], [540, 112], [575, 140]];
    blocks.forEach(([x, h]) => {
      skyline += `<rect x="${x}" y="${250 - h}" width="34" height="${h}" fill="#3a3550"/>`;
      for (let wy = 260 - h; wy < 240; wy += 14) skyline += `<rect x="${x + 6}" y="${wy}" width="5" height="6" fill="#f3cf86" opacity=".55"/><rect x="${x + 20}" y="${wy}" width="5" height="6" fill="#f3cf86" opacity=".35"/>`;
    });
    return svg(`
      <defs>
        <linearGradient id="sb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2d2a4f"/><stop offset=".55" stop-color="#b0607a"/><stop offset="1" stop-color="#f2a25e"/>
        </linearGradient>
        <linearGradient id="sb-river" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#5a4a68"/><stop offset="1" stop-color="#1f2033"/>
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill="url(#sb-sky)"/>
      ${skyline}
      <rect x="0" y="270" width="600" height="130" fill="url(#sb-river)"/>
      <path d="M0 268 Q120 262 240 270 T600 266 V282 H0Z" fill="#2b2a3d"/>
      <g stroke="#1d2a3a" stroke-width="3" fill="none" stroke-linejoin="round">
        <path d="M20 ${deck} L196 118 L300 214 L404 118 L580 ${deck}" stroke-width="6"/>
        <g stroke-width="2.4">${truss}</g>
        <path d="M0 ${deck} H600" stroke-width="7"/>
      </g>
      <rect x="186" y="${deck}" width="20" height="40" fill="#25303d"/>
      <rect x="394" y="${deck}" width="20" height="40" fill="#25303d"/>
      <rect x="178" y="288" width="36" height="10" fill="#1b2230"/><rect x="386" y="288" width="36" height="10" fill="#1b2230"/>
      ${lights}
      <g opacity=".35">${lights.replace(/cy="(\d+)/g, (m, y) => `cy="${2 * 270 - +y + 30}`)}</g>
      <path d="M0 330 H600 M40 350 H560 M90 372 H520" stroke="#f2a25e" stroke-width="1.5" opacity=".25"/>`);
  }

  return {
    flinders: { draw: flinders, crop: [210, 40, 180, 120] },
    opera: { draw: opera, crop: [372, 112, 108, 72] },
    story: { draw: story, crop: [150, 100, 300, 200] },
  };
})();
