import { ALL_CITIES, CITY_COORDS } from '../constants/locations';

const EARTH_RADIUS_KM = 6371;

// Haversine great-circle distance -- fine for city-to-city / listing-to-user
// ranking at this scale, no need for anything more precise.
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

// Nearest known city to a device coordinate, used to default "Browse by
// Location" to the user's own city. Just a nearest-centroid lookup against
// our static town-coordinate list, not a real reverse-geocode.
export function nearestCity(lat: number, lng: number): { district: string; city: string } | null {
  let best: { district: string; city: string; km: number } | null = null;
  for (const entry of ALL_CITIES) {
    const coords = CITY_COORDS[entry.city];
    if (!coords) continue;
    const km = distanceKm(lat, lng, coords.lat, coords.lng);
    if (!best || km < best.km) best = { ...entry, km };
  }
  return best ? { district: best.district, city: best.city } : null;
}
