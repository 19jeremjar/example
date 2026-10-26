import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TOUR, type TourTarget } from '../config/content';

/** Where a HUD control is on screen, found by its data-tour attribute. */
function useTargetRect(target: TourTarget) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    if (!target) {
      setRect(null);
      return;
    }
    const measure = () => setRect(document.querySelector(`[data-tour="${target}"]`)?.getBoundingClientRect() ?? null);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [target]);
  return rect;
}

/**
 * The welcome tour: a few short cards. Some point at a control with a
 * pulsing ring. It sits above everything and blocks the room until it's done.
 */
export function Tour({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const card = useRef<HTMLDivElement>(null);
  const step = TOUR[i];
  const last = i === TOUR.length - 1;
  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const rect = useTargetRect(step.target);

  useEffect(() => {
    card.current?.focus();
  }, [i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-5">
      {rect && (
        <span
          aria-hidden="true"
          className="coach-ring"
          style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }}
        />
      )}
      <div
        ref={card}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className="tour-card w-full max-w-sm rounded-2xl bg-paper p-5 text-ink shadow-2xl outline-none"
        key={i}
      >
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-wall">
          {i + 1} of {TOUR.length}
        </p>
        <h2 id="tour-title" className="mb-2 font-display text-2xl leading-tight">
          {step.title}
        </h2>
        <p id="tour-body" className="mb-5 leading-relaxed">
          {coarse && step.touchBody ? step.touchBody : step.body}
        </p>
        <div className="mb-4 flex justify-center gap-1.5" aria-hidden="true">
          {TOUR.map((_, n) => (
            <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-5 bg-wall' : 'w-1.5 bg-ink/25'}`} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {i === 0 ? (
            <button type="button" className="btn-ghost" onClick={onDone}>
              Skip
            </button>
          ) : (
            <button type="button" className="btn-ghost" onClick={() => setI(i - 1)}>
              Back
            </button>
          )}
          <button type="button" className="btn-primary ml-auto min-w-[8rem]" onClick={() => (last ? onDone() : setI(i + 1))}>
            {last ? "Let's go" : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

export interface ToastMessage {
  id: number;
  text: string;
  tone: 'info' | 'success';
}

const TOAST_MS = 4800;

/** One pop-up at a time, oldest first. Paused while `hold` is true (e.g. during the tour). */
export function useToasts(hold: boolean) {
  const [queue, setQueue] = useState<ToastMessage[]>([]);
  const nextId = useRef(1);
  const current = hold ? null : (queue[0] ?? null);

  const push = useCallback((text: string, tone: ToastMessage['tone'] = 'info') => {
    setQueue((q) => (q.some((t) => t.text === text) ? q : [...q, { id: nextId.current++, text, tone }]));
  }, []);
  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), []);

  useEffect(() => {
    if (!current) return;
    const t = window.setTimeout(dismiss, TOAST_MS);
    return () => window.clearTimeout(t);
  }, [current, dismiss]);

  return { current, push, dismiss };
}

export function Toast({ toast, onDismiss }: { toast: ToastMessage | null; onDismiss: () => void }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4"
      style={{ top: 'calc(env(safe-area-inset-top) + var(--toast-top))' }}
      role="status"
      aria-live="polite"
    >
      {toast && (
        <button
          key={toast.id}
          type="button"
          onClick={onDismiss}
          className={`toast pointer-events-auto flex max-w-md items-start gap-2.5 rounded-2xl px-4 py-3 text-left text-sm shadow-xl backdrop-blur ${
            toast.tone === 'success' ? 'bg-amp text-ink' : 'bg-ink/90 text-paper'
          }`}
          aria-label={`${toast.text} (dismiss)`}
        >
          <span aria-hidden="true" className="mt-px text-base leading-none">
            {toast.tone === 'success' ? '★' : '✦'}
          </span>
          <span>{toast.text}</span>
        </button>
      )}
    </div>
  );
}
