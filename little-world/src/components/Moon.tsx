import { useRef } from 'react';
import { useFrame } from '../hooks/useSoundEnergy';

/**
 * A decorative sleepy crescent moon. Its path is a stylised night arc between
 * sunset and sunrise; it does not model real lunar position or phase.
 */
export function Moon({ x, y, opacity, outline }: { x: number; y: number; opacity: number; outline: string }) {
  const bobRef = useRef<SVGGElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  useFrame((f) => {
    const bob = Math.sin(f.t * 0.7) * 4 * f.motion;
    const tilt = Math.sin(f.t * 0.45) * 4 * f.motion + f.drive * Math.sin(f.t * 4) * 3;
    bobRef.current?.setAttribute('transform', `translate(0,${bob.toFixed(2)}) rotate(${tilt.toFixed(2)})`);
    glowRef.current?.setAttribute('opacity', (0.35 + f.drive * 0.25).toFixed(3));
  });
  if (opacity <= 0.01) return null;
  const s = { stroke: outline, strokeWidth: 5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  return (
    <g transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`} opacity={opacity} aria-hidden>
      <defs>
        <radialGradient id="lw-moonglow">
          <stop offset="0.3" stopColor="#fff4c2" stopOpacity="0.7" />
          <stop offset="1" stopColor="#fff4c2" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle ref={glowRef} r={120} fill="url(#lw-moonglow)" opacity={0.35} />
      <g ref={bobRef}>
        <path d="M6,-52 A52,52 0 1,0 30,44 A40,40 0 0,1 6,-52Z" fill="#fff1b8" {...s} />
        <path d="M-30,-18 a10,10 0 0,0 14,4" fill="none" {...s} strokeWidth={4} />
        <path d="M-26,10 q8,7 16,0" fill="none" {...s} strokeWidth={4} />
        <ellipse cx={-36} cy={4} rx={7} ry={4.5} fill="#ffa3b5" opacity={0.8} />
        <circle cx={-12} cy={30} r={4} fill="#efd98f" />
        <circle cx={-40} cy={-34} r={3} fill="#efd98f" />
      </g>
    </g>
  );
}
