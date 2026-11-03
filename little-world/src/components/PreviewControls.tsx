import type { WorldLocation } from '../lib/locations';
import { SolarState, localParts } from '../lib/solar';
import { useEngineSnapshot } from '../hooks/useSoundEnergy';

type Props = {
  solar: SolarState;
  location: WorldLocation;
  minutes: number;
  energy: number;
  onMinutes: (m: number) => void;
  onEnergy: (e: number) => void;
  onLive: () => void;
};

function fmt(min: number) {
  const h = Math.floor(min / 60) % 24;
  const m = Math.floor(min % 60);
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function PreviewControls({ solar, location, minutes, energy, onMinutes, onEnergy, onLive }: Props) {
  const snap = useEngineSnapshot(true);
  const toMin = (d: Date | null) => {
    if (!d) return null;
    const p = localParts(d, location.timeZone);
    return p.hour * 60 + p.minute;
  };
  const t = solar.today;
  const jumps: [string, number | null][] = [
    ['Dawn', toMin(t.dawn)],
    ['Sunrise', toMin(t.sunrise)],
    ['Noon', toMin(t.solarNoon)],
    ['Sunset', toMin(t.sunset)],
    ['Dusk', toMin(t.dusk)],
    ['Night', 23 * 60],
  ];

  return (
    <section className="lw-preview lw-card" aria-label="Preview controls">
      <header className="lw-picker-head">
        <h2 className="lw-title">Preview</h2>
        <span className="lw-count">Simulated only — your clock and mic are untouched</span>
        <button className="lw-btn lw-btn-primary" onClick={onLive}>
          Return to live
        </button>
      </header>
      <label className="lw-slider lw-wide">
        <span>
          Time of day in {location.label}: <strong>{fmt(minutes)}</strong> · {solar.phase} · sun {solar.altitude.toFixed(1)}°
        </span>
        <input type="range" min={0} max={1439} step={1} value={minutes} onChange={(e) => onMinutes(Number(e.target.value))} />
      </label>
      <div className="lw-row lw-wrap">
        {jumps.map(([name, m]) => (
          <button key={name} className="lw-btn lw-btn-small" disabled={m == null} onClick={() => m != null && onMinutes(m)}>
            {name}
          </button>
        ))}
      </div>
      <label className="lw-slider lw-wide">
        <span>
          Sound intensity: <strong>{Math.round(energy * 100)}%</strong> · characters: <strong>{snap ? { quiet: 'idle', moderate: 'groove', loud: 'dance' }[snap.level] : '…'}</strong>
        </span>
        <input type="range" min={0} max={1} step={0.01} value={energy} onChange={(e) => onEnergy(Number(e.target.value))} />
      </label>
      <div className="lw-row lw-wrap">
        <button className="lw-btn lw-btn-small" onClick={() => onEnergy(0.05)}>
          Test idle
        </button>
        <button className="lw-btn lw-btn-small" onClick={() => onEnergy(0.42)}>
          Test groove
        </button>
        <button className="lw-btn lw-btn-small" onClick={() => onEnergy(0.92)}>
          Test dance
        </button>
      </div>
    </section>
  );
}
