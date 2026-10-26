import { useEffect, useId, useRef, type ReactNode } from 'react';

interface PanelProps {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  closeLabel?: string;
  children: ReactNode;
  /** Wider card for the puzzles. */
  wide?: boolean;
}

/**
 * The card every inspection, puzzle and menu opens in. On phones it's a
 * bottom sheet that leaves the top of the room visible; on wider screens it
 * sits in the bottom-right corner.
 */
export function Panel({ title, eyebrow, onClose, closeLabel = 'Back', children, wide = false }: PanelProps) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Move focus into the card so keyboard and screen-reader users land on it.
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => previous?.focus?.();
  }, []);

  return (
    <section
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className={`panel-enter pointer-events-auto fixed inset-x-0 bottom-0 z-30 flex max-h-[64dvh] flex-col rounded-t-2xl border border-black/10 bg-paper text-ink shadow-2xl outline-none sm:inset-x-auto sm:bottom-4 sm:right-4 sm:max-h-[min(78dvh,720px)] sm:rounded-2xl ${
        wide ? 'sm:w-[440px]' : 'sm:w-[380px]'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <header className="flex items-start gap-3 px-5 pb-2 pt-4">
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-wall">{eyebrow}</p>}
          <h2 id={titleId} className="font-display text-2xl leading-tight">
            {title}
          </h2>
        </div>
        <button type="button" onClick={onClose} className="btn-ghost -mr-2 shrink-0" aria-label={`${closeLabel}: close ${title}`}>
          <span aria-hidden="true">←</span> {closeLabel}
        </button>
      </header>
      <div className="overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
    </section>
  );
}

export function PlaceholderTag({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      className="ml-1 inline-block rounded border border-dashed border-wall/60 px-1.5 py-px align-middle text-[10px] font-semibold uppercase tracking-wider text-wall"
      title="Placeholder copy, waiting for approved text"
    >
      Placeholder
    </span>
  );
}
