import { useRef } from 'react';
import { useFrame } from '../hooks/useSoundEnergy';

/**
 * A simple crescent moon with a soft halo. Its path is a stylised night arc
 * between sunset and sunrise; it does not model real lunar position or phase.
 */
export function Moon({ x, y, opacity }: { x: number; y: number; opacity: number }) {
  const bobRef = useRef<SVGGElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  useFrame((f) => {
    const bob = Math.sin(f.t * 0.5) * 3 * f.motion;
    bobRef.current?.setAttribute('transform', `translate(0,${bob.toFixed(2)}) rotate(-18)`);
    glowRef.current?.setAttribute('opacity', (0.4 + f.drive * 0.25 * (0.5 + 0.5 * f.beat)).toFixed(3));
  });
  if (opacity <= 0.01) return null;
  return (
    <g transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`} opacity={opacity} aria-hidden>
      <defs>
        <radialGradient id="lw-moonglow">
          <stop offset="0.25" stopColor="#fff6d6" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff6d6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle ref={glowRef} r={130} fill="url(#lw-moonglow)" opacity={0.4} />
      <g ref={bobRef}>
        <path d="M6,-46 A46,46 0 1,0 30,38 A36,36 0 0,1 6,-46Z" fill="#fff4cf" />
      </g>
    </g>
  );
}
