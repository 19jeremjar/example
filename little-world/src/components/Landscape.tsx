import { memo, useMemo } from 'react';
import type { Palette } from '../data/palettes';
import { mulberry32 } from '../lib/animation';
import { Pt, hillPath, hillYAt, smoothLine } from '../lib/shapes';

// Hill lines extend well past the 16:9 frame so ultra-wide screens see more land.
export const FAR_HILLS: Pt[] = [[-1200, 580], [-900, 540], [-600, 584], [-340, 536], [-120, 600], [140, 548], [420, 588], [700, 532], [990, 578], [1250, 524], [1500, 566], [1760, 538], [2020, 582], [2300, 530], [2560, 572], [2800, 552]];
export const MID_HILLS: Pt[] = [[-1200, 640], [-860, 612], [-520, 652], [-200, 618], [180, 626], [520, 662], [820, 622], [1120, 656], [1400, 616], [1720, 650], [2050, 614], [2380, 648], [2800, 628]];
export const MEADOW: Pt[] = [[-1200, 716], [-820, 734], [-430, 708], [-120, 738], [260, 712], [640, 736], [1040, 708], [1420, 730], [1720, 714], [2080, 736], [2440, 710], [2800, 728]];
/** Top of the darker foreground band. */
export const DIRT_TOP = 826;
export const GROUND_Y = 818;

const FOREGROUND: Pt[] = [[-1200, 822], [-700, 830], [-200, 820], [300, 832], [800, 822], [1300, 832], [1800, 822], [2300, 830], [2800, 824]];

/** A simple flat tree: one soft canopy silhouette with a gentle shade. */
function Tree({ x, y, size, palette, seed }: { x: number; y: number; size: number; palette: Palette; seed: number }) {
  const blobs = useMemo(() => {
    const r = mulberry32(seed);
    return [
      { cx: 0, cy: -size * 1.15, r: size * 0.62 },
      { cx: -size * 0.42, cy: -size * 0.86, r: size * 0.44 + r() * 5 },
      { cx: size * 0.44, cy: -size * 0.9, r: size * 0.42 + r() * 5 },
      { cx: 0, cy: -size * 1.55, r: size * 0.42 },
    ];
  }, [seed, size]);
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-size * 0.06} y={-size * 0.85} width={size * 0.12} height={size * 0.88} rx={size * 0.05} fill={palette.trunk} />
      <g fill={palette.tree}>
        {blobs.map((b, i) => (
          <circle key={i} {...b} />
        ))}
      </g>
      <circle cx={size * 0.28} cy={-size * 0.82} r={size * 0.34} fill={palette.treeShade} opacity={0.55} />
    </g>
  );
}

export const Landscape = memo(function Landscape({ palette }: { palette: Palette }) {
  const fgTop = useMemo(() => smoothLine(FOREGROUND), []);
  return (
    <g aria-hidden>
      <path d={hillPath(FAR_HILLS, 950)} fill={palette.hillFar} />
      <Tree x={1420} y={hillYAt(MID_HILLS, 1420) + 8} size={86} palette={palette} seed={4} />
      <Tree x={1520} y={hillYAt(MID_HILLS, 1520) + 12} size={60} palette={palette} seed={8} />
      <Tree x={130} y={hillYAt(MID_HILLS, 130) + 10} size={70} palette={palette} seed={15} />
      {/* only visible on screens wider than 16:9 */}
      <Tree x={-430} y={hillYAt(MID_HILLS, -430) + 10} size={78} palette={palette} seed={23} />
      <Tree x={-900} y={hillYAt(MID_HILLS, -900) + 10} size={66} palette={palette} seed={37} />
      <Tree x={2100} y={hillYAt(MID_HILLS, 2100) + 10} size={76} palette={palette} seed={41} />
      <Tree x={2480} y={hillYAt(MID_HILLS, 2480) + 10} size={60} palette={palette} seed={47} />
      <path d={hillPath(MID_HILLS, 950)} fill={palette.hillMid} />
      <path d={hillPath(MEADOW, 950)} fill={palette.meadow} />
      {/* soft foreground band the characters stand in front of */}
      <path d={`${fgTop} L2800,1000 L-1200,1000Z`} fill={palette.meadowShade} />
    </g>
  );
});
