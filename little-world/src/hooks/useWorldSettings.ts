import { useCallback, useEffect, useState } from 'react';
import { CHARACTERS } from '../data/characters';
import { DEFAULT_LOCATION_ID, WorldLocation, findLocation } from '../lib/locations';
import { CharacterPlacement, sanitizePlacements } from '../lib/placement';

export type WorldSettings = {
  locationId: string;
  /** Set when the user chose "use my location". */
  deviceLocation: WorldLocation | null;
  showTimestamp: boolean;
  showNextEvent: boolean;
  sensitivity: number;
  /** The user turned the microphone on last time (we still never start it without a gesture or prior grant). */
  micWanted: boolean;
  inviteDismissed: boolean;
  /** null = follow the system reduced-motion preference. */
  staticMode: boolean | null;
  placements: CharacterPlacement[];
};

const KEY = 'little-world:v1';

export const DEFAULT_SETTINGS: WorldSettings = {
  locationId: DEFAULT_LOCATION_ID,
  deviceLocation: null,
  showTimestamp: true,
  showNextEvent: true,
  sensitivity: 1,
  micWanted: false,
  inviteDismissed: false,
  staticMode: null,
  placements: [
    { uid: 'default-pip', characterId: 'pip', x: 0.36, scale: 1 },
    { uid: 'default-mochi', characterId: 'mochi', x: 0.62, scale: 1 },
  ],
};

const knownIds = new Set(CHARACTERS.map((c) => c.id));

function load(): WorldSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const s = JSON.parse(raw) as Partial<WorldSettings>;
    const dl = s.deviceLocation;
    const deviceLocation =
      dl && typeof dl.lat === 'number' && typeof dl.lon === 'number' && typeof dl.timeZone === 'string' ? dl : null;
    const locationId =
      typeof s.locationId === 'string' && (findLocation(s.locationId) || (s.locationId === 'device' && deviceLocation))
        ? s.locationId
        : DEFAULT_SETTINGS.locationId;
    return {
      locationId,
      deviceLocation,
      showTimestamp: s.showTimestamp ?? true,
      showNextEvent: s.showNextEvent ?? true,
      sensitivity: typeof s.sensitivity === 'number' ? Math.min(4, Math.max(0.3, s.sensitivity)) : 1,
      micWanted: !!s.micWanted,
      inviteDismissed: !!s.inviteDismissed,
      staticMode: typeof s.staticMode === 'boolean' ? s.staticMode : null,
      placements: Array.isArray(s.placements) ? sanitizePlacements(s.placements, knownIds) : DEFAULT_SETTINGS.placements,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useWorldSettings() {
  const [settings, setSettings] = useState<WorldSettings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable (private mode); settings stay in memory */
    }
  }, [settings]);

  const update = useCallback((patch: Partial<WorldSettings> | ((s: WorldSettings) => Partial<WorldSettings>)) => {
    setSettings((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const location: WorldLocation =
    (settings.locationId === 'device' && settings.deviceLocation) ||
    findLocation(settings.locationId) ||
    findLocation(DEFAULT_LOCATION_ID)!;

  return { settings, update, reset, location };
}
