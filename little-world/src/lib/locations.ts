export type WorldLocation = {
  id: string;
  name: string;
  /** Short label for the on-screen timestamp. */
  label: string;
  lat: number;
  lon: number;
  timeZone: string;
};

/** Curated cities with real coordinates and IANA time zones. */
export const LOCATIONS: WorldLocation[] = [
  { id: 'melbourne', name: 'Melbourne, Australia', label: 'MELBOURNE', lat: -37.8136, lon: 144.9631, timeZone: 'Australia/Melbourne' },
  { id: 'sydney', name: 'Sydney, Australia', label: 'SYDNEY', lat: -33.8688, lon: 151.2093, timeZone: 'Australia/Sydney' },
  { id: 'brisbane', name: 'Brisbane, Australia', label: 'BRISBANE', lat: -27.4698, lon: 153.0251, timeZone: 'Australia/Brisbane' },
  { id: 'adelaide', name: 'Adelaide, Australia', label: 'ADELAIDE', lat: -34.9285, lon: 138.6007, timeZone: 'Australia/Adelaide' },
  { id: 'perth', name: 'Perth, Australia', label: 'PERTH', lat: -31.9505, lon: 115.8605, timeZone: 'Australia/Perth' },
  { id: 'hobart', name: 'Hobart, Australia', label: 'HOBART', lat: -42.8821, lon: 147.3272, timeZone: 'Australia/Hobart' },
  { id: 'auckland', name: 'Auckland, New Zealand', label: 'AUCKLAND', lat: -36.8485, lon: 174.7633, timeZone: 'Pacific/Auckland' },
  { id: 'tokyo', name: 'Tokyo, Japan', label: 'TOKYO', lat: 35.6762, lon: 139.6503, timeZone: 'Asia/Tokyo' },
  { id: 'seoul', name: 'Seoul, South Korea', label: 'SEOUL', lat: 37.5665, lon: 126.978, timeZone: 'Asia/Seoul' },
  { id: 'singapore', name: 'Singapore', label: 'SINGAPORE', lat: 1.3521, lon: 103.8198, timeZone: 'Asia/Singapore' },
  { id: 'mumbai', name: 'Mumbai, India', label: 'MUMBAI', lat: 19.076, lon: 72.8777, timeZone: 'Asia/Kolkata' },
  { id: 'dubai', name: 'Dubai, UAE', label: 'DUBAI', lat: 25.2048, lon: 55.2708, timeZone: 'Asia/Dubai' },
  { id: 'cape-town', name: 'Cape Town, South Africa', label: 'CAPE TOWN', lat: -33.9249, lon: 18.4241, timeZone: 'Africa/Johannesburg' },
  { id: 'paris', name: 'Paris, France', label: 'PARIS', lat: 48.8566, lon: 2.3522, timeZone: 'Europe/Paris' },
  { id: 'london', name: 'London, United Kingdom', label: 'LONDON', lat: 51.5074, lon: -0.1278, timeZone: 'Europe/London' },
  { id: 'reykjavik', name: 'Reykjavík, Iceland', label: 'REYKJAVIK', lat: 64.1466, lon: -21.9426, timeZone: 'Atlantic/Reykjavik' },
  { id: 'new-york', name: 'New York, USA', label: 'NEW YORK', lat: 40.7128, lon: -74.006, timeZone: 'America/New_York' },
  { id: 'chicago', name: 'Chicago, USA', label: 'CHICAGO', lat: 41.8781, lon: -87.6298, timeZone: 'America/Chicago' },
  { id: 'los-angeles', name: 'Los Angeles, USA', label: 'LOS ANGELES', lat: 34.0522, lon: -118.2437, timeZone: 'America/Los_Angeles' },
  { id: 'honolulu', name: 'Honolulu, USA', label: 'HONOLULU', lat: 21.3069, lon: -157.8583, timeZone: 'Pacific/Honolulu' },
  { id: 'mexico-city', name: 'Mexico City, Mexico', label: 'MEXICO CITY', lat: 19.4326, lon: -99.1332, timeZone: 'America/Mexico_City' },
  { id: 'sao-paulo', name: 'São Paulo, Brazil', label: 'SAO PAULO', lat: -23.5505, lon: -46.6333, timeZone: 'America/Sao_Paulo' },
];

export const DEFAULT_LOCATION_ID = 'melbourne';

export function findLocation(id: string): WorldLocation | undefined {
  return LOCATIONS.find((l) => l.id === id);
}

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const r = Math.PI / 180;
  const dLat = (bLat - aLat) * r;
  const dLon = (bLon - aLon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * Builds a location from browser geolocation. Coordinates are rounded to ~1 km
 * (precise location is never needed). The device's own time zone is used, and
 * the label borrows a nearby curated city's name when one is close.
 */
export function locationFromCoords(lat: number, lon: number, deviceTimeZone: string): WorldLocation {
  const rLat = Math.round(lat * 100) / 100;
  const rLon = Math.round(lon * 100) / 100;
  let nearest: WorldLocation | undefined;
  let best = Infinity;
  for (const l of LOCATIONS) {
    const d = haversineKm(rLat, rLon, l.lat, l.lon);
    if (d < best) {
      best = d;
      nearest = l;
    }
  }
  const near = nearest && best < 80 ? nearest : undefined;
  return {
    id: 'device',
    name: near ? `My location (near ${near.name})` : 'My location',
    label: near ? near.label : 'HERE',
    lat: rLat,
    lon: rLon,
    timeZone: deviceTimeZone,
  };
}
