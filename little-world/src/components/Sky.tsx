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
    return Array.from({ length: 120 }, (_, i) => ({
      x: r() * 1600,
      y: i < 64 ? r() * 470 + 10 : -r() * 1500,
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
    ],
    [],
  );
  const refs = useRef<(SVGGElement | null)[]>([]);
  const vpRef = useRef(vp);
  vpRef.current = vp;

  useFrame((f) => {
    const v = vpRef.current;
    const span = v.x1 - v.x0 + 600;
    specs.forEach((c, i) => {
      const el = refs.current[i];
      if (!el) return;
      // Clouds drift slowly no matter what; a hint of extra bob when it's loud.
      const travel = (c.x * span + f.t * c.speed * (f.motion ? 1 : 0)) % span;
      const x = v.x0 - 300 + travel;
      const bob = Math.sin(f.t * 0.5 + i * 2) * 3 * f.motion + f.drive * Math.sin(f.t * 3 + i) * 3;
      // Spread clouds through whatever sky is visible (taller on portrait screens).
      const y = v.y0 + c.y * ((v.y1 - v.y0) / 900) * (v.y0 < 0 ? 0.75 : 1) + Math.max(0, v.y0 * 0.6);
      el.setAttribute('transform', `translate(${x.toFixed(1)},${(y + bob).toFixed(1)})`);
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
