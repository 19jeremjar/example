import { memo, useMemo, useRef } from 'react';
import type { Palette } from '../data/palettes';
import { mulberry32 } from '../lib/animation';
import { useFrame } from '../hooks/useSoundEnergy';
import { DIRT_TOP, MEADOW } from './Landscape';
import { hillYAt } from '../lib/shapes';
import { WORLD_MAX_X, WORLD_MIN_X } from '../hooks/useViewport';

type Blade = { dx: number; h: number; w: number; lean: number; dark: boolean };
type Cluster = { x: number; y: number; blades: Blade[]; phase: number; flex: number; scale: number };

function makeClusters(layer: 'back' | 'front'): Cluster[] {
  const r = mulberry32(layer === 'back' ? 101 : 202);
  const out: Cluster[] = [];
  // Same density as the 16:9 design, spread across the full world width.
  const span = WORLD_MAX_X - WORLD_MIN_X;
  const n = Math.round((layer === 'back' ? 30 : 22) * (span / 1720));
  for (let i = 0; i < n; i++) {
    const x = WORLD_MIN_X + (i + r() * 0.8) * (span / n);
    const y = layer === 'back' ? hillYAt(MEADOW, x) + 18 + r() * 60 : DIRT_TOP + 4 + r() * 4;
    const count = 3 + Math.floor(r() * 3);
    const blades: Blade[] = [];
    for (let b = 0; b < count; b++) {
      const t = count === 1 ? 0 : b / (count - 1) - 0.5;
      blades.push({
        dx: t * 26 + (r() - 0.5) * 6,
        h: (layer === 'back' ? 26 : 16) + r() * (layer === 'back' ? 22 : 14) - Math.abs(t) * (layer === 'back' ? 16 : 6),
        w: 9 + r() * 4,
        lean: t * 22 + (r() - 0.5) * 8,
        dark: r() < 0.35,
      });
    }
    out.push({ x, y, blades, phase: r() * Math.PI * 2, flex: 0.75 + r() * 0.5, scale: layer === 'back' ? 0.8 + r() * 0.3 : 1 + r() * 0.25 });
  }
  return out;
}

function bladePath(b: Blade): string {
  const tipX = b.dx + b.lean;
  const tipY = -b.h;
  return `M${b.dx - b.w / 2},2 Q${b.dx - b.w * 0.3 + b.lean * 0.3},${-b.h * 0.55} ${tipX},${tipY} Q${b.dx + b.w * 0.25 + b.lean * 0.35},${-b.h * 0.5} ${b.dx + b.w / 2},2Z`;
}

/**
 * Grass tufts that bend with the simulated wind. Each tuft has its own phase
 * and stiffness so the field ripples rather than moving in lockstep.
 */
export const Grass = memo(function Grass({ palette, layer }: { palette: Palette; layer: 'back' | 'front' }) {
  const clusters = useMemo(() => makeClusters(layer), [layer]);
  const refs = useRef<(SVGGElement | null)[]>([]);
  const skip = useRef(0);

  useFrame((f) => {
    // On slow machines, update half the tufts per frame.
    skip.current = (skip.current + 1) % 2;
    const half = f.motion > 0 && f.dt > 0.03;
    for (let i = 0; i < clusters.length; i++) {
      if (half && i % 2 !== skip.current) continue;
      const c = clusters[i];
      const el = refs.current[i];
      if (!el) continue;
      // Wind gust travels left → right across the field.
      const travel = Math.sin(f.t * (1.2 + f.wind * 1.6) - c.x * 0.004 + c.phase);
      const idle = Math.sin(f.t * 1.1 + c.phase) * 3.2 * f.motion;
      const bend = f.wind * c.flex * (16 + 12 * travel) + idle;
      el.setAttribute('transform', `translate(${c.x.toFixed(1)},${c.y.toFixed(1)}) scale(${c.scale.toFixed(2)}) rotate(${bend.toFixed(2)})`);
    }
  });

  return (
    <g aria-hidden stroke={palette.outline} strokeWidth={3.5} strokeLinejoin="round">
      {clusters.map((c, i) => (
        <g key={i} ref={(el) => (refs.current[i] = el)} transform={`translate(${c.x},${c.y}) scale(${c.scale})`}>
          {c.blades.map((b, j) => (
            <path key={j} d={bladePath(b)} fill={b.dark ? palette.grassDark : palette.grass} />
          ))}
        </g>
      ))}
    </g>
  );
});
