import { useState } from 'react';
import * as sfx from '../audio/sfx';
import { PEDAL_CLUE, PEDAL_ORDER, PEDALS, type PedalId } from '../config/game';
import { emptySequence, stepSequence, type SequenceState } from '../game/puzzles';
import { Panel } from './Panel';

interface Props {
  solved: boolean;
  onSolved: () => void;
  onClose: () => void;
}

/**
 * Puzzle 1. Mitch's floor board has three footswitches that need switching
 * on in the right order. The order is on a note taped to the floor.
 */
export function PedalPuzzle({ solved, onSolved, onClose }: Props) {
  const [seq, setSeq] = useState<SequenceState<PedalId>>(() =>
    solved ? { input: [...PEDAL_ORDER], status: 'solved' } : emptySequence(),
  );
  const [noteOpen, setNoteOpen] = useState(false);

  const press = (id: PedalId) => {
    if (seq.status === 'solved') return;
    // A pedal that's already on stays on; stamping on it again isn't a mistake.
    if (seq.input.includes(id)) {
      sfx.click();
      return;
    }
    const next = stepSequence(seq, id, PEDAL_ORDER);
    setSeq(next);
    if (next.status === 'wrong') sfx.buzz();
    else sfx.click();
    if (next.status === 'solved') {
      sfx.guitarChord(0.15);
      onSolved();
    }
  };

  const isOn = (id: PedalId) => seq.input.includes(id);
  const status =
    seq.status === 'solved'
      ? "Amp's on. That's Mitch's sound."
      : seq.status === 'wrong'
        ? 'Everything cuts out with a horrible hum. Wrong order. All the pedals have switched off.'
        : seq.input.length === 0
          ? 'All three pedals are off. Switch them on in the right order.'
          : `${seq.input.length} of 3 on…`;

  return (
    <Panel title="Fix Mitch's sound" eyebrow="Task 1 · Pedalboard" onClose={onClose} wide>
      <p className="mb-3 text-sm text-ink/75">Mitch's signal runs through three switches on his floor board.</p>

      <div className="mb-4 grid grid-cols-3 gap-3" role="group" aria-label="Pedals">
        {PEDALS.map((p) => {
          const on = isOn(p.id);
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              aria-label={`${p.name} pedal, ${p.colour}${on ? ', on' : ', off'}`}
              onClick={() => press(p.id)}
              disabled={seq.status === 'solved'}
              className={`pedal pedal-${p.id} ${on ? 'is-on' : ''}`}
              style={{ ['--pedal' as string]: p.swatch }}
            >
              <span className="pedal-led" aria-hidden="true" />
              <span className="pedal-display" aria-hidden="true">
                {p.id === 'tune' && <span className="tuner-needle" />}
                {p.id === 'drive' && <span className="drive-flame" />}
                {p.id === 'echo' && (
                  <>
                    <span className="echo-ring" />
                    <span className="echo-ring delay" />
                  </>
                )}
              </span>
              <span className="pedal-name">{p.name}</span>
              <span className="pedal-switch" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <p role="status" aria-live="polite" className={`mb-4 min-h-[2.5rem] text-sm ${seq.status === 'wrong' ? 'text-wall' : ''}`}>
        {status}
      </p>

      {!noteOpen ? (
        <button type="button" className="btn-secondary w-full" onClick={() => setNoteOpen(true)}>
          There's a crumpled note taped to the floor. Read it.
        </button>
      ) : (
        <figure className="sticky-note" aria-label="Note from Mitch">
          <p className="whitespace-pre-line font-display text-lg leading-snug">{PEDAL_CLUE}</p>
        </figure>
      )}

      {seq.status === 'solved' && (
        <button type="button" className="btn-primary mt-4 w-full" onClick={onClose}>
          Back to the room
        </button>
      )}
    </Panel>
  );
}
