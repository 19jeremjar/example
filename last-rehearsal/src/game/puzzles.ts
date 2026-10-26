// Pure puzzle rules, kept apart from the UI so they can be tested directly.

export type SequenceStatus = 'idle' | 'progress' | 'wrong' | 'solved';

export interface SequenceState<T> {
  input: T[];
  status: SequenceStatus;
}

export const emptySequence = <T>(): SequenceState<T> => ({ input: [], status: 'idle' });

/**
 * Add one step to a sequence the player is entering. A wrong step clears the
 * input and reports 'wrong'; matching the whole solution reports 'solved'.
 * Once solved, further input is ignored.
 */
export function stepSequence<T>(state: SequenceState<T>, step: T, solution: readonly T[]): SequenceState<T> {
  if (state.status === 'solved') return state;
  const input = [...state.input, step];
  const ok = input.every((v, i) => v === solution[i]);
  if (!ok) return { input: [], status: 'wrong' };
  if (input.length === solution.length) return { input, status: 'solved' };
  return { input, status: 'progress' };
}

// --- pizza boxes ---------------------------------------------------------

export type ItemId = 'crust' | 'napkin' | 'slice' | 'setlist' | 'receipt' | 'olive' | 'pick';

export interface PizzaItem {
  id: ItemId;
  label: string;
  /** Can be pushed aside to see what's underneath. */
  movable: boolean;
  /** Line shown when the player inspects it. */
  note: string;
}

export interface PizzaBox {
  id: string;
  label: string;
  open: boolean;
  /** Top of the pile first. */
  items: PizzaItem[];
}

const item = (id: ItemId, label: string, note: string, movable = true): PizzaItem => ({ id, label, movable, note });

export function initialBoxes(): PizzaBox[] {
  return [
    { id: 'box-1', label: 'Box 1', open: false, items: [item('crust', 'Crusts', 'Just crusts. Somebody only eats the middle.')] },
    {
      id: 'box-2',
      label: 'Box 2',
      open: false,
      items: [item('napkin', 'Greasy napkin', 'A napkin, very well used.'), item('receipt', 'Receipt', 'Four pizzas. One salad. The salad is still in the fridge.', false)],
    },
    {
      id: 'box-3',
      label: 'Box 3',
      open: false,
      items: [
        item('slice', 'Last slice', 'The last slice. Nobody has claimed it. Move it carefully.'),
        item('setlist', 'Folded paper', "Tomato sauce, a coffee ring… and tonight's setlist!", false),
      ],
    },
    {
      id: 'box-4',
      label: 'Box 4',
      open: false,
      items: [item('olive', 'One olive', 'A single olive. It has been judging everyone all evening.', false)],
    },
  ];
}

export function openBox(boxes: PizzaBox[], boxId: string): PizzaBox[] {
  return boxes.map((b) => (b.id === boxId ? { ...b, open: true } : b));
}

export function closeBox(boxes: PizzaBox[], boxId: string): PizzaBox[] {
  return boxes.map((b) => (b.id === boxId ? { ...b, open: false } : b));
}

/** Push the top item of a box aside. Items that can't be moved stay put. */
export function moveTopItem(boxes: PizzaBox[], boxId: string): PizzaBox[] {
  return boxes.map((b) => {
    if (b.id !== boxId || !b.open || b.items.length === 0 || !b.items[0].movable) return b;
    return { ...b, items: b.items.slice(1) };
  });
}

/** The setlist can only be collected once it's on top of an open box. */
export function canCollectSetlist(boxes: PizzaBox[], boxId: string): boolean {
  const b = boxes.find((x) => x.id === boxId);
  return !!b && b.open && b.items[0]?.id === 'setlist';
}
