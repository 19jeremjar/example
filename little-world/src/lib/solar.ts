import SunCalc from 'suncalc';

export type SkyPhase = 'night' | 'dawn' | 'sunrise' | 'day' | 'sunset' | 'dusk';

export type SolarDay = {
  sunrise: Date | null;
  sunset: Date | null;
  solarNoon: Date;
  dawn: Date | null;
  dusk: Date | null;
  /** Sun altitude at solar noon, degrees. Drives how tall the visual arc is. */
  noonAltitude: number;
};

export type SolarState = {
  now: Date;
  /** Degrees above the horizon (negative below). */
  altitude: number;
  /** Compass bearing in degrees (0 = north, 90 = east). */
  azimuth: number;
  today: SolarDay;
  phase: SkyPhase;
  isMorning: boolean;
  /** 0 at sunrise → 1 at sunset. Unclamped, so slightly <0 / >1 around twilight. */
  dayProgress: number;
  /** 0 at sunset → 1 at next sunrise while the sun is down, else null. */
  nightProgress: number | null;
  polar: 'day' | 'night' | null;
  nextEvent: { kind: 'sunrise' | 'sunset'; at: Date } | null;
};

const DEG = 180 / Math.PI;
const HOUR = 3600_000;
const DAY = 24 * HOUR;

const valid = (d: Date | undefined | null): d is Date => d instanceof Date && !Number.isNaN(d.getTime());

const partsCache = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    partsCache.set(timeZone, f);
  }
  return f;
}

export type LocalParts = { year: number; month: number; day: number; hour: number; minute: number };

/** Calendar date and wall-clock time of an instant in an IANA time zone. */
export function localParts(date: Date, timeZone: string): LocalParts {
  const out: Record<string, number> = {};
  for (const p of formatter(timeZone).formatToParts(date)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return { year: out.year, month: out.month, day: out.day, hour: out.hour % 24, minute: out.minute };
}

/**
 * Solar events for one local calendar day. SunCalc picks the solar transit
 * nearest the instant it is given, so we anchor on approximate local solar
 * noon (12:00 UTC shifted by longitude). That keeps results on the correct
 * day regardless of the location's time zone offset.
 */
export function getSolarDay(year: number, month: number, day: number, lat: number, lon: number): SolarDay {
  const anchor = new Date(Date.UTC(year, month - 1, day, 12) - (lon / 15) * HOUR);
  const t = SunCalc.getTimes(anchor, lat, lon);
  const noonAltitude = SunCalc.getPosition(t.solarNoon, lat, lon).altitude * DEG;
  return {
    sunrise: valid(t.sunrise) ? t.sunrise : null,
    sunset: valid(t.sunset) ? t.sunset : null,
    solarNoon: t.solarNoon,
    dawn: valid(t.dawn) ? t.dawn : null,
    dusk: valid(t.dusk) ? t.dusk : null,
    noonAltitude,
  };
}

function shiftDay(p: LocalParts, delta: number): LocalParts {
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day + delta));
  return { ...p, year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function phaseFor(altitude: number, isMorning: boolean): SkyPhase {
  if (altitude < -12) return 'night';
  if (altitude < -0.833) return isMorning ? 'dawn' : 'dusk';
  if (altitude < 10) return isMorning ? 'sunrise' : 'sunset';
  return 'day';
}

export function computeSolarState(now: Date, lat: number, lon: number, timeZone: string): SolarState {
  const lp = localParts(now, timeZone);
  const today = getSolarDay(lp.year, lp.month, lp.day, lat, lon);
  const pos = SunCalc.getPosition(now, lat, lon);
  const altitude = pos.altitude * DEG;
  const azimuth = (pos.azimuth * DEG + 180 + 360) % 360;
  const t = now.getTime();
  const isMorning = t < today.solarNoon.getTime();

  let dayProgress: number;
  let nightProgress: number | null = null;
  let polar: SolarState['polar'] = null;
  let nextEvent: SolarState['nextEvent'] = null;

  if (today.sunrise && today.sunset && today.sunset > today.sunrise) {
    const sr = today.sunrise.getTime();
    const ss = today.sunset.getTime();
    dayProgress = (t - sr) / (ss - sr);
    if (t < sr) {
      const prev = getSolarDay(...ymd(shiftDay(lp, -1)), lat, lon).sunset;
      if (prev) nightProgress = (t - prev.getTime()) / (sr - prev.getTime());
      nextEvent = { kind: 'sunrise', at: today.sunrise };
    } else if (t > ss) {
      const next = getSolarDay(...ymd(shiftDay(lp, 1)), lat, lon).sunrise;
      if (next) {
        nightProgress = (t - ss) / (next.getTime() - ss);
        nextEvent = { kind: 'sunrise', at: next };
      }
    } else {
      nextEvent = { kind: 'sunset', at: today.sunset };
    }
  } else {
    // Midnight sun or polar night: no sunrise/sunset today. Use the solar clock.
    polar = today.noonAltitude > 0 ? 'day' : 'night';
    const clock = 0.5 + (t - today.solarNoon.getTime()) / DAY;
    const wrapped = ((clock % 1) + 1) % 1;
    dayProgress = polar === 'day' ? wrapped : -1;
    if (polar === 'night') nightProgress = wrapped;
  }

  return {
    now,
    altitude,
    azimuth,
    today,
    phase: phaseFor(altitude, isMorning),
    isMorning,
    dayProgress,
    nightProgress,
    polar,
    nextEvent,
  };
}

function ymd(p: LocalParts): [number, number, number] {
  return [p.year, p.month, p.day];
}

/**
 * Builds the instant for a given local wall-clock time today in a time zone.
 * Used by preview mode ("show me 6:30 PM in Melbourne").
 */
export function instantForLocalTime(base: Date, timeZone: string, minutesOfDay: number): Date {
  const lp = localParts(base, timeZone);
  const h = Math.floor(minutesOfDay / 60);
  const m = Math.round(minutesOfDay % 60);
  // First guess treats the wall time as UTC, then corrects by the zone offset (twice for DST edges).
  let guess = Date.UTC(lp.year, lp.month - 1, lp.day, h, m);
  for (let i = 0; i < 2; i++) {
    const p = localParts(new Date(guess), timeZone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess += Date.UTC(lp.year, lp.month - 1, lp.day, h, m) - asUtc;
  }
  return new Date(guess);
}

export type Viewport = { x0: number; x1: number; y0: number; y1: number };

/** Sun centre at sunrise/sunset: roughly the far hill crest, so it peeks over the hills. */
export const HORIZON_Y = 548;

/**
 * Stylised arc position: x follows progress across the visible width, height
 * follows sin(π·progress) scaled by how high the sun climbs at noon today, so
 * summer arcs are tall and winter arcs are low. Artistic, not a projection.
 */
export function arcPoint(progress: number, noonAltitude: number, vp: Viewport, peakScale = 1) {
  const width = vp.x1 - vp.x0;
  const margin = width * 0.09;
  const x = vp.x0 + margin + progress * (width - margin * 2);
  const top = vp.y0 + 115;
  const heightFactor = Math.min(1, Math.max(0.45, noonAltitude / 75)) * peakScale;
  const lift = (HORIZON_Y - top) * heightFactor * Math.sin(Math.PI * progress);
  // Below the horizon (twilight) sin() goes negative, so it sinks behind the hills.
  return { x, y: HORIZON_Y - lift * (lift < 0 ? 3 : 1) };
}
