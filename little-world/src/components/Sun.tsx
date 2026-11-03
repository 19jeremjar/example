import { useRef } from 'react';
import { mixHex } from '../data/palettes';
import { useFrame } from '../hooks/useSoundEnergy';

type Props = { x: number; y: number; altitude: number; outline: string };

const R = 64;
const RAYS = 14;

/**
 * The smiling sun. Its position comes only from props (solar time); sound only
 * changes scale, glow, ray length and expression via the animation frame.
 */
export function Sun({ x, y, altitude, outline }: Props) {
  const bodyRef = useRef<SVGGElement>(null);
  const raysRef = useRef<SVGGElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  const calmRef = useRef<SVGGElement>(null);
  const happyRef = useRef<SVGGElement>(null);
  const joyRef = useRef<SVGGElement>(null);
  const blinkRef = useRef<SVGGElement>(null);

  // Warmer and a touch larger near the horizon.
  const low = Math.max(0, Math.min(1, 1 - altitude / 18));
  const face = mixHex('#ffd43b', '#ffa94d', low * 0.8);
  const ray = mixHex('#ffb627', '#ff8a3d', low * 0.8);

  useFrame((f) => {
    const d = f.drive;
    const beat = f.beat;
    const pulse = 1 + 0.012 * Math.sin(f.t * 1.4) * f.motion + 0.1 * d * beat;
    bodyRef.current?.setAttribute('transform', `scale(${pulse.toFixed(4)})`);
    const spin = (f.t * (3 + d * 10) * f.motion) % 360;
    const rayScale = 1 + 0.12 * d + 0.22 * d * beat;
    raysRef.current?.setAttribute('transform', `rotate(${spin.toFixed(2)}) scale(${rayScale.toFixed(3)})`);
    glowRef.current?.setAttribute('opacity', (0.38 + 0.5 * d * (0.4 + 0.6 * beat)).toFixed(3));
    // Expression crossfade: content → happy → joyful.
    const calm = Math.max(0, 1 - d / 0.4);
    const joy = Math.max(0, (d - 0.55) / 0.35);
    const happy = Math.max(0, 1 - calm - Math.min(1, joy));
    calmRef.current?.setAttribute('opacity', calm.toFixed(3));
    happyRef.current?.setAttribute('opacity', happy.toFixed(3));
    joyRef.current?.setAttribute('opacity', Math.min(1, joy).toFixed(3));
    // A slow blink on the open-eyed face every few seconds.
    const blink = f.motion && (f.t % 5.3) < 0.14 ? 0.15 : 1;
    blinkRef.current?.setAttribute('transform', `translate(0,-6) scale(1,${blink})`);
  });

  const stroke = { stroke: outline, strokeWidth: 5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  return (
    <g transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`} aria-hidden>
      <defs>
        <radialGradient id="lw-sunglow">
          <stop offset="0.35" stopColor="#fff3a8" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff3a8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle ref={glowRef} r={R * 2.9} fill="url(#lw-sunglow)" opacity={0.4} />
      <g ref={bodyRef}>
        <g ref={raysRef}>
          {Array.from({ length: RAYS }, (_, i) => {
            const a = (i / RAYS) * 360;
            const long = i % 2 === 0;
            return (
              <rect
                key={i}
                x={-9}
                y={-(R + (long ? 50 : 40))}
                width={18}
                height={long ? 34 : 24}
                rx={9}
                transform={`rotate(${a})`}
                fill={ray}
                {...stroke}
                strokeWidth={4}
              />
            );
          })}
        </g>
        <circle r={R} fill={face} {...stroke} />
        <ellipse cx={-R * 0.38} cy={-R * 0.5} rx={R * 0.22} ry={R * 0.11} fill="#fff8d6" opacity={0.75} transform={`rotate(-30 ${-R * 0.38} ${-R * 0.5})`} />
        <ellipse cx={-38} cy={14} rx={12} ry={8} fill="#ff8fa3" opacity={0.85} />
        <ellipse cx={38} cy={14} rx={12} ry={8} fill="#ff8fa3" opacity={0.85} />

        {/* content: closed happy eyes, small smile */}
        <g ref={calmRef} fill="none" {...stroke} strokeWidth={4.5}>
          <path d="M-31,-6 q9,-11 18,0" />
          <path d="M13,-6 q9,-11 18,0" />
          <path d="M-13,16 q13,12 26,0" />
        </g>
        {/* happy: open eyes, bigger smile */}
        <g ref={happyRef} opacity={0}>
          <g ref={blinkRef} transform="translate(0,-6)">
            <ellipse cx={-21} cy={0} rx={6} ry={9} fill={outline} />
            <ellipse cx={21} cy={0} rx={6} ry={9} fill={outline} />
            <circle cx={-19} cy={-3} r={2.2} fill="#fff" />
            <circle cx={23} cy={-3} r={2.2} fill="#fff" />
          </g>
          <path d="M-20,14 q20,20 40,0" fill="none" {...stroke} strokeWidth={4.5} />
        </g>
        {/* joyful: squeezed eyes, open singing mouth */}
        <g ref={joyRef} opacity={0}>
          <path d="M-31,-4 l12,-6 l-12,-6" fill="none" {...stroke} strokeWidth={4.5} />
          <path d="M31,-4 l-12,-6 l12,-6" fill="none" {...stroke} strokeWidth={4.5} />
          <path d="M-20,10 q20,0 40,0 q-2,24 -20,24 q-18,0 -20,-24Z" fill="#8a2d2d" {...stroke} strokeWidth={4} />
          <path d="M-9,26 q9,-7 18,0 q-4,6 -9,6 q-5,0 -9,-6Z" fill="#ff7a8a" />
        </g>
      </g>
    </g>
  );
}
