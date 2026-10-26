import { BEAT, PEDAL_ORDER, PEDALS } from '../config/game';
import { canCollectSetlist, emptySequence, initialBoxes, moveTopItem, openBox, stepSequence } from './puzzles';

describe('stepSequence', () => {
  it('solves when the full sequence is entered in order', () => {
    let s = emptySequence<string>();
    for (const step of PEDAL_ORDER) s = stepSequence(s, step, PEDAL_ORDER);
    expect(s.status).toBe('solved');
  });

  it('a wrong step clears the input, and you can start again straight away', () => {
    let s = stepSequence(emptySequence<string>(), PEDAL_ORDER[0], PEDAL_ORDER);
    s = stepSequence(s, PEDAL_ORDER[2], PEDAL_ORDER);
    expect(s).toEqual({ input: [], status: 'wrong' });
    s = stepSequence(s, PEDAL_ORDER[0], PEDAL_ORDER);
    expect(s).toEqual({ input: [PEDAL_ORDER[0]], status: 'progress' });
  });

  it('ignores input after solving', () => {
    let s = emptySequence<string>();
    for (const d of BEAT) s = stepSequence(s, d, BEAT);
    expect(stepSequence(s, 'snare', BEAT)).toBe(s);
  });

  it('the pedals are not laid out in solution order', () => {
    expect(PEDALS.map((p) => p.id)).not.toEqual(PEDAL_ORDER);
  });
});

describe('pizza boxes', () => {
  const setlistBox = () => initialBoxes().find((b) => b.items.some((i) => i.id === 'setlist'))!;

  it('hides the setlist under something movable', () => {
    const box = setlistBox();
    expect(box.items[0].id).not.toBe('setlist');
    expect(box.items[0].movable).toBe(true);
  });

  it('needs the box opened and the top item moved before the setlist can be taken', () => {
    const id = setlistBox().id;
    let boxes = initialBoxes();
    expect(canCollectSetlist(boxes, id)).toBe(false);
    boxes = moveTopItem(boxes, id); // closed: nothing moves
    boxes = openBox(boxes, id);
    expect(canCollectSetlist(boxes, id)).toBe(false);
    boxes = moveTopItem(boxes, id);
    expect(canCollectSetlist(boxes, id)).toBe(true);
  });

  it("doesn't move fixed items", () => {
    let boxes = openBox(initialBoxes(), 'box-4');
    boxes = moveTopItem(boxes, 'box-4');
    expect(boxes.find((b) => b.id === 'box-4')!.items).toHaveLength(1);
  });
});
