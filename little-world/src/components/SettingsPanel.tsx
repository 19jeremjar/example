import { useEffect, useRef, useState } from 'react';
import { LOCATIONS } from '../lib/locations';
import type { WorldSettings } from '../hooks/useWorldSettings';
import type { Microphone } from '../hooks/useMicrophone';
import { useEngineSnapshot } from '../hooks/useSoundEnergy';

type Props = {
  settings: WorldSettings;
  mic: Microphone;
  systemReducedMotion: boolean;
  fullscreenSupported: boolean;
  isFullscreen: boolean;
  geoBusy: boolean;
  geoError: string | null;
  onUpdate: (patch: Partial<WorldSettings>) => void;
  onUseMyLocation: () => void;
  onMicToggle: (on: boolean) => void;
  onFullscreen: () => void;
  onEdit: () => void;
  onPreview: () => void;
  onReset: () => void;
  onClose: () => void;
};

const STATUS_TEXT: Record<string, string> = {
  off: 'Off',
  requesting: 'Waiting for permission…',
  calibrating: 'Listening to the room to set a baseline…',
  listening: 'Listening',
  paused: 'Paused while this tab is hidden',
  denied: 'Permission denied',
  unavailable: 'Unavailable',
  error: 'Error',
};

export function SettingsPanel(p: Props) {
  const { settings, mic } = p;
  const [confirmReset, setConfirmReset] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const snap = useEngineSnapshot(mic.status === 'listening');
  const micOn = mic.status !== 'off' && mic.status !== 'denied' && mic.status !== 'unavailable' && mic.status !== 'error';

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && p.onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const motionValue = settings.staticMode === null ? 'system' : settings.staticMode ? 'static' : 'animate';

  return (
    <aside className="lw-settings lw-card" role="dialog" aria-modal="false" aria-labelledby="lw-settings-title">
      <header className="lw-settings-head">
        <h2 id="lw-settings-title" className="lw-pixel">SETTINGS</h2>
        <button ref={closeRef} className="lw-icon-btn" onClick={p.onClose} aria-label="Close settings">
          ✕
        </button>
      </header>

      <div className="lw-settings-body">
        <section>
          <h3>Location</h3>
          <select
            aria-label="Location"
            value={settings.locationId}
            onChange={(e) => p.onUpdate({ locationId: e.target.value })}
          >
            {settings.deviceLocation && <option value="device">{settings.deviceLocation.name}</option>}
            {LOCATIONS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <button className="lw-btn lw-btn-small" onClick={p.onUseMyLocation} disabled={p.geoBusy}>
            {p.geoBusy ? 'Finding you…' : 'Use my location'}
          </button>
          {p.geoError && <p className="lw-error">{p.geoError}</p>}
          <p className="lw-note">Your approximate location (rounded to ~1 km) is used only to work out sunrise and sunset, and stays in this browser.</p>
        </section>

        <section>
          <h3>Microphone</h3>
          <label className="lw-toggle">
            <input type="checkbox" checked={micOn} onChange={(e) => p.onMicToggle(e.target.checked)} />
            <span>{micOn ? 'On' : 'Off'}</span>
            <span className="lw-status">{STATUS_TEXT[mic.status]}</span>
          </label>
          {mic.status === 'calibrating' && (
            <div className="lw-meter" aria-label="Calibration progress">
              <div style={{ width: `${mic.calibrationProgress * 100}%` }} />
            </div>
          )}
          {mic.status === 'listening' && (
            <div className="lw-meter" aria-label="Sound level">
              <div style={{ width: `${(snap?.energy ?? 0) * 100}%` }} />
            </div>
          )}
          {mic.error && <p className="lw-error">{mic.error}</p>}
          {mic.devices.length > 1 && (
            <select aria-label="Microphone device" value={mic.deviceId ?? ''} onChange={(e) => mic.selectDevice(e.target.value || null)}>
              <option value="">Default microphone</option>
              {mic.devices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Microphone ${i + 1}`}
                </option>
              ))}
            </select>
          )}
          <label className="lw-slider">
            <span>Sensitivity: {settings.sensitivity.toFixed(1)}×</span>
            <input
              type="range"
              min={0.3}
              max={3}
              step={0.1}
              value={settings.sensitivity}
              onChange={(e) => p.onUpdate({ sensitivity: Number(e.target.value) })}
            />
          </label>
          <button className="lw-btn lw-btn-small" onClick={mic.recalibrate} disabled={mic.status !== 'listening'}>
            Recalibrate
          </button>
          <p className="lw-note">Sound is analysed live on this device. Nothing is recorded, saved or uploaded.</p>
        </section>

        <section>
          <h3>Display</h3>
          <label className="lw-toggle">
            <input type="checkbox" checked={settings.showTimestamp} onChange={(e) => p.onUpdate({ showTimestamp: e.target.checked })} />
            <span>Show time &amp; location</span>
          </label>
          <label className="lw-toggle">
            <input type="checkbox" checked={settings.showNextEvent} onChange={(e) => p.onUpdate({ showNextEvent: e.target.checked })} />
            <span>Show next sunrise/sunset</span>
          </label>
          <label className="lw-field">
            <span>Motion</span>
            <select
              value={motionValue}
              onChange={(e) => p.onUpdate({ staticMode: e.target.value === 'system' ? null : e.target.value === 'static' })}
            >
              <option value="system">Follow system ({p.systemReducedMotion ? 'reduced' : 'full'})</option>
              <option value="animate">Always animate</option>
              <option value="static">Static artwork</option>
            </select>
          </label>
          <button className="lw-btn lw-btn-small" onClick={p.onFullscreen}>
            {p.isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          </button>
          {!p.fullscreenSupported && <p className="lw-note">This browser can’t go fullscreen from a button. Try F11 (Windows/Linux), ⌃⌘F (Mac), or “Add to Home Screen” on iPhone.</p>}
        </section>

        <section>
          <h3>World</h3>
          <div className="lw-row lw-wrap">
            <button className="lw-btn lw-btn-small" onClick={p.onEdit}>
              Edit characters
            </button>
            <button className="lw-btn lw-btn-small" onClick={p.onPreview}>
              Preview mode
            </button>
          </div>
          {confirmReset ? (
            <div className="lw-row lw-wrap">
              <span>Reset characters and settings?</span>
              <button
                className="lw-btn lw-btn-danger lw-btn-small"
                onClick={() => {
                  p.onReset();
                  setConfirmReset(false);
                }}
              >
                Yes, reset
              </button>
              <button className="lw-btn lw-btn-ghost lw-btn-small" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button className="lw-btn lw-btn-ghost lw-btn-small" onClick={() => setConfirmReset(true)}>
              Reset world
            </button>
          )}
        </section>
      </div>
    </aside>
  );
}
