import { memo, useMemo, useRef } from 'react';
import type { Palette } from '../data/palettes';
import { mulberry32 } from '../lib/animation';
import { useFrame } from '../hooks/useSoundEnergy';
import { hillYAt } from '../lib/shapes';
import { WORLD_MAX_X, WORLD_MIN_X } from '../hooks/useViewport';
import { DIRT_TOP, MEADOW } from './Landscape';

const PETALS = ['#ff7eb6', '#6ec6ff', '#ffd23f', '#b48cff', '#ff9a3c', '#ff5d6c', '#ffffff'];
const CENTERS = ['#ffd23f', '#ff9a3c', '#ffffff', '#ffd23f'];

type FlowerSpec = { x: number; y: number; stem: number; size: number; petals: number; color: string; center: string; phase: number; kind: 'round' | 'star' };

/** One illustrated flower; `headRef` gets a little bloom pulse with the music. */
export function FlowerShape({ spec, outline, headRef }: { spec: FlowerSpec; outline: string; headRef?: (el: SVGGElement | null) => void }) {
  const { size, petals, color, center, stem, kind } = spec;
  const s = { stroke: outline, strokeWidth: 3, strokeLinejoin: 'round' as const };
  return (
    <>
      <path d={`M0,0 Q${size * 0.3},${-stem * 0.5} 0,${-stem}`} fill="none" stroke={outline} strokeWidth={7} strokeLinecap="round" />
      <path d={`M0,0 Q${size * 0.3},${-stem * 0.5} 0,${-stem}`} fill="none" stroke="#4caf50" strokeWidth={3.5} strokeLinecap="round" />
      <path d={`M1,${-stem * 0.35} q${size * 0.7},${-size * 0.5} ${size * 0.9},${-size * 0.1} q${-size * 0.45},${size * 0.35} ${-size * 0.9},${size * 0.1}Z`} fill="#5ccf55" {...s} strokeWidth={2.5} />
      <g ref={headRef} transform={`translate(0,${-stem})`}>
        {Array.from({ length: petals }, (_, i) => (
          <ellipse
            key={i}
            cx={0}
            cy={-size * 0.55}
            rx={kind === 'star' ? size * 0.22 : size * 0.34}
            ry={size * 0.52}
            transform={`rotate(${(i / petals) * 360})`}
            fill={color}
            {...s}
          />
        ))}
        <circle r={size * 0.36} fill={center} {...s} />
        <circle cx={-size * 0.1} cy={-size * 0.1} r={size * 0.1} fill="#ffffff" opacity={0.7} />
      </g>
    </>
  );
}

function makeFlowers(): FlowerSpec[] {
  const r = mulberry32(77);
  const out: FlowerSpec[] = [];
  const span = WORLD_MAX_X - WORLD_MIN_X;
  const n = Math.round(26 * (span / 1680));
  for (let i = 0; i < n; i++) {
    const x = WORLD_MIN_X + (i + r() * 0.9) * (span / n);
    const front = i % 3 === 0;
    const y = front ? DIRT_TOP + 2 : hillYAt(MEADOW, x) + 30 + r() * 64;
    const depth = front ? 1.25 : 0.65 + ((y - 740) / 90) * 0.5;
    out.push({
      x,
      y,
      stem: (22 + r() * 22) * depth,
      size: (13 + r() * 7) * depth,
      petals: 5 + Math.floor(r() * 3),
      color: PETALS[Math.floor(r() * PETALS.length)],
      center: CENTERS[Math.floor(r() * CENTERS.length)],
      phase: r() * Math.PI * 2,
      kind: r() < 0.3 ? 'star' : 'round',
    });
  }
  return out.sort((a, b) => a.y - b.y);
}

export const Flowers = memo(function Flowers({ palette, light }: { palette: Palette; light: number }) {
  const flowers = useMemo(makeFlowers, []);
  const rootRefs = useRef<(SVGGElement | null)[]>([]);
  const headRefs = useRef<(SVGGElement | null)[]>([]);

  useFrame((f) => {
    for (let i = 0; i < flowers.length; i++) {
      const fl = flowers[i];
      const root = rootRefs.current[i];
      if (!root) continue;
      const sway = Math.sin(f.t * 1.3 + fl.phase) * 4 * f.motion + f.wind * (14 + 8 * Math.sin(f.t * 2.2 + fl.phase));
      root.setAttribute('transform', `translate(${fl.x.toFixed(1)},${fl.y.toFixed(1)}) rotate(${sway.toFixed(2)})`);
      const head = headRefs.current[i];
      if (head) {
        const bloom = 1 + f.drive * 0.14 * Math.abs(Math.sin(f.t * 3.4 + fl.phase));
        const spin = f.drive * 18 * Math.sin(f.t * 1.7 + fl.phase);
        head.setAttribute('transform', `translate(0,${-fl.stem}) rotate(${spin.toFixed(2)}) scale(${bloom.toFixed(3)})`);
      }
    }
  });

  return (
    <g aria-hidden filter={light < 0.985 ? 'url(#lw-nightlight)' : undefined}>
      {flowers.map((fl, i) => (
        <g key={i} ref={(el) => (rootRefs.current[i] = el)} transform={`translate(${fl.x},${fl.y})`}>
          <FlowerShape spec={fl} outline={palette.outline} headRef={(el) => (headRefs.current[i] = el)} />
        </g>
      ))}
    </g>
  );
});
