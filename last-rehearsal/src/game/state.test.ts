import { STORAGE_KEY } from '../config/game';
import { allTasksDone, gameReducer, initialState, loadState, saveState, tasksDoneCount } from './state';

describe('gameReducer', () => {
  it('completes a task once and ignores repeats', () => {
    const a = gameReducer(initialState(), { type: 'complete-task', task: 'sound' });
    const b = gameReducer(a, { type: 'complete-task', task: 'sound' });
    expect(a.tasks.sound).toBe(true);
    expect(b).toBe(a);
    expect(tasksDoneCount(b)).toBe(1);
  });

  it('records secrets and discoveries without duplicates', () => {
    let s = initialState();
    s = gameReducer(s, { type: 'find-secret', id: 'stool' });
    s = gameReducer(s, { type: 'find-secret', id: 'stool' });
    s = gameReducer(s, { type: 'add-discovery', id: 'setlist' });
    s = gameReducer(s, { type: 'add-discovery', id: 'setlist' });
    expect(s.secrets).toEqual(['stool']);
    expect(s.discoveries).toEqual(['setlist']);
  });

  it('only counts as finished when all three tasks are done', () => {
    let s = initialState();
    for (const task of ['sound', 'setlist'] as const) {
      s = gameReducer(s, { type: 'complete-task', task });
      expect(allTasksDone(s)).toBe(false);
    }
    s = gameReducer(s, { type: 'complete-task', task: 'beat' });
    expect(allTasksDone(s)).toBe(true);
  });

  it('reset clears progress but keeps sound and motion settings', () => {
    let s = initialState();
    s = gameReducer(s, { type: 'complete-task', task: 'beat' });
    s = gameReducer(s, { type: 'find-secret', id: 'mic' });
    s = gameReducer(s, { type: 'reveal-seen' });
    s = gameReducer(s, { type: 'set-sound', on: false });
    s = gameReducer(s, { type: 'set-motion', motion: 'reduced' });
    const r = gameReducer(s, { type: 'reset' });
    expect(r.tasks).toEqual({ sound: false, setlist: false, beat: false });
    expect(r.secrets).toEqual([]);
    expect(r.revealSeen).toBe(false);
    expect(r.soundOn).toBe(false);
    expect(r.motion).toBe('reduced');
  });
});

describe('persistence', () => {
  it('round-trips through localStorage', () => {
    let s = gameReducer(initialState(), { type: 'complete-task', task: 'setlist' });
    s = gameReducer(s, { type: 'find-secret', id: 'plush' });
    saveState(s);
    expect(loadState()).toEqual(s);
  });

  it('falls back to a fresh game for corrupt or hostile data', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadState()).toEqual(initialState());
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks: { sound: 'yes', beat: true }, secrets: [1, 'x'], motion: 'warp' }));
    const s = loadState();
    expect(s.tasks).toEqual({ sound: false, setlist: false, beat: true });
    expect(s.secrets).toEqual([]);
    expect(s.motion).toBe('system');
  });

  it('survives storage that throws', () => {
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); } };
    expect(loadState(broken)).toEqual(initialState());
    expect(() => saveState(initialState(), broken)).not.toThrow();
  });
});
