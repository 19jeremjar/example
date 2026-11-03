import { memo, useMemo, useRef } from 'react';
import { mulberry32 } from '../lib/animation';
import { useFrame } from '../hooks/useSoundEnergy';
import { hillYAt } from '../lib/shapes';
import { WORLD_MAX_X, WORLD_MIN_X } from '../hooks/useViewport';
import { DIRT_TOP, MEADOW } from './Landscape';

// Soft pastel palette so the meadow reads as calm, not busy.
const PETALS = ['#ffffff', '#ffc4d4', '#ffe29a', '#d4c6ff', '#b9e3ff'];
const CENTERS = ['#ffd36b', '#ffb36b', '#fff1c2'];

type FlowerSpec = { x: number; y: number; stem: number; size: number; petals: number; color: string; center: string; phase: number; kind: 'round' | 'star' };

/** One simple flower; `headRef` gets a small bloom pulse with the music. */
export function FlowerShape({ spec, headRef }: { spec: FlowerSpec; headRef?: (el: SVGGElement | null) => void }) {
  const { size, petals, color, center, stem, kind } = spec;
  return (
    <>
      <path d={`M0,0 Q${size * 0.25},${-stem * 0.5} 0,${-stem}`} fill="none" stroke="#5aa86a" strokeWidth={2.5} strokeLinecap="round" opacity={0.85} />
      <g ref={headRef} transform={`translate(0,${-stem})`}>
        {Array.from({ length: petals }, (_, i) => (
          <ellipse
            key={i}
            cx={0}
            cy={-size * 0.5}
            rx={kind === 'star' ? size * 0.2 : size * 0.3}
            ry={size * 0.46}
            transform={`rotate(${(i / petals) * 360})`}
            fill={color}
          />
        ))}
        <circle r={size * 0.26} fill={center} />
      </g>
    </>
  );
}

function makeFlowers(): FlowerSpec[] {
  const r = mulberry32(77);
  const out: FlowerSpec[] = [];
  const span = WORLD_MAX_X - WORLD_MIN_X;
  const n = Math.round(13 * (span / 1680));
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

export const Flowers = memo(function Flowers({ light }: { light: number }) {
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
        // Flowers pop open on every beat.
        const bloom = 1 + f.drive * (0.06 + 0.24 * f.beat);
        const spin = f.drive * 18 * Math.sin(f.t * 1.7 + fl.phase);
        const nod = f.drive * f.beat * 5;
        head.setAttribute('transform', `translate(0,${(-fl.stem - nod).toFixed(2)}) rotate(${spin.toFixed(2)}) scale(${bloom.toFixed(3)})`);
      }
    }
  });

  return (
    <g aria-hidden filter={light < 0.985 ? 'url(#lw-nightlight)' : undefined}>
      {flowers.map((fl, i) => (
        <g key={i} ref={(el) => (rootRefs.current[i] = el)} transform={`translate(${fl.x},${fl.y})`}>
          <FlowerShape spec={fl} headRef={(el) => (headRefs.current[i] = el)} />
        </g>
      ))}
    </g>
  );
});
