export type Palette = {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  hillFar: string;
  hillMid: string;
  meadow: string;
  meadowShade: string;
  grass: string;
  grassDark: string;
  tree: string;
  treeShade: string;
  trunk: string;
  cloud: string;
  cloudShade: string;
  dirt: string;
  dirtDark: string;
  outline: string;
  /** Multiplier applied to characters and flowers (1 = full daylight). */
  light: number;
  /** 0–1 how strongly the night features (stars, moon, fireflies) show. */
  night: number;
};

export const PALETTES: Record<'night' | 'sunrise' | 'day' | 'sunset', Palette> = {
  sunrise: {
    skyTop: '#f4a6bd',
    skyMid: '#ffc9ae',
    skyBottom: '#fff0b8',
    hillFar: '#b7cf9c',
    hillMid: '#9cc782',
    meadow: '#a2cf6c',
    meadowShade: '#88b95a',
    grass: '#9ccc62',
    grassDark: '#5f9746',
    tree: '#8fc46a',
    treeShade: '#6ea653',
    trunk: '#9a6b4a',
    cloud: '#fff6f0',
    cloudShade: '#f7c8cf',
    dirt: '#dcab7c',
    dirtDark: '#b07e5a',
    outline: '#4a3127',
    light: 0.96,
    night: 0,
  },
  day: {
    skyTop: '#3fb0f2',
    skyMid: '#77cdfa',
    skyBottom: '#c8eeff',
    hillFar: '#97d677',
    hillMid: '#78c757',
    meadow: '#80d44d',
    meadowShade: '#64ba3d',
    grass: '#8de05b',
    grassDark: '#4c9c33',
    tree: '#6fcb4c',
    treeShade: '#4fae3a',
    trunk: '#9a6440',
    cloud: '#ffffff',
    cloudShade: '#d3ecfb',
    dirt: '#ddb078',
    dirtDark: '#a97a4c',
    outline: '#3a2a1c',
    light: 1,
    night: 0,
  },
  sunset: {
    skyTop: '#8c7fd2',
    skyMid: '#f2909a',
    skyBottom: '#ffb46a',
    hillFar: '#9aa184',
    hillMid: '#7f9a62',
    meadow: '#93b85a',
    meadowShade: '#7aa14a',
    grass: '#a0c25a',
    grassDark: '#5c823b',
    tree: '#86a85a',
    treeShade: '#6a8c48',
    trunk: '#8c5a44',
    cloud: '#ffd9cc',
    cloudShade: '#e8a0a8',
    dirt: '#cc916c',
    dirtDark: '#985f4e',
    outline: '#43262e',
    light: 0.92,
    night: 0.1,
  },
  night: {
    skyTop: '#151c46',
    skyMid: '#29306b',
    skyBottom: '#4b3f7e',
    hillFar: '#2d4560',
    hillMid: '#2b5552',
    meadow: '#3a7556',
    meadowShade: '#2f6149',
    grass: '#4a9068',
    grassDark: '#285842',
    tree: '#336b54',
    treeShade: '#265444',
    trunk: '#4d3c4e',
    cloud: '#5b5f9c',
    cloudShade: '#454a86',
    dirt: '#6c5a70',
    dirtDark: '#4a3d56',
    outline: '#12142e',
    light: 0.7,
    night: 1,
  },
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}

export function mixPalette(a: Palette, b: Palette, t: number): Palette {
  const out = {} as Palette;
  for (const key of Object.keys(a) as (keyof Palette)[]) {
    const av = a[key];
    const bv = b[key];
    (out as Record<string, string | number>)[key] =
      typeof av === 'number' ? av + ((bv as number) - av) * t : mixHex(av, bv as string, t);
  }
  return out;
}

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/**
 * Palette from the sun's real altitude. The same scene is re-tinted rather
 * than swapped, so transitions are continuous through the whole day.
 *   ≥ 14°        day
 *   0° … 14°     sunrise/sunset → day
 *   −10° … 0°    night → sunrise/sunset
 *   ≤ −10°       night
 */
export function paletteForSun(altitude: number, isMorning: boolean): Palette {
  const edge = isMorning ? PALETTES.sunrise : PALETTES.sunset;
  if (altitude >= 14) return PALETTES.day;
  if (altitude >= 0) return mixPalette(edge, PALETTES.day, smooth(altitude / 14));
  if (altitude > -10) return mixPalette(PALETTES.night, edge, smooth((altitude + 10) / 10));
  return PALETTES.night;
}
