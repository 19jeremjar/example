import { STORAGE_KEY } from '../config/game';

export type TaskId = 'sound' | 'setlist' | 'beat';
export const TASK_IDS: TaskId[] = ['sound', 'setlist', 'beat'];

export type MotionPref = 'system' | 'reduced' | 'full';

export interface GameState {
  tasks: Record<TaskId, boolean>;
  secrets: string[];
  discoveries: string[];
  revealSeen: boolean;
  soundOn: boolean;
  motion: MotionPref;
}

export type GameAction =
  | { type: 'complete-task'; task: TaskId }
  | { type: 'find-secret'; id: string }
  | { type: 'add-discovery'; id: string }
  | { type: 'reveal-seen' }
  | { type: 'set-sound'; on: boolean }
  | { type: 'set-motion'; motion: MotionPref }
  | { type: 'reset' };

export function initialState(): GameState {
  return {
    tasks: { sound: false, setlist: false, beat: false },
    secrets: [],
    discoveries: [],
    revealSeen: false,
    soundOn: true,
    motion: 'system',
  };
}

const addOnce = (list: string[], id: string) => (list.includes(id) ? list : [...list, id]);

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'complete-task':
      // Completing twice changes nothing, so progress can't be double-counted.
      if (state.tasks[action.task]) return state;
      return { ...state, tasks: { ...state.tasks, [action.task]: true } };
    case 'find-secret': {
      const secrets = addOnce(state.secrets, action.id);
      return secrets === state.secrets ? state : { ...state, secrets };
    }
    case 'add-discovery': {
      const discoveries = addOnce(state.discoveries, action.id);
      return discoveries === state.discoveries ? state : { ...state, discoveries };
    }
    case 'reveal-seen':
      return state.revealSeen ? state : { ...state, revealSeen: true };
    case 'set-sound':
      return { ...state, soundOn: action.on };
    case 'set-motion':
      return { ...state, motion: action.motion };
    case 'reset':
      // Progress goes, but the player's sound and motion settings stay.
      return { ...initialState(), soundOn: state.soundOn, motion: state.motion };
  }
}

export const allTasksDone = (s: GameState) => TASK_IDS.every((t) => s.tasks[t]);
export const tasksDoneCount = (s: GameState) => TASK_IDS.filter((t) => s.tasks[t]).length;

// --- persistence ---------------------------------------------------------

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');

/** Read saved progress, falling back to a fresh game for anything missing or malformed. */
export function loadState(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): GameState {
  const base = initialState();
  if (!storage) return base;
  let raw: unknown;
  try {
    const text = storage.getItem(STORAGE_KEY);
    if (!text) return base;
    raw = JSON.parse(text);
  } catch {
    return base;
  }
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Record<keyof GameState, unknown>>;
  const tasks = (r.tasks && typeof r.tasks === 'object' ? r.tasks : {}) as Record<string, unknown>;
  return {
    tasks: {
      sound: tasks.sound === true,
      setlist: tasks.setlist === true,
      beat: tasks.beat === true,
    },
    secrets: isStringArray(r.secrets) ? [...new Set(r.secrets)] : [],
    discoveries: isStringArray(r.discoveries) ? [...new Set(r.discoveries)] : [],
    revealSeen: r.revealSeen === true,
    soundOn: r.soundOn !== false,
    motion: r.motion === 'reduced' || r.motion === 'full' ? r.motion : 'system',
  };
}

export function saveState(state: GameState, storage: Pick<Storage, 'setItem'> | undefined = safeStorage()) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or full storage: the game still works, it just won't remember.
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}
