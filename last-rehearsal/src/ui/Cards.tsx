import type { Fact } from '../config/content';
import { Panel } from './Panel';

interface FactCardProps {
  fact: Fact;
  helpDone: boolean;
  onHelp?: () => void;
  onClose: () => void;
}

export function FactCard({ fact, helpDone, onHelp, onClose }: FactCardProps) {
  return (
    <Panel title={fact.name} eyebrow={fact.role} onClose={onClose}>
      <blockquote className="speech mb-4">
        <p>“{helpDone && fact.helpWith ? doneLine(fact.helpWith) : fact.line}”</p>
      </blockquote>
      <div className="rounded-lg bg-black/5 p-3 text-sm leading-relaxed">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
          Fact
        </p>
        <p>{fact.fact}</p>
      </div>
      {fact.helpWith && onHelp && !helpDone && (
        <button type="button" className="btn-primary mt-4 w-full" onClick={onHelp}>
          {fact.helpLabel}
        </button>
      )}
    </Panel>
  );
}

const doneLine = (p: 'pedals' | 'beat') => (p === 'pedals' ? "That's the sound. Cheers for that." : "That's the one. I'm not forgetting it again.");

interface InfoCardProps {
  title: string;
  eyebrow: string;
  body: string;
  onClose: () => void;
}

export function InfoCard({ title, eyebrow, body, onClose }: InfoCardProps) {
  return (
    <Panel title={title} eyebrow={eyebrow} onClose={onClose}>
      <p className="leading-relaxed">
        {body}
      </p>
    </Panel>
  );
}
