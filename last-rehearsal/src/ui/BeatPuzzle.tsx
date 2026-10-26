import { useEffect, useRef, useState } from 'react';
import * as sfx from '../audio/sfx';
import { BEAT, BEAT_STEP_MS, type Drum } from '../config/game';
import { emptySequence, stepSequence, type SequenceState } from '../game/puzzles';
import { Panel } from './Panel';

interface Props {
  solved: boolean;
  onSolved: () => void;
  onClose: () => void;
}

const DRUMS: { id: Drum; label: string; key: string }[] = [
  { id: 'kick', label: 'Kick', key: '1' },
  { id: 'snare', label: 'Snare', key: '2' },
  { id: 'cymbal', label: 'Cymbal', key: '3' },
];

const label = (d: Drum) => DRUMS.find((x) => x.id === d)!.label;

/** Puzzle 3. Listen to the beat (or watch it), then play it back. */
export function BeatPuzzle({ solved, onSolved, onClose }: Props) {
  const [seq, setSeq] = useState<SequenceState<Drum>>(() => (solved ? { input: [...BEAT], status: 'solved' } : emptySequence()));
  const [playing, setPlaying] = useState(false);
  const [lit, setLit] = useState<Drum | null>(null);
  const [heard, setHeard] = useState(solved);
  const [announce, setAnnounce] = useState('');
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const flash = (d: Drum, ms = 220) => {
    setLit(d);
    timers.current.push(window.setTimeout(() => setLit((cur) => (cur === d ? null : cur)), ms));
  };

  /** Play the pattern with lights, `times` times over. */
  const playPattern = (times = 1, then?: () => void) => {
    clearTimers();
    setPlaying(true);
    const steps = Array.from({ length: times }, () => BEAT).flat();
    steps.forEach((d, i) => {
      timers.current.push(
        window.setTimeout(() => {
          sfx.drum(d);
          flash(d, BEAT_STEP_MS * 0.6);
          setAnnounce(label(d));
        }, i * BEAT_STEP_MS),
      );
    });
    timers.current.push(
      window.setTimeout(() => {
        setPlaying(false);
        setLit(null);
        setHeard(true);
        setAnnounce('Your turn.');
        then?.();
      }, steps.length * BEAT_STEP_MS),
    );
  };

  const hit = (d: Drum) => {
    if (playing || seq.status === 'solved') return;
    sfx.drum(d);
    flash(d);
    const next = stepSequence(seq, d, BEAT);
    setSeq(next);
    if (next.status === 'wrong') {
      sfx.buzz();
      setAnnounce('Not quite.');
    } else if (next.status === 'solved') {
      onSolved();
      // Victory lap: the drummer plays it back twice.
      timers.current.push(window.setTimeout(() => playPattern(2), 450));
    }
  };

  const hitRef = useRef(hit);
  hitRef.current = hit;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.repeat) return;
      const d = DRUMS.find((x) => x.key === e.key);
      if (d) hitRef.current(d.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const status =
    seq.status === 'solved'
      ? "That's the beat. The drummer's got it back."
      : seq.status === 'wrong'
        ? "That's not it. Listen again and start from the top."
        : playing
          ? 'Listen…'
          : !heard
            ? 'Press “Play the beat” to hear how it goes.'
            : `Your turn: ${seq.input.length} of ${BEAT.length}.`;

  return (
    <Panel title="Find the beat" eyebrow="Task 3 · Drum kit" onClose={onClose} wide>
      <p className="mb-3 text-sm text-ink/75">Four hits. Watch the lights or listen, then play it back. Keys 1, 2 and 3 work too.</p>

      <div className="mb-3 flex items-center gap-2" aria-hidden="true">
        {BEAT.map((_, i) => (
          <span key={i} className={`beat-dot ${i < seq.input.length ? 'is-filled' : ''}`} />
        ))}
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3" role="group" aria-label="Drums">
        {DRUMS.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`drum-pad drum-${d.id} ${lit === d.id ? 'is-lit' : ''}`}
            onClick={() => hit(d.id)}
            disabled={playing || seq.status === 'solved'}
            aria-keyshortcuts={d.key}
          >
            <span className="drum-pad-face" aria-hidden="true" />
            <span className="font-semibold">{d.label}</span>
            <span className="text-[10px] opacity-60" aria-hidden="true">
              {d.key}
            </span>
          </button>
        ))}
      </div>

      <p role="status" aria-live="polite" className={`mb-2 min-h-[2.5rem] text-sm ${seq.status === 'wrong' ? 'text-wall' : ''}`}>
        {status}
      </p>
      <p className="sr-only" aria-live="assertive">
        {announce}
      </p>

      {seq.status === 'solved' ? (
        <button type="button" className="btn-primary w-full" onClick={onClose}>
          Back to the room
        </button>
      ) : (
        <button
          type="button"
          className="btn-secondary w-full"
          disabled={playing}
          onClick={() => {
            setSeq(emptySequence());
            playPattern();
          }}
        >
          {heard ? 'Play it again' : 'Play the beat'}
        </button>
      )}
    </Panel>
  );
}
