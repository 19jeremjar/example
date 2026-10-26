import { useState } from 'react';
import * as sfx from '../audio/sfx';
import { SETLIST } from '../config/content';
import { canCollectSetlist, closeBox, initialBoxes, moveTopItem, openBox, type PizzaBox } from '../game/puzzles';
import { Panel } from './Panel';

interface Props {
  solved: boolean;
  onSolved: () => void;
  onClose: () => void;
}

/** Puzzle 2. Open the pizza boxes, move what's in the way, find the setlist. */
export function SetlistPuzzle({ solved, onSolved, onClose }: Props) {
  const [boxes, setBoxes] = useState<PizzaBox[]>(initialBoxes);
  const [note, setNote] = useState("Four boxes. Mostly empty. One of them is hiding something.");
  const [found, setFound] = useState(solved);

  const open = (b: PizzaBox) => {
    sfx.click();
    setBoxes((bs) => openBox(bs, b.id));
    setNote(b.items.length ? `${b.label}: ${b.items[0].label.toLowerCase()} on top.` : `${b.label}: just cardboard.`);
  };

  const touchTop = (b: PizzaBox) => {
    const top = b.items[0];
    if (!top) return;
    if (canCollectSetlist(boxes, b.id)) {
      sfx.chime();
      setFound(true);
      setNote(top.note);
      onSolved();
      return;
    }
    setNote(top.note);
    if (top.movable) {
      sfx.click();
      setBoxes((bs) => moveTopItem(bs, b.id));
    }
  };

  if (found) {
    return (
      <Panel title="Find the setlist" eyebrow="Task 2 · Pizza boxes" onClose={onClose} wide>
        <p role="status" className="mb-3 text-sm">Found it, under the last slice. Added to your discoveries.</p>
        <SetlistPaper />
        <button type="button" className="btn-primary mt-4 w-full" onClick={onClose}>
          Back to the room
        </button>
      </Panel>
    );
  }

  return (
    <Panel title="Find the setlist" eyebrow="Task 2 · Pizza boxes" onClose={onClose} wide>
      <div className="mb-3 grid grid-cols-2 gap-3">
        {boxes.map((b) => {
          const top = b.items[0];
          return (
            <div key={b.id} className={`pizza-box ${b.open ? 'is-open' : ''}`}>
              {!b.open ? (
                <button type="button" className="pizza-lid" onClick={() => open(b)}>
                  <span className="pizza-lid-label">{b.label}</span>
                  <span className="text-xs opacity-70">Open lid</span>
                </button>
              ) : (
                <div className="flex h-full flex-col gap-2 p-2">
                  {top ? (
                    <button type="button" className={`pizza-item item-${top.id}`} onClick={() => touchTop(b)}>
                      <span aria-hidden="true" className="pizza-item-icon" />
                      <span>
                        {top.id === 'setlist' ? 'Take the paper' : top.movable ? `Move the ${top.label.toLowerCase()}` : `Look at the ${top.label.toLowerCase()}`}
                      </span>
                    </button>
                  ) : (
                    <p className="flex-1 p-2 text-center text-xs opacity-70">Empty.</p>
                  )}
                  <button
                    type="button"
                    className="text-xs underline decoration-dotted underline-offset-2"
                    onClick={() => setBoxes((bs) => closeBox(bs, b.id))}
                  >
                    Close {b.label.toLowerCase()}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p role="status" aria-live="polite" className="min-h-[2.5rem] text-sm">
        {note}
      </p>
    </Panel>
  );
}

export function SetlistPaper() {
  return (
    <figure className="setlist-paper" aria-label="The setlist">
      <p className="mb-2 font-display text-xl uppercase tracking-wider">Setlist · {SETLIST.heading}</p>
      <ol className="list-decimal space-y-1 pl-6 font-display text-lg">
        {SETLIST.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </figure>
  );
}
