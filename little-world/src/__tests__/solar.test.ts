import { describe, expect, it } from 'vitest';
import { LOCATIONS, findLocation, locationFromCoords } from '../lib/locations';
import { arcPoint, computeSolarState, getSolarDay, instantForLocalTime, localParts, phaseFor } from '../lib/solar';
import { paletteForSun, PALETTES } from '../data/palettes';

const mel = findLocation('melbourne')!;
const minutesLocal = (d: Date, tz: string) => {
  const p = localParts(d, tz);
  return p.hour * 60 + p.minute;
};
const within = (actual: number, expected: number, tol: number) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);

describe('solar calculations', () => {
  it('Melbourne, 3 Nov 2026 (AEDT): sunrise ~6:12 AM, sunset ~7:57 PM', () => {
    const day = getSolarDay(2026, 11, 3, mel.lat, mel.lon);
    within(minutesLocal(day.sunrise!, mel.timeZone), 6 * 60 + 12, 6);
    within(minutesLocal(day.sunset!, mel.timeZone), 19 * 60 + 57, 6);
    // Calendar day is preserved despite the +11h offset.
    expect(localParts(day.sunrise!, mel.timeZone).day).toBe(3);
    expect(localParts(day.sunset!, mel.timeZone).day).toBe(3);
  });

  it('Melbourne midwinter (21 Jun, AEST): sunrise ~7:35 AM, sunset ~5:08 PM, lower noon sun', () => {
    const winter = getSolarDay(2026, 6, 21, mel.lat, mel.lon);
    within(minutesLocal(winter.sunrise!, mel.timeZone), 7 * 60 + 35, 6);
    within(minutesLocal(winter.sunset!, mel.timeZone), 17 * 60 + 8, 6);
    const summer = getSolarDay(2026, 12, 21, mel.lat, mel.lon);
    expect(summer.noonAltitude).toBeGreaterThan(70);
    expect(winter.noonAltitude).toBeLessThan(30);
  });

  it('respects daylight saving: Melbourne solar noon shifts by ~1h across the April change', () => {
    const before = getSolarDay(2026, 4, 4, mel.lat, mel.lon);
    const after = getSolarDay(2026, 4, 6, mel.lat, mel.lon);
    const diff = minutesLocal(before.solarNoon, mel.timeZone) - minutesLocal(after.solarNoon, mel.timeZone);
    within(diff, 60, 4);
  });

  it('London 21 Jun: sunrise ~4:43 AM BST, sunset ~9:21 PM BST', () => {
    const l = findLocation('london')!;
    const d = getSolarDay(2026, 6, 21, l.lat, l.lon);
    within(minutesLocal(d.sunrise!, l.timeZone), 4 * 60 + 43, 6);
    within(minutesLocal(d.sunset!, l.timeZone), 21 * 60 + 21, 6);
  });

  it('works on the far side of the date line (Honolulu, Auckland)', () => {
    for (const id of ['honolulu', 'auckland']) {
      const l = findLocation(id)!;
      const now = new Date('2026-11-03T02:00:00Z');
      const s = computeSolarState(now, l.lat, l.lon, l.timeZone);
      const lp = localParts(now, l.timeZone);
      expect(localParts(s.today.solarNoon, l.timeZone).day).toBe(lp.day);
      within(minutesLocal(s.today.solarNoon, l.timeZone), 12 * 60 + 30, 75);
    }
  });

  it('day progress is 0 at sunrise, ~0.5 at solar noon, 1 at sunset', () => {
    const day = getSolarDay(2026, 11, 3, mel.lat, mel.lon);
    const at = (d: Date) => computeSolarState(d, mel.lat, mel.lon, mel.timeZone);
    within(at(day.sunrise!).dayProgress, 0, 0.001);
    within(at(day.solarNoon).dayProgress, 0.5, 0.02);
    within(at(day.sunset!).dayProgress, 1, 0.001);
    const s = at(day.solarNoon);
    expect(s.phase).toBe('day');
    expect(s.nextEvent?.kind).toBe('sunset');
  });

  it('at night reports night progress and the next sunrise', () => {
    const night = computeSolarState(new Date('2026-11-03T12:30:00Z'), mel.lat, mel.lon, mel.timeZone); // 11:30 PM local
    expect(night.phase).toBe('night');
    expect(night.nightProgress).toBeGreaterThan(0);
    expect(night.nightProgress).toBeLessThan(0.5);
    expect(night.nextEvent?.kind).toBe('sunrise');
    expect(localParts(night.nextEvent!.at, mel.timeZone).day).toBe(4);
    const early = computeSolarState(new Date('2026-11-03T16:00:00Z'), mel.lat, mel.lon, mel.timeZone); // 3 AM local on the 4th
    expect(early.nextEvent?.kind).toBe('sunrise');
    expect(early.nightProgress).toBeGreaterThan(0.5);
  });

  it('handles midnight sun and polar night without throwing', () => {
    const summer = computeSolarState(new Date('2026-06-21T12:00:00Z'), 78.22, 15.65, 'Arctic/Longyearbyen');
    expect(summer.polar).toBe('day');
    expect(summer.dayProgress).toBeGreaterThanOrEqual(0);
    const winter = computeSolarState(new Date('2026-12-21T12:00:00Z'), 78.22, 15.65, 'Arctic/Longyearbyen');
    expect(winter.polar).toBe('night');
    expect(winter.nextEvent).toBeNull();
  });

  it('every curated city resolves a valid solar state', () => {
    for (const l of LOCATIONS) {
      const s = computeSolarState(new Date('2026-11-03T00:00:00Z'), l.lat, l.lon, l.timeZone);
      expect(Number.isFinite(s.altitude)).toBe(true);
      expect(s.today.sunrise).not.toBeNull();
    }
  });

  it('instantForLocalTime builds the right wall-clock time, including DST zones', () => {
    const base = new Date('2026-11-03T02:00:00Z');
    const d = instantForLocalTime(base, mel.timeZone, 18 * 60 + 30);
    const p = localParts(d, mel.timeZone);
    expect([p.day, p.hour, p.minute]).toEqual([3, 18, 30]);
    const ny = instantForLocalTime(base, 'America/New_York', 7 * 60);
    expect(localParts(ny, 'America/New_York').hour).toBe(7);
  });

  it('phases follow sun altitude', () => {
    expect(phaseFor(-20, true)).toBe('night');
    expect(phaseFor(-5, true)).toBe('dawn');
    expect(phaseFor(3, true)).toBe('sunrise');
    expect(phaseFor(30, false)).toBe('day');
    expect(phaseFor(3, false)).toBe('sunset');
    expect(phaseFor(-5, false)).toBe('dusk');
  });

  it('arc peaks in the middle and is lower on short winter days', () => {
    const vp = { x0: 0, x1: 1600, y0: 0, y1: 900 };
    const rise = arcPoint(0, 70, vp);
    const noon = arcPoint(0.5, 70, vp);
    const set = arcPoint(1, 70, vp);
    expect(noon.y).toBeLessThan(rise.y);
    expect(set.x).toBeGreaterThan(noon.x);
    expect(arcPoint(0.5, 25, vp).y).toBeGreaterThan(noon.y);
    expect(arcPoint(-0.05, 70, vp).y).toBeGreaterThan(rise.y);
  });

  it('palette blends continuously through the day', () => {
    expect(paletteForSun(40, true)).toEqual(PALETTES.day);
    expect(paletteForSun(-20, false)).toEqual(PALETTES.night);
    expect(paletteForSun(0, true).skyTop).toBe(PALETTES.sunrise.skyTop);
    expect(paletteForSun(0, false).skyTop).toBe(PALETTES.sunset.skyTop);
    const mid = paletteForSun(-5, false);
    expect(mid.night).toBeGreaterThan(0.1);
    expect(mid.night).toBeLessThan(1);
  });

  it('device location rounds coordinates and borrows a nearby city name', () => {
    const l = locationFromCoords(-37.81234, 144.96789, 'Australia/Melbourne');
    expect(l.lat).toBe(-37.81);
    expect(l.lon).toBe(144.97);
    expect(l.label).toBe('MELBOURNE');
    expect(locationFromCoords(0, 0, 'UTC').label).toBe('HERE');
  });
});
