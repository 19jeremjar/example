import { BAND_STOPS } from "../config/palette";
import { mulberry32 } from "./random";

/**
 * Procedurally drawn stand-ins for fan photos: stage lights, phone torches, confetti and
 * golden-hour stadium shots. Deterministic per seed, drawn locally, so the demo needs no
 * network and raises no licensing or privacy questions.
 */
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function drawSamplePhoto(ctx: Ctx2D, size: number, seed: number) {
  const rand = mulberry32(seed);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
  const scene = Math.floor(rand() * 5);
  const accent = pick(BAND_STOPS);
  const accent2 = pick(BAND_STOPS);
  const s = size;

  ctx.save();
  // Background.
  const bg = ctx.createLinearGradient(0, 0, 0, s);
  if (scene === 3) {
    bg.addColorStop(0, pick(["#f6a46b", "#f28aa8", "#f7c86a"]));
    bg.addColorStop(0.6, pick(["#e2557b", "#d9693a", "#8a4fa0"]));
    bg.addColorStop(1, "#2a1730");
  } else if (scene === 2) {
    bg.addColorStop(0, accent);
    bg.addColorStop(1, "#1a0f1c");
  } else {
    bg.addColorStop(0, "#07070c");
    bg.addColorStop(1, rand() > 0.5 ? "#1b1024" : "#0b1a22");
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, s, s);

  ctx.globalCompositeOperation = "lighter";
  if (scene === 0 || scene === 4) {
    // Stage light beams fanning down from the rig.
    const beams = 3 + Math.floor(rand() * 4);
    for (let i = 0; i < beams; i++) {
      const x = s * (0.1 + 0.8 * rand());
      const spread = s * (0.12 + rand() * 0.25);
      const tilt = (rand() - 0.5) * s * 0.8;
      const g = ctx.createLinearGradient(x, 0, x + tilt, s);
      const c = i % 2 ? accent : accent2;
      g.addColorStop(0, c);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.45 + rand() * 0.3;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.01, -2);
      ctx.lineTo(x + s * 0.01, -2);
      ctx.lineTo(x + tilt + spread, s);
      ctx.lineTo(x + tilt - spread, s);
      ctx.closePath();
      ctx.fill();
    }
    if (scene === 4) {
      // Spotlit performer.
      ctx.globalAlpha = 0.9;
      const spot = ctx.createRadialGradient(s * 0.5, s * 0.55, 0, s * 0.5, s * 0.55, s * 0.32);
      spot.addColorStop(0, "rgba(255,244,220,0.95)");
      spot.addColorStop(1, "rgba(255,244,220,0)");
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, s, s);
    }
  }
  if (scene === 1 || scene === 2 || scene === 0) {
    // Bokeh: phone torches and fairy lights.
    const dots = scene === 1 ? 70 : 24;
    for (let i = 0; i < dots; i++) {
      const r = s * (0.008 + rand() * (scene === 1 ? 0.035 : 0.05));
      const x = rand() * s;
      const y = s * (0.15 + rand() * 0.65);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const warm = scene === 1 ? "255,240,210" : rand() > 0.5 ? "255,255,255" : "255,220,170";
      g.addColorStop(0, `rgba(${warm},0.95)`);
      g.addColorStop(1, `rgba(${warm},0)`);
      ctx.globalAlpha = 0.5 + rand() * 0.5;
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;

  if (scene === 2) {
    // Confetti.
    for (let i = 0; i < 90; i++) {
      ctx.save();
      ctx.translate(rand() * s, rand() * s * 0.85);
      ctx.rotate(rand() * Math.PI);
      ctx.fillStyle = pick([...BAND_STOPS, "#ffffff"]);
      ctx.fillRect(0, 0, s * 0.02, s * 0.045);
      ctx.restore();
    }
  }
  if (scene === 3) {
    // Stadium rim against the sky.
    ctx.fillStyle = "#1c1020";
    ctx.beginPath();
    ctx.moveTo(0, s * 0.55);
    ctx.quadraticCurveTo(s * 0.5, s * 0.42, s, s * 0.55);
    ctx.lineTo(s, s);
    ctx.lineTo(0, s);
    ctx.fill();
    ctx.fillStyle = "rgba(255,230,180,0.85)";
    for (let i = 0; i < 6; i++) ctx.fillRect(s * (0.08 + i * 0.16), s * 0.47 + Math.abs(i - 2.5) * s * 0.012, s * 0.03, s * 0.012);
  }

  drawCrowd(ctx, s, rand, scene === 3 ? "#0d0710" : "#050507");

  // Vignette and a little grain-free softness so it reads like a phone photo.
  const v = ctx.createRadialGradient(s / 2, s / 2, s * 0.3, s / 2, s / 2, s * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, s, s);
  ctx.restore();
}

/** Silhouetted heads, shoulders and raised hands along the bottom of the frame. */
function drawCrowd(ctx: Ctx2D, s: number, rand: () => number, color: string) {
  ctx.fillStyle = color;
  const horizon = s * (0.72 + rand() * 0.1);
  const people = 6 + Math.floor(rand() * 6);
  for (let i = 0; i < people; i++) {
    const x = (i + rand() * 0.6) * (s / (people - 1)) - s * 0.05;
    const scale = s * (0.07 + rand() * 0.06) * (1 + (i % 3 === 0 ? 0.35 : 0));
    const y = horizon + rand() * s * 0.08;
    ctx.beginPath();
    ctx.arc(x, y - scale * 1.1, scale * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y + scale * 0.9, scale * 1.15, scale * 1.4, 0, Math.PI, 0);
    ctx.lineTo(x + scale * 1.15, s);
    ctx.lineTo(x - scale * 1.15, s);
    ctx.fill();
    if (rand() > 0.55) {
      // A raised arm, sometimes holding up a glowing phone.
      const dir = rand() > 0.5 ? 1 : -1;
      ctx.save();
      ctx.lineCap = "round";
      ctx.strokeStyle = color;
      ctx.lineWidth = scale * 0.35;
      ctx.beginPath();
      ctx.moveTo(x + dir * scale * 0.7, y);
      ctx.lineTo(x + dir * scale * 1.1, y - scale * 2.6);
      ctx.stroke();
      if (rand() > 0.5) {
        ctx.fillStyle = "rgba(255,248,230,0.95)";
        ctx.fillRect(x + dir * scale * 1.1 - scale * 0.22, y - scale * 3.15, scale * 0.44, scale * 0.6);
      }
      ctx.restore();
    }
  }
  ctx.fillRect(0, horizon + s * 0.12, s, s);
}
