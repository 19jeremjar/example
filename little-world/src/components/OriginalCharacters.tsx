import type { Ref } from 'react';

/**
 * Two original placeholder characters, drawn on a 200×260 canvas with feet
 * on the bottom edge. `eyesRef` lets the animation system make them blink.
 */
type Props = { eyesRef?: Ref<SVGGElement>; outline?: string };

const S = (o: string, w = 6) => ({ stroke: o, strokeWidth: w, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const });

export function Pip({ eyesRef, outline = '#3a2a1c' }: Props) {
  return (
    <g>
      {/* leaves */}
      <path d="M100,104 C96,70 70,52 44,62 C52,90 78,104 100,104Z" fill="#7fd34e" {...S(outline, 5)} />
      <path d="M100,104 C106,66 136,48 160,58 C152,90 124,104 100,104Z" fill="#8de05b" {...S(outline, 5)} />
      <path d="M58,68 C72,74 84,86 96,100 M146,64 C132,72 118,84 104,100" fill="none" stroke="#4c9c33" strokeWidth={3} strokeLinecap="round" />
      {/* feet */}
      <ellipse cx={72} cy={248} rx={24} ry={12} fill="#e8825f" {...S(outline, 5)} />
      <ellipse cx={128} cy={248} rx={24} ry={12} fill="#e8825f" {...S(outline, 5)} />
      {/* arms */}
      <path d="M38,170 C18,176 14,196 24,204 C34,208 44,196 48,186" fill="#ffc96a" {...S(outline, 5)} />
      <path d="M162,170 C182,176 186,196 176,204 C166,208 156,196 152,186" fill="#ffc96a" {...S(outline, 5)} />
      {/* body */}
      <path d="M100,98 C152,98 172,140 172,178 C172,222 140,244 100,244 C60,244 28,222 28,178 C28,140 48,98 100,98Z" fill="#ffd27a" {...S(outline)} />
      <ellipse cx={100} cy={196} rx={42} ry={36} fill="#fff1c9" />
      <ellipse cx={72} cy={122} rx={16} ry={8} fill="#fff6dc" opacity={0.8} transform="rotate(-25 72 122)" />
      {/* face */}
      <g ref={eyesRef} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <ellipse cx={78} cy={156} rx={8} ry={11} fill={outline} />
        <ellipse cx={122} cy={156} rx={8} ry={11} fill={outline} />
        <circle cx={81} cy={152} r={3} fill="#fff" />
        <circle cx={125} cy={152} r={3} fill="#fff" />
      </g>
      <ellipse cx={58} cy={176} rx={12} ry={7} fill="#ff8fa3" opacity={0.85} />
      <ellipse cx={142} cy={176} rx={12} ry={7} fill="#ff8fa3" opacity={0.85} />
      <path d="M88,176 Q100,192 112,176" fill="#c2453d" {...S(outline, 4.5)} />
    </g>
  );
}

export function Mochi({ eyesRef, outline = '#3a2a1c' }: Props) {
  return (
    <g>
      {/* ears */}
      <path d="M66,110 C46,74 48,26 66,18 C86,12 92,60 90,104Z" fill="#d6c8ff" {...S(outline)} />
      <path d="M134,110 C154,74 152,26 134,18 C114,12 108,60 110,104Z" fill="#d6c8ff" {...S(outline)} />
      <path d="M70,96 C60,70 60,40 68,32 C78,40 80,74 80,96Z" fill="#ffc4dd" />
      <path d="M130,96 C140,70 140,40 132,32 C122,40 120,74 120,96Z" fill="#ffc4dd" />
      {/* feet */}
      <ellipse cx={70} cy={249} rx={26} ry={11} fill="#c6b5f7" {...S(outline, 5)} />
      <ellipse cx={130} cy={249} rx={26} ry={11} fill="#c6b5f7" {...S(outline, 5)} />
      {/* body */}
      <path d="M100,86 C160,86 182,136 182,180 C182,226 146,246 100,246 C54,246 18,226 18,180 C18,136 40,86 100,86Z" fill="#e6dcff" {...S(outline)} />
      <ellipse cx={66} cy={116} rx={18} ry={9} fill="#ffffff" opacity={0.75} transform="rotate(-28 66 116)" />
      {/* scarf */}
      <path d="M30,190 C70,206 130,206 170,190 L172,210 C130,226 70,226 28,210Z" fill="#ff7f6e" {...S(outline, 5)} />
      <path d="M134,212 L152,248 L168,240 L154,206Z" fill="#ff7f6e" {...S(outline, 5)} />
      <path d="M60,206 l0,10 M84,210 l0,10 M108,210 l0,10" stroke="#ffd0c8" strokeWidth={4} strokeLinecap="round" />
      {/* face */}
      <g ref={eyesRef} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <circle cx={78} cy={150} r={8.5} fill={outline} />
        <circle cx={122} cy={150} r={8.5} fill={outline} />
        <circle cx={80.5} cy={147} r={2.8} fill="#fff" />
        <circle cx={124.5} cy={147} r={2.8} fill="#fff" />
      </g>
      <ellipse cx={60} cy={168} rx={11} ry={6.5} fill="#ff9cc0" opacity={0.85} />
      <ellipse cx={140} cy={168} rx={11} ry={6.5} fill="#ff9cc0" opacity={0.85} />
      <path d="M90,166 q5,7 10,0 q5,7 10,0" fill="none" {...S(outline, 4)} />
    </g>
  );
}

export const ORIGINAL_ART: Record<string, (p: Props) => JSX.Element> = { pip: Pip, mochi: Mochi };
