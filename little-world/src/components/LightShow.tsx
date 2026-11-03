import { useContext, useRef } from 'react';
import { EngineContext, useFrame } from '../hooks/useSoundEnergy';
import type { Viewport } from '../lib/solar';
import { GROUND_Y } from './Landscape';

/** Party colours; the lights step through these on every beat. */
const COLORS = ['#ff5fa2', '#ffd23f', '#4fd1ff', '#a77bff', '#7fe36a', '#ff9a3c'];
const BEAMS = [0.14, 0.38, 0.62, 0.86];

const smooth = (v: number) => {
  const c = Math.min(1, Math.max(0, v));
  return c * c * (3 - 2 * c);
};

/**
 * Stage lighting that only appears when there's music: sweeping coloured
 * beams and a glow on the meadow that change colour with the beat.
 * Drawn behind the characters.
 */
export function LightBeams({ vp, night }: { vp: Viewport; night: number }) {
  const groupRef = useRef<SVGGElement>(null);
  const beamRefs = useRef<(SVGPathElement | null)[]>([]);
  const stopRefs = useRef<(SVGStopElement | null)[]>([]);
  const glowRef = useRef<SVGEllipseElement>(null);
  const glowStopRef = useRef<SVGStopElement>(null);
  const lastBeat = useRef(-1);
  const vpRef = useRef(vp);
  vpRef.current = vp;
  const nightRef = useRef(night);
  nightRef.current = night;
  const engine = useContext(EngineContext);

  useFrame((f) => {
    const g = groupRef.current;
    if (!g) return;
    const on = smooth((f.drive - 0.12) / 0.55);
    // On machines that can't keep up, skip the beams (the rest of the show stays).
    if (on < 0.01 || engine?.lowDetail) {
      g.setAttribute('visibility', 'hidden');
      return;
    }
    g.setAttribute('visibility', 'visible');
    const boost = 0.75 + 0.5 * nightRef.current; // lights read stronger at night
    g.setAttribute('opacity', (on * boost * (0.55 + 0.45 * f.beat)).toFixed(3));

    if (f.beatIndex !== lastBeat.current) {
      lastBeat.current = f.beatIndex;
      BEAMS.forEach((_, i) => stopRefs.current[i]?.setAttribute('stop-color', COLORS[(f.beatIndex + i * 2) % COLORS.length]));
      glowStopRef.current?.setAttribute('stop-color', COLORS[(f.beatIndex + 1) % COLORS.length]);
    }

    const v = vpRef.current;
    const w = v.x1 - v.x0;
    BEAMS.forEach((pos, i) => {
      const el = beamRefs.current[i];
      if (!el) return;
      const ox = v.x0 + w * pos;
      const base = (pos - 0.5) * -50; // outer beams angle inward
      const sweep = 24 * Math.sin(f.t * (0.8 + f.drive * 0.8) + i * 1.9) + 6 * f.beat * (i % 2 ? 1 : -1);
      el.setAttribute('transform', `translate(${ox.toFixed(1)},${(v.y0 - 40).toFixed(1)}) rotate(${(base + sweep).toFixed(2)})`);
    });
    glowRef.current?.setAttribute('opacity', (0.25 + 0.5 * f.beat).toFixed(3));
    glowRef.current?.setAttribute('rx', ((w / 2) * (0.85 + 0.1 * f.beat)).toFixed(1));
    glowRef.current?.setAttribute('cx', (v.x0 + w / 2).toFixed(1));
  });

  const len = GROUND_Y - vp.y0 + 120;
  return (
    <g ref={groupRef} aria-hidden visibility="hidden" style={{ pointerEvents: 'none' }}>
      <defs>
        {BEAMS.map((_, i) => (
          <linearGradient key={i} id={`lw-beam-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop ref={(el) => (stopRefs.current[i] = el)} offset="0" stopColor={COLORS[i]} stopOpacity="0.38" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        ))}
        <radialGradient id="lw-floorglow">
          <stop ref={glowStopRef} offset="0" stopColor={COLORS[1]} stopOpacity="0.75" />
          <stop offset="1" stopColor={COLORS[1]} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse ref={glowRef} cx={800} cy={GROUND_Y - 10} rx={700} ry={70} fill="url(#lw-floorglow)" opacity={0} />
      {BEAMS.map((_, i) => (
        <path key={i} ref={(el) => (beamRefs.current[i] = el)} d={`M-10,0 L10,0 L170,${len} L-170,${len}Z`} fill={`url(#lw-beam-${i})`} />
      ))}
    </g>
  );
}

/**
 * A colour wash over the whole scene that shifts with the beat, so the
 * lighting itself changes with the music. It is an HTML layer (not part of
 * the SVG) so the browser can blend it on the compositor without redrawing
 * the artwork every frame.
 */
export function LightWash() {
  const ref = useRef<HTMLDivElement>(null);
  const lastBeat = useRef(-1);
  useFrame((f) => {
    const el = ref.current;
    if (!el) return;
    // A quick coloured flash of light on each beat; hidden in between so it costs nothing.
    const level = smooth((f.drive - 0.2) / 0.5) * f.beat * 0.16;
    if (level < 0.008) {
      if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
      return;
    }
    if (f.beatIndex !== lastBeat.current) {
      lastBeat.current = f.beatIndex;
      el.style.backgroundColor = COLORS[(f.beatIndex * 5) % COLORS.length];
    }
    el.style.visibility = 'visible';
    el.style.opacity = level.toFixed(3);
  });
  return <div ref={ref} className="lw-wash" aria-hidden />;
}

type Dancer = { x: number; top: number };
type Note = { on: boolean; x: number; y: number; t0: number; drift: number; big: boolean };

/** Little music notes that pop out above the dancers on the beat. */
export function MusicNotes({ dancers }: { dancers: Dancer[] }) {
  const POOL = 14;
  const notes = useRef<Note[]>(Array.from({ length: POOL }, () => ({ on: false, x: 0, y: 0, t0: 0, drift: 0, big: false })));
  const refs = useRef<(SVGGElement | null)[]>([]);
  const lastBeat = useRef(-1);
  const dancersRef = useRef(dancers);
  dancersRef.current = dancers;
  const LIFE = 2.2;

  useFrame((f) => {
    if (f.beatIndex !== lastBeat.current) {
      lastBeat.current = f.beatIndex;
      const ds = dancersRef.current;
      if (f.drive > 0.3 && ds.length) {
        // One or two notes per beat, more when it's loud.
        const count = 1;
        for (let c = 0; c < count; c++) {
          const slot = notes.current.find((n) => !n.on);
          if (!slot) break;
          const d = ds[(f.beatIndex * 7 + c * 3) % ds.length];
          const r = Math.sin(f.beatIndex * 91.7 + c * 13.1);
          Object.assign(slot, { on: true, x: d.x + r * 50, y: d.top - 10, t0: f.t, drift: r > 0 ? 1 : -1, big: c === 0 && f.drive > 0.65 });
        }
      }
    }
    notes.current.forEach((n, i) => {
      const el = refs.current[i];
      if (!el) return;
      if (!n.on) {
        el.setAttribute('opacity', '0');
        return;
      }
      const a = (f.t - n.t0) / LIFE;
      if (a >= 1 || f.motion === 0) {
        n.on = false;
        el.setAttribute('opacity', '0');
        return;
      }
      const pop = a < 0.12 ? a / 0.12 : 1;
      const s = (n.big ? 1.1 : 0.85) * (0.6 + 0.4 * pop);
      const x = n.x + n.drift * (a * 40 + 10 * Math.sin(a * 9));
      const y = n.y - a * 150;
      el.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${(n.drift * 12 * Math.sin(a * 7)).toFixed(1)}) scale(${s.toFixed(3)})`);
      el.setAttribute('opacity', (a < 0.7 ? 1 : 1 - (a - 0.7) / 0.3).toFixed(3));
    });
  });

  return (
    <g aria-hidden style={{ pointerEvents: 'none' }} fill="#ffffff" fillOpacity={0.85}>
      {Array.from({ length: POOL }, (_, i) => (
        <g key={i} ref={(el) => (refs.current[i] = el)} opacity={0}>
          {i % 2 === 0 ? (
            // ♪
            <>
              <rect x={3} y={-36} width={5} height={36} rx={2} />
              <path d="M6,-36 q16,6 13,22 q-4,-10 -13,-12z" />
              <ellipse cx={-3} cy={1} rx={10} ry={7.5} transform="rotate(-22 -3 1)" />
            </>
          ) : (
            // ♫
            <>
              <rect x={-8} y={-28} width={5} height={30} rx={2} />
              <rect x={17} y={-34} width={5} height={30} rx={2} />
              <path d="M-8,-30 L22,-38 L22,-29 L-8,-21Z" />
              <ellipse cx={-14} cy={3} rx={9} ry={7} transform="rotate(-22 -14 3)" />
              <ellipse cx={11} cy={-3} rx={9} ry={7} transform="rotate(-22 11 -3)" />
            </>
          )}
        </g>
      ))}
    </g>
  );
}
