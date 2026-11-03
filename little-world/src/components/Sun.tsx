import { useRef } from 'react';
import { mixHex } from '../data/palettes';
import { useFrame } from '../hooks/useSoundEnergy';

type Props = { x: number; y: number; altitude: number };

const R = 58;
const RAYS = 16;

/**
 * A clean, glowing sun. Its position comes only from props (solar time);
 * sound only affects its glow, gentle pulse and the length of its rays.
 */
export function Sun({ x, y, altitude }: Props) {
  const bodyRef = useRef<SVGGElement>(null);
  const raysRef = useRef<SVGGElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);

  // Warmer near the horizon.
  const low = Math.max(0, Math.min(1, 1 - altitude / 18));
  const core = mixHex('#fff3b0', '#ffd08a', low);
  const rim = mixHex('#ffd24d', '#ff9f4d', low);
  const ray = mixHex('#ffe48a', '#ffb877', low);

  useFrame((f) => {
    const d = f.drive;
    const beat = f.beat;
    const pulse = 1 + 0.01 * Math.sin(f.t * 1.2) * f.motion + 0.07 * d * beat;
    bodyRef.current?.setAttribute('transform', `scale(${pulse.toFixed(4)})`);
    const spin = (f.t * (2 + d * 8) * f.motion) % 360;
    const rayScale = 1 + 0.1 * d + 0.18 * d * beat;
    raysRef.current?.setAttribute('transform', `rotate(${spin.toFixed(2)}) scale(${rayScale.toFixed(3)})`);
    glowRef.current?.setAttribute('opacity', (0.45 + 0.4 * d * (0.4 + 0.6 * beat)).toFixed(3));
  });

  return (
    <g transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`} aria-hidden>
      <defs>
        <radialGradient id="lw-sunglow">
          <stop offset="0.3" stopColor="#fff6c8" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff6c8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lw-sunface" cx="0.4" cy="0.38" r="0.7">
          <stop offset="0" stopColor={core} />
          <stop offset="1" stopColor={rim} />
        </radialGradient>
      </defs>
      <circle ref={glowRef} r={R * 3.2} fill="url(#lw-sunglow)" opacity={0.45} />
      <g ref={bodyRef}>
        <g ref={raysRef} opacity={0.75}>
          {Array.from({ length: RAYS }, (_, i) => (
            <rect
              key={i}
              x={-3}
              y={-(R + (i % 2 ? 30 : 40))}
              width={6}
              height={i % 2 ? 14 : 22}
              rx={3}
              transform={`rotate(${(i / RAYS) * 360})`}
              fill={ray}
            />
          ))}
        </g>
        <circle r={R} fill="url(#lw-sunface)" />
      </g>
    </g>
  );
}
