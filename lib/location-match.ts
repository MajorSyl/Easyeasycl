import { ALL_CITIES, CITY_ALIASES, SIERRA_LEONE_DISTRICTS } from '../constants/locations';

export type LocationMatch = { district: string; city: string };

const CITY_LOOKUP = new Map<string, LocationMatch>();
for (const { district, city } of ALL_CITIES) {
  CITY_LOOKUP.set(city.toLowerCase(), { district, city });
}
for (const [alias, canonical] of Object.entries(CITY_ALIASES)) {
  const target = ALL_CITIES.find((c) => c.city === canonical);
  if (target) CITY_LOOKUP.set(alias.toLowerCase(), { district: target.district, city: canonical });
}

const DISTRICT_LOOKUP = new Map<string, string>();
for (const d of SIERRA_LEONE_DISTRICTS) {
  DISTRICT_LOOKUP.set(d.name.toLowerCase(), d.name);
  // "Bo" as a bare district short-form would collide with the "Bo" ->
  // "Bo Town" city alias -- the city match is more specific/useful, so
  // district short-forms never override an existing city/alias key.
  const short = d.name.replace(/\s+District$/i, '').toLowerCase();
  if (short !== d.name.toLowerCase() && !CITY_LOOKUP.has(short) && !DISTRICT_LOOKUP.has(short)) {
    DISTRICT_LOOKUP.set(short, d.name);
  }
}

// Longest name first, so "Koidu Town" is tried before any shorter
// overlapping fragment would be.
const CITY_NAMES_BY_LENGTH = [...CITY_LOOKUP.keys()].sort((a, b) => b.length - a.length);
const DISTRICT_NAMES_BY_LENGTH = [...DISTRICT_LOOKUP.keys()].sort((a, b) => b.length - a.length);

function wordBoundaryIncludes(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, 'i').test(` ${haystack} `);
}

// Matches a free-typed Location string (e.g. "Goderich, Freetown", "New
// London, Bo", "Bo Town") against the known City/Town list in
// constants/locations.ts to derive District + City automatically, so the
// agent never has to pick them manually. Sierra Leoneans typically write
// "specific area, city" -- checked last-segment-first -- but a match
// anywhere in the text (even with no comma) still resolves. Falls back to a
// bare district-name match ("Bo District") with an empty city when only the
// district is identifiable. Returns null when nothing matches at all, so
// callers can still save the text as-is and flag it for admin review.
export function matchLocationText(text: string): LocationMatch | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  const parts = trimmed
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const candidates = [...parts].reverse().map((p) => p.toLowerCase());
  if (!candidates.includes(lower)) candidates.push(lower);

  for (const candidate of candidates) {
    const exactCity = CITY_LOOKUP.get(candidate);
    if (exactCity) return exactCity;
  }
  for (const candidate of candidates) {
    const exactDistrict = DISTRICT_LOOKUP.get(candidate);
    if (exactDistrict) return { district: exactDistrict, city: '' };
  }

  for (const name of CITY_NAMES_BY_LENGTH) {
    if (wordBoundaryIncludes(lower, name)) return CITY_LOOKUP.get(name)!;
  }
  for (const name of DISTRICT_NAMES_BY_LENGTH) {
    if (wordBoundaryIncludes(lower, name)) return { district: DISTRICT_LOOKUP.get(name)!, city: '' };
  }

  return null;
}

export type LocationSuggestion = { label: string; district: string; city: string };

// Autocomplete candidates for whatever's being typed after the last comma
// (or the whole field, if there's no comma yet) -- e.g. typing "Goderich,
// Fre" suggests "Freetown". Prefix matches rank above mid-string matches.
export function suggestLocations(text: string, limit = 6): LocationSuggestion[] {
  const parts = text.split(',');
  const current = (parts[parts.length - 1] ?? '').trim().toLowerCase();
  if (!current) return [];

  const seen = new Set<string>();
  const starts: LocationSuggestion[] = [];
  const contains: LocationSuggestion[] = [];

  for (const { district, city } of ALL_CITIES) {
    if (seen.has(city)) continue;
    const lower = city.toLowerCase();
    if (lower.startsWith(current)) {
      starts.push({ label: city, district, city });
      seen.add(city);
    } else if (lower.includes(current)) {
      contains.push({ label: city, district, city });
      seen.add(city);
    }
  }

  starts.sort((a, b) => a.city.localeCompare(b.city));
  contains.sort((a, b) => a.city.localeCompare(b.city));
  return [...starts, ...contains].slice(0, limit);
}

// Replaces only the segment currently being typed (after the last comma)
// with the tapped suggestion, so "Goderich, Fre" + tapping "Freetown"
// becomes "Goderich, Freetown" instead of wiping out what came before it.
export function applyLocationSuggestion(text: string, suggestion: LocationSuggestion): string {
  const parts = text.split(',').map((p) => p.trim());
  parts[parts.length - 1] = suggestion.label;
  return parts.join(', ');
}
