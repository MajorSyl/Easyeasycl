// Sierra Leone's District -> City/Town hierarchy used by the Add Listing
// form and "Browse by Location" -- flat district names (no province
// grouping), matching how Sierra Leoneans actually refer to them ("Western
// Area", "Bo District", "Kenema District", ...). Western Area is kept as one
// district (not split into Urban/Rural) since that's how people describe it
// day to day, and it's the example the product spec itself uses.
//
// Each city also carries an approximate town-centroid coordinate. This is
// NOT a geocoding API result -- there's no geocoding service wired into this
// app -- it's a hand-maintained reference point for the town center, used as
// a fallback distance-sort anchor for listings that don't have their own
// precise coordinates. Good enough to rank "which city is closer", not
// precise enough for turn-by-turn directions.
export type District = {
  name: string;
  cities: string[];
};

export const SIERRA_LEONE_DISTRICTS: District[] = [
  { name: 'Western Area', cities: ['Freetown', 'Waterloo', 'Hastings', 'York', 'Tombo'] },
  { name: 'Bo District', cities: ['Bo Town', 'Sumbuya', 'Baoma'] },
  { name: 'Kenema District', cities: ['Kenema', 'Segbwema', 'Blama'] },
  { name: 'Bonthe District', cities: ['Bonthe', 'Mattru Jong'] },
  { name: 'Moyamba District', cities: ['Moyamba', 'Rotifunk', 'Shenge'] },
  { name: 'Pujehun District', cities: ['Pujehun', 'Zimmi'] },
  { name: 'Kailahun District', cities: ['Kailahun', 'Koindu', 'Pendembu'] },
  { name: 'Kono District', cities: ['Koidu Town', 'Yengema', 'Tombodu'] },
  { name: 'Bombali District', cities: ['Makeni', 'Binkolo'] },
  { name: 'Port Loko District', cities: ['Port Loko', 'Lunsar', 'Lungi'] },
  { name: 'Kambia District', cities: ['Kambia', 'Rokupr'] },
  { name: 'Tonkolili District', cities: ['Magburaka', 'Mile 91', 'Yele'] },
  { name: 'Koinadugu District', cities: ['Kabala', 'Fadugu'] },
  { name: 'Falaba District', cities: ['Bendugu'] },
  { name: 'Karene District', cities: ['Kamakwie', 'Kamalu'] },
];

// A user typing their own town isn't limited to the list above -- every
// district's city picker also offers this, which reveals a free-text input.
export const OTHER_CITY = 'Other';

export function citiesForDistrict(district: string): string[] {
  return SIERRA_LEONE_DISTRICTS.find((d) => d.name === district)?.cities ?? [];
}

// Approximate town-centroid coordinates, keyed by city name. City names are
// unique across this list, so a flat map (rather than district+city) is
// enough. See the file-level comment -- these are reference points for
// city-level distance sorting, not precise geocoding.
export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Freetown: { lat: 8.4657, lng: -13.2317 },
  Waterloo: { lat: 8.3372, lng: -13.0722 },
  Hastings: { lat: 8.3806, lng: -13.1494 },
  York: { lat: 8.3167, lng: -13.0333 },
  Tombo: { lat: 8.15, lng: -13.0 },
  'Bo Town': { lat: 7.9558, lng: -11.7383 },
  Sumbuya: { lat: 7.8, lng: -11.7 },
  Baoma: { lat: 8.05, lng: -11.85 },
  Kenema: { lat: 7.8767, lng: -11.19 },
  Segbwema: { lat: 7.9667, lng: -10.95 },
  Blama: { lat: 7.85, lng: -11.4166 },
  Bonthe: { lat: 7.5264, lng: -12.505 },
  'Mattru Jong': { lat: 7.6167, lng: -11.8333 },
  Moyamba: { lat: 8.1594, lng: -12.4331 },
  Rotifunk: { lat: 8.2167, lng: -12.7 },
  Shenge: { lat: 8.0833, lng: -12.9167 },
  Pujehun: { lat: 7.3506, lng: -11.7211 },
  Zimmi: { lat: 7.15, lng: -11.4667 },
  Kailahun: { lat: 8.2775, lng: -10.5744 },
  Koindu: { lat: 8.4833, lng: -10.35 },
  Pendembu: { lat: 8.1, lng: -10.6167 },
  'Koidu Town': { lat: 8.6433, lng: -10.9714 },
  Yengema: { lat: 8.6167, lng: -11.0667 },
  Tombodu: { lat: 8.5333, lng: -10.9667 },
  Makeni: { lat: 8.8817, lng: -12.0442 },
  Binkolo: { lat: 8.85, lng: -11.9667 },
  'Port Loko': { lat: 8.7667, lng: -12.7833 },
  Lunsar: { lat: 8.6833, lng: -12.5333 },
  Lungi: { lat: 8.6167, lng: -13.2 },
  Kambia: { lat: 9.1167, lng: -12.9167 },
  Rokupr: { lat: 8.95, lng: -12.75 },
  Magburaka: { lat: 8.7167, lng: -11.95 },
  'Mile 91': { lat: 8.4833, lng: -12.05 },
  Yele: { lat: 8.5667, lng: -12.15 },
  Kabala: { lat: 9.5833, lng: -11.55 },
  Fadugu: { lat: 9.2333, lng: -11.65 },
  Bendugu: { lat: 9.85, lng: -11.35 },
  Kamakwie: { lat: 9.5, lng: -12.3 },
  Kamalu: { lat: 9.35, lng: -12.15 },
};

export function coordsForCity(city: string): { lat: number; lng: number } | null {
  return CITY_COORDS[city] ?? null;
}

// All known cities across every district, each tagged with its district --
// used to build the flat "Browse by Location" city list and for reverse
// "nearest city" lookups.
export const ALL_CITIES: { district: string; city: string }[] = SIERRA_LEONE_DISTRICTS.flatMap((d) =>
  d.cities.map((city) => ({ district: d.name, city }))
);
