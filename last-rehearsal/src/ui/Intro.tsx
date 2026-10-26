import { STORY } from '../config/content';

interface IntroProps {
  progress: number;
  loaded: boolean;
  error: string | null;
  onEnter: () => void;
}

/** Title card. Shown while the scan loads; "Enter the room" is also the tap that unlocks audio. */
export function Intro({ progress, loaded, error, onEnter }: IntroProps) {
  return (
    <div className="intro fixed inset-0 z-50 flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <div className="w-full max-w-md text-center text-paper">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-amp">An interactive rehearsal room</p>
        <h1 id="intro-title" className="mb-4 font-display text-5xl uppercase leading-none tracking-[0.06em] sm:text-6xl">
          {STORY.title}
        </h1>
        <p className="mb-2 text-lg">{STORY.intro}</p>
        <p className="mb-8 text-sm text-paper/70">{STORY.brief}</p>

        {error ? (
          <div role="alert" className="rounded-xl border border-wall/60 bg-black/40 p-4 text-sm">
            <p className="mb-3">The room didn't load. {error}</p>
            <button type="button" className="btn-start" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        ) : loaded ? (
          <button type="button" className="btn-start" onClick={onEnter} autoFocus>
            Enter the room
          </button>
        ) : (
          <div className="mx-auto w-56" role="progressbar" aria-label="Loading the room" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
            <div className="h-1.5 overflow-hidden rounded-full bg-paper/20">
              <div className="h-full rounded-full bg-amp transition-[width] duration-300" style={{ width: `${Math.max(4, progress)}%` }} />
            </div>
            <p className="mt-3 text-xs text-paper/60">Setting up the room… {Math.round(progress)}%</p>
          </div>
        )}
        <p className="mt-8 text-xs text-paper/50">Best with sound on. Every sound is made in your browser.</p>
      </div>
    </div>
  );
}
