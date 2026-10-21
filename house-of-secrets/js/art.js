/* HOUSE OF SECRETS — clue pictures
 * Each one draws into a 600 × 400 viewBox. `crop` is the photograph's
 * starting close-up, in the same units.
 */
window.ART = (() => {
  "use strict";

  const svg = (body) =>
    `<svg class="art" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${body}</svg>`;

  // ─── The Eiffel Tower at dusk (TV) ───────────────────────
  function paris() {
    let lattice = "";
    for (let y = 120; y < 320; y += 24) {
      const half = 12 + ((y - 60) / 260) ** 1.6 * 120;
      lattice += `<path d="M${300 - half} ${y} L${300 + half} ${y + 24} M${300 + half} ${y} L${300 - half} ${y + 24}"/>`;
    }
    let lights = "";
    for (let x = 0; x < 600; x += 26) lights += `<circle cx="${x + 8}" cy="${348 + (x % 3) * 4}" r="2" fill="#ffe2a0" opacity=".8"/>`;
    return svg(`
      <defs>
        <linearGradient id="pa-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2c2f58"/><stop offset=".6" stop-color="#c0708a"/><stop offset="1" stop-color="#f4b36c"/>
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill="url(#pa-sky)"/>
      <circle cx="470" cy="300" r="34" fill="#ffd9a0" opacity=".7"/>
      <path d="M0 330 L40 318 L80 326 L130 312 L180 324 L230 316 L380 320 L430 310 L480 324 L540 314 L600 322 V400 H0Z" fill="#2a2440"/>
      <g fill="#231c33">
        <path d="M296 40 H304 L306 70 H294Z"/>
        <path d="M290 70 H310 L330 190 H270Z"/>
        <path d="M262 190 H338 L350 214 H250Z"/>
        <path d="M250 214 L190 340 H232 Q300 262 368 340 H410 L350 214Z"/>
        <rect x="240" y="252" width="120" height="10"/>
      </g>
      <g stroke="#4a3d66" stroke-width="1.2" opacity=".6" fill="none">${lattice}</g>
      <rect y="340" width="600" height="60" fill="#1b1628"/>
      ${lights}
      <path d="M0 372 Q150 366 300 372 T600 370" stroke="#f4b36c" stroke-width="2" opacity=".3" fill="none"/>`);
  }

  // ─── A city at night (photograph, shown in black and white) ─
  function city() {
    const towers = [
      [20, 140, 50], [76, 190, 44], [126, 110, 60], [192, 230, 40], [238, 160, 54],
      [298, 280, 46], [350, 200, 58], [414, 250, 42], [462, 150, 56], [524, 210, 50],
    ];
    let b = "";
    towers.forEach(([x, h, w], i) => {
      const y = 330 - h;
      b += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${i % 2 ? "#2e2e33" : "#3a3a40"}"/>`;
      for (let wy = y + 12; wy < 320; wy += 16) {
        for (let wx = x + 6; wx < x + w - 8; wx += 12) {
          if ((wx * 7 + wy * 3 + i) % 5) b += `<rect x="${wx}" y="${wy}" width="5" height="7" fill="#f2e6c4" opacity="${0.4 + ((wx + wy) % 4) * 0.15}"/>`;
        }
      }
    });
    // the tallest tower gets a spire
    b += `<path d="M321 50 V20 M310 50 H332 L321 36Z" stroke="#3a3a40" stroke-width="4" fill="#3a3a40"/>`;
    return svg(`
      <defs>
        <linearGradient id="ci-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#151a2b"/><stop offset="1" stop-color="#5a5f7a"/>
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill="url(#ci-sky)"/>
      <circle cx="96" cy="70" r="22" fill="#eae6da"/>
      ${b}
      <rect y="330" width="600" height="70" fill="#121216"/>
      <path d="M0 348 H600" stroke="#f2e6c4" stroke-width="2" stroke-dasharray="18 14" opacity=".5"/>
      <path d="M0 370 Q300 360 600 372" stroke="#888" stroke-width="1.5" fill="none" opacity=".4"/>`);
  }

  // ─── A bar of chocolate on a table (drawer) ──────────────
  function chocolate() {
    let squares = "";
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 5; c++) {
        squares += `<rect x="${206 + c * 44}" y="${132 + r * 44}" width="38" height="38" rx="4" fill="#5a3121" stroke="#3a1d12" stroke-width="2"/>` +
          `<path d="M${210 + c * 44} ${136 + r * 44} h30" stroke="#7a4a32" stroke-width="3"/>`;
      }
    }
    return svg(`
      <defs>
        <linearGradient id="ch-table" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#c9a77a"/><stop offset="1" stop-color="#8a6a46"/>
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill="url(#ch-table)"/>
      <path d="M0 90 H600 M0 210 H600 M0 330 H600" stroke="#7a5a3a" stroke-width="2" opacity=".35"/>
      <ellipse cx="320" cy="300" rx="220" ry="30" fill="#000" opacity=".18"/>
      <rect x="194" y="120" width="236" height="148" rx="6" fill="#3a1d12"/>
      ${squares}
      <path d="M150 150 L196 118 L196 282 L120 300Z" fill="#d9dde0"/>
      <path d="M150 150 L196 118 L196 282 L120 300Z" fill="none" stroke="#9aa0a5" stroke-width="2"/>
      <path d="M136 210 L190 196 M140 240 L190 232 M128 270 L190 262" stroke="#b5bbc0" stroke-width="3"/>
      <rect x="430" y="118" width="96" height="152" fill="#f3f0e8"/>
      <rect x="446" y="150" width="64" height="88" fill="none" stroke="#141414" stroke-width="4"/>
      <circle cx="90" cy="320" r="20" fill="#5a3121"/><circle cx="520" cy="330" r="12" fill="#5a3121"/>`);
  }

  return {
    paris: { draw: paris, crop: [150, 60, 300, 200] },
    city: { draw: city, crop: [278, 20, 96, 64] },
    chocolate: { draw: chocolate, crop: [150, 100, 300, 200] },
  };
})();
