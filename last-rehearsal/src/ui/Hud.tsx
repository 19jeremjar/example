import { useState } from 'react';
import { STORY, TASKS } from '../config/content';
import { CTA } from '../config/game';
import { allTasksDone, tasksDoneCount, type GameState } from '../game/state';

interface HudProps {
  state: GameState;
  /** A panel is open: hide the bottom bar so it doesn't stack under the card. */
  panelOpen: boolean;
  cameraMoved: boolean;
  showGestureHint: boolean;
  onObjects: () => void;
  onDiscoveries: () => void;
  onSettings: () => void;
  onSound: () => void;
  onResetView: () => void;
  onStartRehearsal: () => void;
}

export function Hud(p: HudProps) {
  const [tasksOpen, setTasksOpen] = useState(false);
  const done = tasksDoneCount(p.state);
  const ready = allTasksDone(p.state);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between" style={hudPadding}>
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto">
          <p className="mb-1.5 inline-block rounded-md bg-ink/70 px-2 py-0.5 font-display text-xs uppercase tracking-[0.2em] text-paper backdrop-blur sm:text-sm">
            {STORY.title}
          </p>
          <br />
          <button
            type="button"
            className="chip"
            data-tour="tasks"
            aria-expanded={tasksOpen}
            aria-controls="task-list"
            onClick={() => setTasksOpen((v) => !v)}
          >
            Tasks {done}/3 <span aria-hidden="true">{tasksOpen ? '▴' : '▾'}</span>
          </button>
          {tasksOpen && (
            <ul id="task-list" className="mt-2 w-60 rounded-xl bg-ink/85 p-3 text-sm text-paper shadow-lg backdrop-blur">
              {TASKS.map((t) => {
                const ok = p.state.tasks[t.id];
                return (
                  <li key={t.id} className="flex gap-2 py-1">
                    <span aria-hidden="true" className={ok ? 'text-amp' : 'text-paper/40'}>
                      {ok ? '■' : '□'}
                    </span>
                    <span>
                      <span className={ok ? 'line-through opacity-70' : 'font-medium'}>{t.label}</span>
                      <span className="sr-only">{ok ? ', done' : ', to do'}</span>
                      {!ok && <span className="block text-xs text-paper/60">{t.hint}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button type="button" className="icon-btn" onClick={p.onSound} aria-pressed={p.state.soundOn} aria-label={p.state.soundOn ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on'}>
            {p.state.soundOn ? <SpeakerIcon /> : <MuteIcon />}
          </button>
          <button type="button" className="icon-btn" onClick={p.onSettings} aria-label="Settings">
            <MenuIcon />
          </button>
        </div>
      </div>

      {!p.panelOpen && (
        <div className="flex flex-col items-center gap-3 p-3">
          {ready && (
            <button type="button" className="btn-start pointer-events-auto" onClick={p.onStartRehearsal}>
              {p.state.revealSeen ? 'Play it again' : 'Start rehearsal'}
            </button>
          )}
          {!ready && p.showGestureHint && (
            <p className="gesture-hint rounded-full bg-ink/70 px-4 py-2 text-center text-xs text-paper backdrop-blur">
              <span className="touch-only">Drag to look · Pinch to zoom · Tap to inspect</span>
              <span className="mouse-only">Drag to look · Scroll to zoom · Click to inspect</span>
            </p>
          )}
          <div className="pointer-events-auto flex flex-wrap justify-center gap-2">
            <button type="button" className="chip" data-tour="objects" onClick={p.onObjects}>
              Object list
            </button>
            {p.cameraMoved && (
              <button type="button" className="chip" onClick={p.onResetView}>
                Reset view
              </button>
            )}
            <button type="button" className="chip" data-tour="discoveries" onClick={p.onDiscoveries}>
              Discoveries {p.state.secrets.length + p.state.discoveries.length > 0 ? `· ${p.state.secrets.length + p.state.discoveries.length}` : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const hudPadding = {
  paddingTop: 'env(safe-area-inset-top)',
  paddingBottom: 'env(safe-area-inset-bottom)',
  paddingLeft: 'env(safe-area-inset-left)',
  paddingRight: 'env(safe-area-inset-right)',
};

interface FinalProps {
  phase: 'dark' | 'line' | 'done';
  line: string;
  speaker: string;
  onKeepExploring: () => void;
  onPlayAgain: () => void;
}

/** The last beats of the reveal: Jewel's line, then the end card. */
export function FinalReveal({ phase, line, speaker, onKeepExploring, onPlayAgain }: FinalProps) {
  if (phase === 'dark') return null;
  if (phase === 'line') {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-[18dvh] z-30 flex justify-center px-6" role="status" aria-live="assertive">
        <div className="final-line max-w-md rounded-2xl bg-paper px-6 py-4 text-ink shadow-2xl">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-wall">{speaker}</p>
          <p className="font-display text-2xl">“{line}”</p>
        </div>
      </div>
    );
  }
  // Unset links are hidden in production. In development they show as a reminder to set them.
  const links = [CTA.listen, CTA.live].filter((c) => c.url || import.meta.env.DEV);
  return (
    <div className="final-card fixed inset-0 z-40 flex items-center justify-center bg-ink/70 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="final-title">
      <div className="w-full max-w-sm text-center text-paper">
        <h2 id="final-title" className="mb-2 font-display text-4xl uppercase tracking-[0.12em]">
          {STORY.complete}
        </h2>
        <p className="mb-6 text-paper/75">{STORY.completeBody}</p>
        <div className="grid gap-3">
          {links.map((c, i) =>
            c.url ? (
              <a key={c.label} href={c.url} target="_blank" rel="noopener noreferrer" className={i === 0 ? 'btn-start' : 'btn-outline'} autoFocus={i === 0}>
                {c.label}
              </a>
            ) : (
              <span key={c.label} className={`${i === 0 ? 'btn-start' : 'btn-outline'} flex-col opacity-60`}>
                {c.label}
                <span className="font-body text-[10px] normal-case tracking-normal">Link not set (see .env.example)</span>
              </span>
            ),
          )}
          <button type="button" className="btn-outline" onClick={onKeepExploring} autoFocus={!links[0]?.url}>
            Keep exploring
          </button>
          <button type="button" className="text-sm text-paper/70 underline underline-offset-4" onClick={onPlayAgain}>
            Reset and play again
          </button>
        </div>
      </div>
    </div>
  );
}

const SpeakerIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
  </svg>
);
const MuteIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
    <path d="M17 9l5 6M22 9l-5 6" />
  </svg>
);
const MenuIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
