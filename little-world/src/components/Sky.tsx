import { memo, useMemo, useRef } from 'react';
import type { Palette } from '../data/palettes';
import { mulberry32 } from '../lib/animation';
import { useFrame } from '../hooks/useSoundEnergy';
import type { Viewport } from '../lib/solar';

export function SkyDefs({ palette, top }: { palette: Palette; top: number }) {
  return (
    <>
      <linearGradient id="lw-sky" gradientUnits="userSpaceOnUse" x1="0" y1={Math.min(0, top)} x2="0" y2={700}>
        <stop offset="0" stopColor={palette.skyTop} />
        <stop offset="0.55" stopColor={palette.skyMid} />
        <stop offset="0.82" stopColor={palette.skyBottom} />
      </linearGradient>
    </>
  );
}

export function SkyBackdrop({ vp }: { vp: Viewport }) {
  return <rect x={vp.x0 - 50} y={vp.y0 - 50} width={vp.x1 - vp.x0 + 100} height={vp.y1 - vp.y0 + 100} fill="url(#lw-sky)" />;
}

/** Twinkling stars and sparkles; fade in with the night amount. */
export const Stars = memo(function Stars({ night }: { night: number }) {
  const stars = useMemo(() => {
    const r = mulberry32(7);
    // 64 stars in the standard sky, plus more above it for tall portrait screens.
    return Array.from({ length: 220 }, (_, i) => ({
      x: -1100 + r() * 3800,
      y: i < 150 ? r() * 470 + 10 : -r() * 1500,
      s: r() < 0.18 ? 9 + r() * 6 : 1.6 + r() * 2.4,
      d: (r() * 4).toFixed(2),
      dur: (2.4 + r() * 3).toFixed(2),
      sparkle: i % 6 === 0,
    }));
  }, []);
  if (night <= 0.01) return null;
  return (
    <g opacity={night} aria-hidden>
      {stars.map((s, i) =>
        s.sparkle || s.s > 8 ? (
          <path
            key={i}
            className="lw-twinkle"
            style={{ animationDelay: `${s.d}s`, animationDuration: `${s.dur}s`, transformOrigin: `${s.x}px ${s.y}px` }}
            d={`M${s.x},${s.y - s.s} Q${s.x + s.s * 0.18},${s.y - s.s * 0.18} ${s.x + s.s},${s.y} Q${s.x + s.s * 0.18},${s.y + s.s * 0.18} ${s.x},${s.y + s.s} Q${s.x - s.s * 0.18},${s.y + s.s * 0.18} ${s.x - s.s},${s.y} Q${s.x - s.s * 0.18},${s.y - s.s * 0.18} ${s.x},${s.y - s.s}Z`}
            fill="#fff6c8"
          />
        ) : (
          <circle
            key={i}
            className="lw-twinkle"
            style={{ animationDelay: `${s.d}s`, animationDuration: `${s.dur}s` }}
            cx={s.x}
            cy={s.y}
            r={s.s}
            fill="#ffffff"
          />
        ),
      )}
    </g>
  );
});

type CloudSpec = { x: number; y: number; w: number; speed: number; seed: number };

/** A puffy cartoon cloud: circles drawn twice (stroked, then filled) to get one outline. */
function CloudShape({ w, seed, palette }: { w: number; seed: number; palette: Palette }) {
  const puffs = useMemo(() => {
    const r = mulberry32(seed);
    const n = 4 + Math.floor(r() * 2);
    const out: { cx: number; cy: number; r: number }[] = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const rad = w * (0.15 + 0.12 * Math.sin(Math.PI * t) + r() * 0.04);
      out.push({ cx: -w / 2 + w * 0.12 + t * w * 0.76, cy: -rad * 0.55, r: rad });
    }
    return out;
  }, [w, seed]);
  const base = { x: -w / 2, y: -w * 0.1, width: w, height: w * 0.14, rx: w * 0.07 };
  return (
    <g>
      <g stroke={palette.outline} strokeWidth={9} strokeOpacity={0.55} fill={palette.cloud}>
        {puffs.map((p, i) => <circle key={i} {...p} />)}
        <rect {...base} />
      </g>
      <g fill={palette.cloud}>
        {puffs.map((p, i) => <circle key={i} {...p} />)}
        <rect {...base} />
      </g>
      {/* soft underside shade + a little highlight */}
      <path d={`M${-w * 0.36},${-w * 0.03} q${w * 0.36},${w * 0.07} ${w * 0.72},0`} fill="none" stroke={palette.cloudShade} strokeWidth={w * 0.05} strokeLinecap="round" />
      <ellipse cx={puffs[1].cx - puffs[1].r * 0.3} cy={puffs[1].cy - puffs[1].r * 0.45} rx={puffs[1].r * 0.28} ry={puffs[1].r * 0.13} fill="#ffffff" opacity={0.7} />
    </g>
  );
}

export function Clouds({ palette, vp }: { palette: Palette; vp: Viewport }) {
  const specs: CloudSpec[] = useMemo(
    () => [
      { x: 0.12, y: 150, w: 230, speed: 5, seed: 3 },
      { x: 0.52, y: 105, w: 280, speed: 3.6, seed: 11 },
      { x: 0.82, y: 225, w: 190, speed: 6.4, seed: 21 },
      { x: 0.33, y: 260, w: 160, speed: 4.4, seed: 29 },
      { x: 0.68, y: 60, w: 210, speed: 5.4, seed: 35 },
    ],
    [],
  );
  const refs = useRef<(SVGGElement | null)[]>([]);
  const vpRef = useRef(vp);
  vpRef.current = vp;

  const drift = useRef(specs.map(() => 0));

  useFrame((f) => {
    const v = vpRef.current;
    const span = v.x1 - v.x0 + 600;
    const d = f.drive;
    specs.forEach((c, i) => {
      const el = refs.current[i];
      if (!el) return;
      // Clouds always drift; music speeds them up (up to 4×).
      drift.current[i] += f.dt * c.speed * (1 + 3 * d) * f.motion;
      const travel = (c.x * span + drift.current[i]) % span;
      const x = v.x0 - 300 + travel;
      // Gentle float, plus a hop and a puff on every beat.
      const kick = f.beat * d;
      const bob = Math.sin(f.t * 0.5 + i * 2) * 3 * f.motion - kick * (10 + 4 * (i % 3)) - d * 5 * Math.sin(Math.PI * f.beatPhase) * (i % 2 ? 1 : -1);
      const puff = 1 + kick * 0.08 + d * 0.02 * Math.sin(2 * Math.PI * f.beatPhase + i);
      const tilt = d * 3 * Math.sin(Math.PI * (f.beatIndex + f.beatPhase) + i);
      // Spread clouds through whatever sky is visible (taller on portrait screens).
      const y = v.y0 + c.y * ((v.y1 - v.y0) / 900) * (v.y0 < 0 ? 0.75 : 1) + Math.max(0, v.y0 * 0.6);
      el.setAttribute('transform', `translate(${x.toFixed(1)},${(y + bob).toFixed(1)}) rotate(${tilt.toFixed(2)}) scale(${puff.toFixed(3)})`);
    });
  });

  return (
    <g aria-hidden>
      {specs.map((c, i) => (
        <g key={i} ref={(el) => (refs.current[i] = el)}>
          <CloudShape w={c.w} seed={c.seed} palette={palette} />
        </g>
      ))}
    </g>
  );
}
