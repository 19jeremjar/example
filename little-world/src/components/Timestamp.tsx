import type { WorldLocation } from '../lib/locations';
import type { SolarState } from '../lib/solar';
import type { MicStatus } from '../hooks/useMicrophone';

export function formatTime(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(d).toUpperCase();
}

function formatShort(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(d).toUpperCase();
}

const MIC_LABEL: Partial<Record<MicStatus, string>> = {
  listening: 'Listening',
  calibrating: 'Calibrating',
  paused: 'Paused',
  denied: 'Mic blocked',
  unavailable: 'No mic',
  error: 'Mic error',
};

export function Timestamp({
  solar,
  location,
  showNextEvent,
  preview,
  micStatus,
}: {
  solar: SolarState;
  location: WorldLocation;
  showNextEvent: boolean;
  preview: boolean;
  micStatus: MicStatus;
}) {
  const ev = solar.nextEvent;
  const micLabel = MIC_LABEL[micStatus];
  return (
    <div className="lw-timestamp" aria-live="off">
      <div className="lw-timestamp-place">
        {preview && <span className="lw-preview-tag">PREVIEW</span>}
        {location.label}
      </div>
      <div className="lw-timestamp-time">{formatTime(solar.now, location.timeZone)}</div>
      {showNextEvent && (
        <div className="lw-timestamp-sub">
          {ev
            ? `${ev.kind === 'sunrise' ? 'SUNRISE' : 'SUNSET'} ${formatShort(ev.at, location.timeZone)}`
            : solar.polar === 'day'
              ? 'MIDNIGHT SUN'
              : solar.polar === 'night'
                ? 'POLAR NIGHT'
                : null}
          {micLabel && (
            <span className={`lw-mic-dot is-${micStatus}`} title={micLabel}>
              <span aria-hidden>●</span> {micLabel.toUpperCase()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
