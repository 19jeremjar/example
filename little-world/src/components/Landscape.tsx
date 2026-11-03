import { memo, useEffect, useMemo, useState } from 'react';
import type { Palette } from '../data/palettes';
import { mulberry32 } from '../lib/animation';
import { Pt, hillPath, hillYAt } from '../lib/shapes';

export const FAR_HILLS: Pt[] = [[-120, 600], [140, 548], [420, 588], [700, 532], [990, 578], [1250, 524], [1500, 566], [1720, 590]];
export const MID_HILLS: Pt[] = [[-120, 668], [180, 626], [520, 662], [820, 622], [1120, 656], [1400, 616], [1720, 650]];
export const MEADOW: Pt[] = [[-120, 738], [260, 712], [640, 736], [1040, 708], [1420, 730], [1720, 714]];
export const DIRT_TOP = 826;
export const GROUND_Y = 818;

/** Fixed-colour props (fruit, fence, mushrooms) dim with the same night light as characters. */
const nightFilter = (p: Palette) => (p.light < 0.985 ? 'url(#lw-nightlight)' : undefined);

const line = (o: string, w = 5) => ({ stroke: o, strokeWidth: w, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const });

/** Round, outlined storybook tree (circles stroked then filled for one clean outline). */
function Tree({ x, y, size, palette, seed }: { x: number; y: number; size: number; palette: Palette; seed: number }) {
  const blobs = useMemo(() => {
    const r = mulberry32(seed);
    return [
      { cx: 0, cy: -size * 1.15, r: size * 0.62 },
      { cx: -size * 0.45, cy: -size * 0.85, r: size * 0.46 + r() * 6 },
      { cx: size * 0.47, cy: -size * 0.88, r: size * 0.44 + r() * 6 },
      { cx: -size * 0.12, cy: -size * 1.55, r: size * 0.4 },
      { cx: size * 0.25, cy: -size * 1.45, r: size * 0.4 },
    ];
  }, [seed, size]);
  const fruit = useMemo(() => {
    const r = mulberry32(seed + 9);
    return Array.from({ length: 6 }, () => ({ x: (r() - 0.5) * size * 1.3, y: -size * (0.75 + r() * 0.9), c: r() < 0.5 ? '#ff5d73' : '#ffd23f' }));
  }, [seed, size]);
  return (
    <g transform={`translate(${x},${y})`}>
      <path d={`M${-size * 0.12},0 L${-size * 0.08},${-size * 0.8} L${size * 0.08},${-size * 0.8} L${size * 0.14},0Z`} fill={palette.trunk} {...line(palette.outline, 4.5)} />
      <g fill={palette.tree} {...line(palette.outline, 10)}>
        {blobs.map((b, i) => <circle key={i} {...b} />)}
      </g>
      <g fill={palette.tree}>{blobs.map((b, i) => <circle key={i} {...b} />)}</g>
      <circle cx={size * 0.25} cy={-size * 0.8} r={size * 0.3} fill={palette.treeShade} opacity={0.8} />
      <ellipse cx={-size * 0.22} cy={-size * 1.6} rx={size * 0.18} ry={size * 0.09} fill="#ffffff" opacity={0.35} />
      <g filter={nightFilter(palette)}>
        {fruit.map((f, i) => (
          <circle key={i} cx={f.x} cy={f.y} r={size * 0.06} fill={f.c} {...line(palette.outline, 2.5)} />
        ))}
      </g>
    </g>
  );
}

function Bush({ x, y, w, palette }: { x: number; y: number; w: number; palette: Palette }) {
  const c = [
    { cx: -w * 0.3, cy: -w * 0.18, r: w * 0.26 },
    { cx: 0, cy: -w * 0.3, r: w * 0.32 },
    { cx: w * 0.32, cy: -w * 0.16, r: w * 0.24 },
  ];
  return (
    <g transform={`translate(${x},${y})`}>
      <g fill={palette.tree} {...line(palette.outline, 9)}>{c.map((b, i) => <circle key={i} {...b} />)}</g>
      <g fill={palette.tree}>{c.map((b, i) => <circle key={i} {...b} />)}</g>
      <rect x={-w * 0.56} y={-6} width={w * 1.12} height={12} fill={palette.meadow} />
      <ellipse cx={-w * 0.05} cy={-w * 0.42} rx={w * 0.1} ry={w * 0.05} fill="#fff" opacity={0.35} />
    </g>
  );
}

function Fence({ x, y, palette }: { x: number; y: number; palette: Palette }) {
  const wood = '#c98b55';
  const posts = [0, 46, 92];
  return (
    <g transform={`translate(${x},${y})`} {...line(palette.outline, 4)} filter={nightFilter(palette)}>
      <rect x={-6} y={-46} width={112} height={11} rx={3} fill={wood} />
      <rect x={-6} y={-24} width={112} height={11} rx={3} fill={wood} />
      {posts.map((p) => (
        <path key={p} d={`M${p},2 L${p},-56 L${p + 7},-64 L${p + 14},-56 L${p + 14},2Z`} fill="#d99b62" />
      ))}
    </g>
  );
}

/**
 * Retro accent: the dirt-and-pebble band under the grass is genuine pixel art,
 * drawn once to a tiny canvas and tiled with nearest-neighbour scaling.
 */
function usePixelDirtTile(dirt: string, dark: string, outline: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const W = 64;
    const H = 22;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    if (!g) return;
    g.fillStyle = dark;
    g.fillRect(0, 0, W, H);
    const r = mulberry32(42);
    const light = shade(dirt, 1.12);
    const rocks: { x: number; y: number; rx: number; ry: number }[] = [];
    for (let i = 0; i < 16; i++) rocks.push({ x: r() * W, y: 2 + r() * (H - 3), rx: 3 + r() * 3.5, ry: 2.4 + r() * 2 });
    for (const k of rocks) {
      for (let dx = -8; dx <= 8; dx++) {
        for (let dy = -6; dy <= 6; dy++) {
          const v = (dx * dx) / (k.rx * k.rx) + (dy * dy) / (k.ry * k.ry);
          if (v > 1.05) continue;
          const px = (Math.round(k.x + dx) + W) % W;
          const py = Math.round(k.y + dy);
          if (py < 0 || py >= H) continue;
          g.fillStyle = v > 0.7 ? outline : dy < -k.ry * 0.3 && dx < 0 ? light : dirt;
          g.fillRect(px, py, 1, 1);
        }
      }
    }
    // little clover sprigs
    g.fillStyle = '#5fbf4a';
    for (let i = 0; i < 4; i++) {
      const x = Math.floor(r() * W);
      const y = Math.floor(4 + r() * (H - 8));
      g.fillRect(x, y, 1, 3);
      g.fillRect(x - 1, y, 3, 1);
    }
    setUrl(c.toDataURL());
  }, [dirt, dark, outline]);
  return url;
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return '#' + ((1 << 24) | (f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1);
}

/** Stepped, pixel-style grass lip sitting on top of the dirt band. */
function pixelLip(seed: number): string {
  const r = mulberry32(seed);
  const step = 8;
  let d = `M-200,${DIRT_TOP + 20}`;
  for (let x = -200; x <= 1800; x += step) {
    const h = r() < 0.35 ? (r() < 0.5 ? 2 : 1) : 0;
    d += ` L${x},${DIRT_TOP + 8 + h * 6} L${x + step},${DIRT_TOP + 8 + h * 6}`;
  }
  return `${d} L1800,${DIRT_TOP - 4} L-200,${DIRT_TOP - 4}Z`;
}

export const Landscape = memo(function Landscape({ palette }: { palette: Palette }) {
  const tile = usePixelDirtTile(palette.dirt, palette.dirtDark, palette.outline);
  const lip = useMemo(() => pixelLip(5), []);
  const o = palette.outline;

  return (
    <g aria-hidden>
      {tile && (
        <defs>
          <pattern id="lw-dirt" patternUnits="userSpaceOnUse" width={256} height={88} y={DIRT_TOP}>
            <image href={tile} width={256} height={88} style={{ imageRendering: 'pixelated' }} />
          </pattern>
        </defs>
      )}
      <path d={hillPath(FAR_HILLS, 950)} fill={palette.hillFar} {...line(o, 5)} />
      {/* soft stripes on the far hills */}
      <path d="M260,598 q90,-22 180,-6 M1060,580 q110,-30 230,-14" fill="none" stroke={palette.hillMid} strokeWidth={10} strokeLinecap="round" opacity={0.6} />
      <Tree x={1420} y={hillYAt(MID_HILLS, 1420) + 8} size={86} palette={palette} seed={4} />
      <Tree x={1530} y={hillYAt(MID_HILLS, 1530) + 12} size={64} palette={palette} seed={8} />
      <Tree x={120} y={hillYAt(MID_HILLS, 120) + 10} size={72} palette={palette} seed={15} />
      <path d={hillPath(MID_HILLS, 950)} fill={palette.hillMid} {...line(o, 5)} />
      <Bush x={560} y={hillYAt(MID_HILLS, 560) + 14} w={110} palette={{ ...palette, meadow: palette.hillMid }} />
      <Fence x={1180} y={hillYAt(MEADOW, 1230) + 4} palette={palette} />
      <path d={hillPath(MEADOW, 950)} fill={palette.meadow} {...line(o, 5)} />
      {/* meadow shading bands */}
      <path d="M-100,790 C200,770 420,800 700,784 C980,768 1250,800 1700,778 L1700,830 L-100,830Z" fill={palette.meadowShade} opacity={0.55} />
      <Bush x={60} y={hillYAt(MEADOW, 60) + 10} w={120} palette={palette} />
      <Bush x={1560} y={hillYAt(MEADOW, 1560) + 10} w={140} palette={palette} />
      {/* pixel dirt band */}
      <rect x={-200} y={DIRT_TOP} width={2000} height={200} fill={tile ? 'url(#lw-dirt)' : palette.dirt} />
      <rect x={-200} y={DIRT_TOP} width={2000} height={200} fill={palette.outline} opacity={palette.night * 0.25} />
      <path d={lip} fill={palette.grass} shapeRendering="crispEdges" />
      <path d={lip} fill="none" stroke={o} strokeWidth={4} shapeRendering="crispEdges" />
      <Mushrooms palette={palette} />
    </g>
  );
});

function Mushrooms({ palette }: { palette: Palette }) {
  const items = [
    { x: 940, y: DIRT_TOP + 6, s: 1 },
    { x: 965, y: DIRT_TOP + 8, s: 0.7 },
    { x: 300, y: DIRT_TOP + 6, s: 0.85 },
  ];
  return (
    <g shapeRendering="crispEdges" filter={nightFilter(palette)}>
      {items.map((m, i) => (
        <g key={i} transform={`translate(${m.x},${m.y}) scale(${m.s})`}>
          <rect x={-6} y={-16} width={12} height={16} fill="#fff3dc" stroke={palette.outline} strokeWidth={3} />
          <path d="M-18,-14 L-18,-22 L-12,-28 L12,-28 L18,-22 L18,-14Z" fill="#ff6b4a" stroke={palette.outline} strokeWidth={3} />
          <rect x={-8} y={-24} width={5} height={5} fill="#fff" />
          <rect x={5} y={-21} width={4} height={4} fill="#fff" />
        </g>
      ))}
    </g>
  );
}
