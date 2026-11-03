import { memo, useMemo, useRef } from 'react';
import { mulberry32 } from '../lib/animation';
import { useFrame } from '../hooks/useSoundEnergy';
import type { Viewport } from '../lib/solar';

const WINGS = [
  ['#ffd23f', '#ff6b6b'],
  ['#ff8fc8', '#b48cff'],
  ['#7ee081', '#3fb0f2'],
];

/** Butterflies by day, fireflies by night. Both perk up with the music. */
export const Critters = memo(function Critters({ night, outline, vp }: { night: number; outline: string; vp: Viewport }) {
  const flies = useMemo(() => {
    const r = mulberry32(55);
    return Array.from({ length: 14 }, () => ({ x: r(), y: 470 + r() * 330, p: r() * 10, s: 0.6 + r() * 0.8 }));
  }, []);
  const bRefs = useRef<(SVGGElement | null)[]>([]);
  const wingRefs = useRef<(SVGGElement | null)[]>([]);
  const fRefs = useRef<(SVGCircleElement | null)[]>([]);
  const vpRef = useRef(vp);
  vpRef.current = vp;

  useFrame((f) => {
    const v = vpRef.current;
    const w = v.x1 - v.x0;
    const speed = 0.06 + f.drive * 0.1;
    WINGS.forEach((_, i) => {
      const el = bRefs.current[i];
      if (!el) return;
      const t = f.t * speed * f.motion + i * 2.1;
      const x = v.x0 + w * (0.5 + 0.42 * Math.sin(t * 1.3 + i) * Math.cos(t * 0.37));
      const y = 380 + i * 70 + 60 * Math.sin(t * 2.1 + i * 1.7) + 18 * Math.sin(f.t * 2.4 + i) * f.motion;
      const dir = Math.cos(t * 1.3 + i) >= 0 ? 1 : -1;
      el.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${dir},1)`);
      const flap = f.motion ? 0.35 + 0.65 * Math.abs(Math.sin(f.t * (9 + f.drive * 10) + i)) : 1;
      wingRefs.current[i]?.setAttribute('transform', `scale(${flap.toFixed(3)},1)`);
    });
    flies.forEach((fl, i) => {
      const el = fRefs.current[i];
      if (!el) return;
      const t = f.t * f.motion * (0.25 + f.drive * 0.4) + fl.p;
      el.setAttribute('cx', (v.x0 + w * fl.x + 40 * Math.sin(t * 1.3)).toFixed(1));
      el.setAttribute('cy', (fl.y + 25 * Math.sin(t * 0.9 + 1)).toFixed(1));
      el.setAttribute('opacity', (0.35 + 0.65 * Math.abs(Math.sin(f.t * 1.4 + fl.p)) * (0.6 + f.drive * 0.4)).toFixed(2));
    });
  });

  const day = 1 - night;
  return (
    <g aria-hidden>
      {day > 0.05 && (
        <g opacity={day}>
          {WINGS.map(([a, b], i) => (
            <g key={i} ref={(el) => (bRefs.current[i] = el)}>
              <g ref={(el) => (wingRefs.current[i] = el)} stroke={outline} strokeWidth={2.5} strokeLinejoin="round">
                <path d="M0,0 C-6,-22 -26,-24 -24,-8 C-22,0 -8,2 0,0Z" fill={a} />
                <path d="M0,0 C-4,12 -18,18 -18,8 C-18,2 -8,0 0,0Z" fill={b} />
                <path d="M0,0 C6,-22 26,-24 24,-8 C22,0 8,2 0,0Z" fill={a} />
                <path d="M0,0 C4,12 18,18 18,8 C18,2 8,0 0,0Z" fill={b} />
                <circle cx={-14} cy={-11} r={3} fill="#fff" stroke="none" opacity={0.8} />
                <circle cx={14} cy={-11} r={3} fill="#fff" stroke="none" opacity={0.8} />
              </g>
              <ellipse rx={3} ry={10} cy={2} fill={outline} />
              <path d="M-1,-7 q-4,-8 -8,-9 M1,-7 q4,-8 8,-9" stroke={outline} strokeWidth={2} fill="none" strokeLinecap="round" />
            </g>
          ))}
        </g>
      )}
      {night > 0.05 && (
        <g opacity={night}>
          {flies.map((fl, i) => (
            <circle key={i} ref={(el) => (fRefs.current[i] = el)} cx={fl.x * 1600} cy={fl.y} r={3.2 * fl.s + 1.5} fill="#fbff9c" filter="url(#lw-glow)" />
          ))}
        </g>
      )}
    </g>
  );
});
