import { useState } from 'react';
import { SECRETS } from '../config/content';
import type { Hotspot } from '../config/hotspots';
import type { GameState, MotionPref } from '../game/state';
import { Panel, PlaceholderTag } from './Panel';
import { SetlistPaper } from './SetlistPuzzle';

interface ObjectListProps {
  hotspots: Hotspot[];
  state: GameState;
  onPick: (h: Hotspot) => void;
  onClose: () => void;
}

const GROUPS: { title: string; kinds: Hotspot['kind'][] }[] = [
  { title: 'Tasks', kinds: ['puzzle'] },
  { title: 'The band', kinds: ['character'] },
  { title: 'Around the room', kinds: ['secret', 'prop'] },
];

/** Every interactive object as a plain list, for anyone who'd rather not drag a 3D camera around. */
export function ObjectList({ hotspots, state, onPick, onClose }: ObjectListProps) {
  const done = (h: Hotspot) => {
    const a = h.action;
    if (a.type === 'puzzle') return state.tasks[a.puzzle === 'pedals' ? 'sound' : a.puzzle];
    if (a.type === 'secret') return state.secrets.includes(a.secretId);
    return false;
  };
  return (
    <Panel title="Everything in the room" eyebrow="Object list" onClose={onClose} closeLabel="Close">
      {GROUPS.map((g) => (
        <div key={g.title} className="mb-4">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">{g.title}</h3>
          <ul className="grid gap-2">
            {hotspots
              .filter((h) => g.kinds.includes(h.kind))
              .map((h) => (
                <li key={h.id}>
                  <button type="button" className="list-item" onClick={() => onPick(h)}>
                    <span>{h.label}</span>
                    {done(h) && (
                      <span className="text-sm text-green-800" aria-label="done">
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </Panel>
  );
}

export function Discoveries({ state, onClose }: { state: GameState; onClose: () => void }) {
  const total = Object.keys(SECRETS).length;
  const found = state.secrets.filter((id) => SECRETS[id]);
  return (
    <Panel title="Discoveries" eyebrow={`${found.length} of ${total} secrets found`} onClose={onClose} closeLabel="Close">
      {state.discoveries.includes('setlist') ? (
        <div className="mb-4">
          <SetlistPaper />
        </div>
      ) : (
        <p className="mb-4 rounded-lg border border-dashed border-ink/25 p-3 text-sm text-ink/70">The setlist is still missing.</p>
      )}
      {found.length === 0 ? (
        <p className="text-sm text-ink/70">No secrets yet. Tap the things around the room. Some of them have stories.</p>
      ) : (
        <ul className="grid gap-3">
          {found.map((id) => (
            <li key={id} className="rounded-lg bg-black/5 p-3 text-sm">
              <p className="font-semibold">{SECRETS[id].title}</p>
              <p>
                {SECRETS[id].body.text} <PlaceholderTag show={!SECRETS[id].body.approved} />
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

interface SettingsProps {
  state: GameState;
  showHotspots: boolean;
  onSound: (on: boolean) => void;
  onMotion: (m: MotionPref) => void;
  onShowHotspots: (on: boolean) => void;
  onReset: () => void;
  onClose: () => void;
}

export function Settings({ state, showHotspots, onSound, onMotion, onShowHotspots, onReset, onClose }: SettingsProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Panel title="Settings" eyebrow="The Last Rehearsal" onClose={onClose} closeLabel="Close">
      <div className="grid gap-4">
        <Toggle label="Sound" checked={state.soundOn} onChange={onSound} />
        <Toggle label="Outline everything you can tap" checked={showHotspots} onChange={onShowHotspots} />
        <fieldset>
          <legend className="mb-2 font-medium">Motion</legend>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['system', 'Device setting'],
                ['reduced', 'Reduced'],
                ['full', 'Full'],
              ] as [MotionPref, string][]
            ).map(([value, text]) => (
              <label key={value} className={`choice ${state.motion === value ? 'is-checked' : ''}`}>
                <input type="radio" name="motion" className="sr-only" checked={state.motion === value} onChange={() => onMotion(value)} />
                {text}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="border-t border-ink/10 pt-4">
          {!confirming ? (
            <button type="button" className="btn-secondary w-full" onClick={() => setConfirming(true)}>
              Reset game
            </button>
          ) : (
            <div className="grid gap-2">
              <p className="text-sm">Start over? Your tasks and discoveries will be cleared.</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="btn-secondary" onClick={() => setConfirming(false)}>
                  Keep playing
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setConfirming(false);
                    onReset();
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="font-medium">{label}</span>
      <input type="checkbox" role="switch" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
