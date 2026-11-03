import { useEffect, useMemo, useState } from 'react';
import { WorldLocation } from '../lib/locations';
import { SolarState, computeSolarState, instantForLocalTime } from '../lib/solar';

/**
 * Real-time solar state for a location. Re-evaluates every 20 s, and right
 * away when the tab becomes visible again (e.g. after the computer sleeps).
 * When `previewMinutes` is set, it shows that local time today instead,
 * without touching the real clock.
 */
export function useSolarPosition(location: WorldLocation, previewMinutes: number | null): SolarState {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const id = window.setInterval(refresh, 20_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return useMemo(() => {
    const at = previewMinutes == null ? now : instantForLocalTime(now, location.timeZone, previewMinutes);
    return computeSolarState(at, location.lat, location.lon, location.timeZone);
    // Recompute only when the minute changes (or inputs change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(now.getTime() / 60_000), location.lat, location.lon, location.timeZone, previewMinutes]);
}
