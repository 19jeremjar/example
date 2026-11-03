import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CharacterPicker } from './components/CharacterPicker';
import { MicInvite } from './components/MicInvite';
import { PreviewControls } from './components/PreviewControls';
import { SettingsPanel } from './components/SettingsPanel';
import { Timestamp } from './components/Timestamp';
import { WorldScene } from './components/WorldScene';
import { findCharacter } from './data/characters';
import { paletteForSun } from './data/palettes';
import { useCharacterAssets } from './hooks/useCharacterAssets';
import { micPermissionGranted, useMicrophone } from './hooks/useMicrophone';
import { useSolarPosition } from './hooks/useSolarPosition';
import { EngineContext, useSoundEnergy } from './hooks/useSoundEnergy';
import { useViewport } from './hooks/useViewport';
import { useWorldSettings } from './hooks/useWorldSettings';
import { locationFromCoords } from './lib/locations';
import { CharacterPlacement, canAdd, clampScale, clampX, makeUid, nextFreeX } from './lib/placement';
import { localParts } from './lib/solar';

type Panel = 'none' | 'settings' | 'edit' | 'preview';

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

function useFullscreen() {
  const supported = typeof document !== 'undefined' && !!document.fullscreenEnabled;
  const [active, setActive] = useState(() => !!document.fullscreenElement);
  useEffect(() => {
    const on = () => setActive(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggle = useCallback(async () => {
    if (!supported) return false;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      return true;
    } catch {
      return false;
    }
  }, [supported]);
  return { supported, active, toggle };
}

/** Hide the on-screen buttons (and cursor) after a few seconds without input. */
function useIdle(ms: number, enabled: boolean): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setIdle(false);
      return;
    }
    let timer = window.setTimeout(() => setIdle(true), ms);
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), ms);
    };
    const evs = ['pointermove', 'pointerdown', 'keydown', 'focusin'] as const;
    evs.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    return () => {
      clearTimeout(timer);
      evs.forEach((e) => window.removeEventListener(e, wake));
    };
  }, [ms, enabled]);
  return idle;
}

export default function App() {
  const { settings, update, reset, location } = useWorldSettings();
  const systemReduced = useReducedMotion();
  const staticMode = settings.staticMode ?? systemReduced;
  const [panel, setPanel] = useState<Panel>('none');
  const [preview, setPreview] = useState<{ minutes: number; energy: number } | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const vp = useViewport(rootRef);
  const solar = useSolarPosition(location, preview?.minutes ?? null);
  const palette = useMemo(() => paletteForSun(solar.altitude, solar.isMorning), [solar.altitude, solar.isMorning]);
  const mic = useMicrophone(settings.sensitivity);
  const engine = useSoundEnergy({ readMic: mic.readEnergy, previewEnergy: preview?.energy ?? null, staticMode });
  const assets = useCharacterAssets();
  const fs = useFullscreen();
  const idle = useIdle(3500, panel === 'none');

  // If the user turned the mic on before and the browser still remembers the
  // grant, resume quietly. Otherwise we wait for an explicit click.
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current || !settings.micWanted) return;
    resumed.current = true;
    micPermissionGranted().then((granted) => granted && mic.start());
  }, [settings.micWanted, mic]);

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.skyTop);
  }, [palette.skyTop]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  const enableMic = async () => {
    update({ inviteDismissed: true, micWanted: true });
    await mic.start();
  };

  const setMic = (on: boolean) => {
    if (on) enableMic();
    else {
      mic.stop();
      update({ micWanted: false });
    }
  };

  const toggleFullscreen = async () => {
    if (!fs.supported) {
      setToast('Fullscreen isn’t available from a button here. Try F11 (Windows/Linux), ⌃⌘F (Mac), or Add to Home Screen.');
      return;
    }
    const ok = await fs.toggle();
    if (!ok) setToast('The browser declined fullscreen. Try F11 (Windows/Linux) or ⌃⌘F (Mac).');
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Location isn’t available in this browser.');
      return;
    }
    setGeoBusy(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        update({ deviceLocation: locationFromCoords(pos.coords.latitude, pos.coords.longitude, tz), locationId: 'device' });
        setGeoBusy(false);
      },
      (err) => {
        setGeoBusy(false);
        setGeoError(err.code === err.PERMISSION_DENIED ? 'Location permission was denied. Pick a city instead.' : 'Couldn’t find your location. Pick a city instead.');
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 3600_000 },
    );
  };

  const updatePlacement = useCallback(
    (uid: string, patch: Partial<CharacterPlacement>) =>
      update((s) => ({
        placements: s.placements.map((p) =>
          p.uid === uid ? { ...p, ...patch, x: clampX(patch.x ?? p.x), scale: clampScale(patch.scale ?? p.scale) } : p,
        ),
      })),
    [update],
  );

  const removePlacement = useCallback(
    (uid: string) => {
      update((s) => ({ placements: s.placements.filter((p) => p.uid !== uid) }));
      setSelectedUid((cur) => (cur === uid ? null : cur));
    },
    [update],
  );

  const addCharacter = (id: string) => {
    if (!findCharacter(id) || !canAdd(settings.placements)) return;
    const uid = makeUid();
    update((s) => (canAdd(s.placements) ? { placements: [...s.placements, { uid, characterId: id, x: nextFreeX(s.placements), scale: 1 }] } : {}));
    setSelectedUid(uid);
  };

  const openPreview = () => {
    const lp = localParts(new Date(), location.timeZone);
    setPreview({ minutes: lp.hour * 60 + lp.minute, energy: 0 });
    setPanel('preview');
  };

  const returnToLive = () => {
    setPreview(null);
    setPanel('none');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, select, textarea')) return;
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === 'Escape' && panel === 'edit') {
        setPanel('none');
        setSelectedUid(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const showInvite = panel === 'none' && !settings.inviteDismissed && mic.status === 'off';
  const editing = panel === 'edit';

  return (
    <EngineContext.Provider value={engine}>
      <div ref={rootRef} className={`lw-root${idle ? ' is-idle' : ''}${staticMode ? ' is-static' : ''}${panel === 'preview' ? ' is-previewing' : ''}`} data-phase={solar.phase}>
        <WorldScene
          solar={solar}
          palette={palette}
          vp={vp}
          placements={settings.placements}
          assets={assets}
          editing={editing}
          selectedUid={selectedUid}
          onSelect={setSelectedUid}
          onMove={updatePlacement}
          onRemove={removePlacement}
        />

        {/* The clock steps aside while the edit/preview panels use the top of the screen. */}
        {settings.showTimestamp && panel !== 'edit' && panel !== 'settings' && (
          <Timestamp solar={solar} location={location} showNextEvent={settings.showNextEvent} preview={!!preview} micStatus={mic.status} />
        )}

        {panel === 'none' && (
          <nav className="lw-controls" aria-label="World controls">
            <button className="lw-icon-btn" onClick={() => setPanel('edit')} aria-label="Edit world" title="Edit world">
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4" />
              </svg>
            </button>
            <button className="lw-icon-btn" onClick={toggleFullscreen} aria-label={fs.active ? 'Exit fullscreen' : 'Fullscreen'} title="Fullscreen (F)">
              <svg viewBox="0 0 24 24" aria-hidden>
                {fs.active ? <path d="M9 4v5H4 M15 4v5h5 M9 20v-5H4 M15 20v-5h5" /> : <path d="M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5" />}
              </svg>
            </button>
            <button className="lw-icon-btn" onClick={() => setPanel('settings')} aria-label="Settings" title="Settings">
              <svg viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="12" r="3.2" />
                <path d="M12 2.8v3 M12 18.2v3 M2.8 12h3 M18.2 12h3 M5.5 5.5l2.1 2.1 M16.4 16.4l2.1 2.1 M5.5 18.5l2.1-2.1 M16.4 7.6l2.1-2.1" />
              </svg>
            </button>
          </nav>
        )}

        {showInvite && <MicInvite onEnable={enableMic} onDismiss={() => update({ inviteDismissed: true })} />}

        {panel === 'settings' && (
          <SettingsPanel
            settings={settings}
            mic={mic}
            systemReducedMotion={systemReduced}
            fullscreenSupported={fs.supported}
            isFullscreen={fs.active}
            geoBusy={geoBusy}
            geoError={geoError}
            onUpdate={update}
            onUseMyLocation={useMyLocation}
            onMicToggle={setMic}
            onFullscreen={toggleFullscreen}
            onEdit={() => setPanel('edit')}
            onPreview={openPreview}
            onReset={() => {
              reset();
              mic.stop();
              setSelectedUid(null);
            }}
            onClose={() => setPanel('none')}
          />
        )}

        {editing && (
          <CharacterPicker
            placements={settings.placements}
            assets={assets}
            selectedUid={selectedUid}
            onAdd={addCharacter}
            onRemove={removePlacement}
            onUpdate={updatePlacement}
            onSelect={setSelectedUid}
            onDone={() => {
              setPanel('none');
              setSelectedUid(null);
            }}
          />
        )}

        {panel === 'preview' && preview && (
          <PreviewControls
            solar={solar}
            location={location}
            minutes={preview.minutes}
            energy={preview.energy}
            onMinutes={(m) => setPreview((p) => (p ? { ...p, minutes: m } : p))}
            onEnergy={(e) => setPreview((p) => (p ? { ...p, energy: e } : p))}
            onLive={returnToLive}
          />
        )}

        {toast && (
          <div className="lw-toast lw-card" role="status">
            {toast}
          </div>
        )}
      </div>
    </EngineContext.Provider>
  );
}
