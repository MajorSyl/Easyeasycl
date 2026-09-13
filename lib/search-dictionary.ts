import { supabase } from './supabase';

export type DictionaryType = 'category' | 'bedrooms' | 'price_intent' | 'type_keyword' | 'stopword';
export type DictionaryEntry = { term: string; language: 'en' | 'kri'; mapsToType: DictionaryType; mapsToValue: string | null };

// Bundled defaults mirror what shipped hardcoded in the parser before this
// table existed -- used instantly on cold start (and offline) so search
// never waits on a network round trip, while the Supabase-backed copy below
// loads in the background and takes over once it lands. This is what makes
// the dictionary editable from the admin dashboard without a redeploy: new
// rows there simply replace this bundle in cache on the next app open.
const BUILT_IN_DEFAULTS: DictionaryEntry[] = [
  { term: 'for rent', language: 'en', mapsToType: 'category', mapsToValue: 'for_rent' },
  { term: 'to rent', language: 'en', mapsToType: 'category', mapsToValue: 'for_rent' },
  { term: 'to let', language: 'en', mapsToType: 'category', mapsToValue: 'for_rent' },
  { term: 'rent', language: 'en', mapsToType: 'category', mapsToValue: 'for_rent' },
  { term: 'rental', language: 'en', mapsToType: 'category', mapsToValue: 'for_rent' },
  { term: 'for sale', language: 'en', mapsToType: 'category', mapsToValue: 'for_sale' },
  { term: 'to buy', language: 'en', mapsToType: 'category', mapsToValue: 'for_sale' },
  { term: 'sale', language: 'en', mapsToType: 'category', mapsToValue: 'for_sale' },
  { term: 'buy', language: 'en', mapsToType: 'category', mapsToValue: 'for_sale' },
  { term: 'land', language: 'en', mapsToType: 'category', mapsToValue: 'land' },
  { term: 'plot', language: 'en', mapsToType: 'category', mapsToValue: 'land' },
  { term: 'plot of land', language: 'en', mapsToType: 'category', mapsToValue: 'land' },
  { term: 'daily', language: 'en', mapsToType: 'category', mapsToValue: 'daily_hourly' },
  { term: 'hourly', language: 'en', mapsToType: 'category', mapsToValue: 'daily_hourly' },
  { term: 'per day', language: 'en', mapsToType: 'category', mapsToValue: 'daily_hourly' },
  { term: 'per hour', language: 'en', mapsToType: 'category', mapsToValue: 'daily_hourly' },
  { term: 'short stay', language: 'en', mapsToType: 'category', mapsToValue: 'daily_hourly' },
  { term: 'short let', language: 'en', mapsToType: 'category', mapsToValue: 'daily_hourly' },
  { term: 'rent os', language: 'kri', mapsToType: 'category', mapsToValue: 'for_rent' },
  { term: 'fo rent', language: 'kri', mapsToType: 'category', mapsToValue: 'for_rent' },
  { term: 'to hire', language: 'kri', mapsToType: 'category', mapsToValue: 'for_rent' },
  { term: 'me wan rent', language: 'kri', mapsToType: 'category', mapsToValue: 'for_rent' },
  { term: 'fo sell', language: 'kri', mapsToType: 'category', mapsToValue: 'for_sale' },
  { term: 'e dae sell', language: 'kri', mapsToType: 'category', mapsToValue: 'for_sale' },
  { term: 'me wan buy', language: 'kri', mapsToType: 'category', mapsToValue: 'for_sale' },
  { term: 'buy os', language: 'kri', mapsToType: 'category', mapsToValue: 'for_sale' },
  { term: 'graun', language: 'kri', mapsToType: 'category', mapsToValue: 'land' },
  { term: 'plot lan', language: 'kri', mapsToType: 'category', mapsToValue: 'land' },
  { term: 'cheap', language: 'en', mapsToType: 'price_intent', mapsToValue: 'asc' },
  { term: 'affordable', language: 'en', mapsToType: 'price_intent', mapsToValue: 'asc' },
  { term: 'budget', language: 'en', mapsToType: 'price_intent', mapsToValue: 'asc' },
  { term: 'low cost', language: 'en', mapsToType: 'price_intent', mapsToValue: 'asc' },
  { term: 'low-cost', language: 'en', mapsToType: 'price_intent', mapsToValue: 'asc' },
  { term: 'inexpensive', language: 'en', mapsToType: 'price_intent', mapsToValue: 'asc' },
  { term: 'luxury', language: 'en', mapsToType: 'price_intent', mapsToValue: 'desc' },
  { term: 'luxurious', language: 'en', mapsToType: 'price_intent', mapsToValue: 'desc' },
  { term: 'high end', language: 'en', mapsToType: 'price_intent', mapsToValue: 'desc' },
  { term: 'high-end', language: 'en', mapsToType: 'price_intent', mapsToValue: 'desc' },
  { term: 'premium', language: 'en', mapsToType: 'price_intent', mapsToValue: 'desc' },
  { term: 'expensive', language: 'en', mapsToType: 'price_intent', mapsToValue: 'desc' },
  { term: 'upscale', language: 'en', mapsToType: 'price_intent', mapsToValue: 'desc' },
  { term: 'chip', language: 'kri', mapsToType: 'price_intent', mapsToValue: 'asc' },
  { term: 'smol mone', language: 'kri', mapsToType: 'price_intent', mapsToValue: 'asc' },
  { term: 'mek e chip', language: 'kri', mapsToType: 'price_intent', mapsToValue: 'asc' },
  { term: 'big mone', language: 'kri', mapsToType: 'price_intent', mapsToValue: 'desc' },
  { term: 'e dear', language: 'kri', mapsToType: 'price_intent', mapsToValue: 'desc' },
  { term: 'fine wan', language: 'kri', mapsToType: 'price_intent', mapsToValue: 'desc' },
  { term: 'apartment', language: 'en', mapsToType: 'type_keyword', mapsToValue: null },
  { term: 'flat', language: 'en', mapsToType: 'type_keyword', mapsToValue: null },
  { term: 'house', language: 'en', mapsToType: 'type_keyword', mapsToValue: null },
  { term: 'bungalow', language: 'en', mapsToType: 'type_keyword', mapsToValue: null },
  { term: 'duplex', language: 'en', mapsToType: 'type_keyword', mapsToValue: null },
  { term: 'self contained', language: 'en', mapsToType: 'type_keyword', mapsToValue: null },
  { term: 'self-contained', language: 'en', mapsToType: 'type_keyword', mapsToValue: null },
  { term: 'studio', language: 'en', mapsToType: 'type_keyword', mapsToValue: null },
  { term: 'bedsitter', language: 'en', mapsToType: 'type_keyword', mapsToValue: null },
  { term: 'room', language: 'en', mapsToType: 'type_keyword', mapsToValue: null },
  { term: 'compound', language: 'en', mapsToType: 'type_keyword', mapsToValue: null },
  { term: 'mansion', language: 'en', mapsToType: 'type_keyword', mapsToValue: null },
  { term: 'townhouse', language: 'en', mapsToType: 'type_keyword', mapsToValue: null },
  { term: 'os', language: 'kri', mapsToType: 'type_keyword', mapsToValue: null },
  { term: 'haus', language: 'kri', mapsToType: 'type_keyword', mapsToValue: null },
  { term: 'rum', language: 'kri', mapsToType: 'type_keyword', mapsToValue: null },
  { term: 'kompound', language: 'kri', mapsToType: 'type_keyword', mapsToValue: null },
  { term: 'big os', language: 'kri', mapsToType: 'type_keyword', mapsToValue: null },
  { term: 'self kontein', language: 'kri', mapsToType: 'type_keyword', mapsToValue: null },
];

let cache: DictionaryEntry[] = BUILT_IN_DEFAULTS;
let loaded = false;
let inFlight: Promise<void> | null = null;

export function getDictionarySync(): DictionaryEntry[] {
  return cache;
}

// Fire-and-forget refresh -- callers keep using getDictionarySync()'s
// current value (defaults, or the last successful fetch) while this runs.
// Safe to call repeatedly; only one request is ever in flight.
export function refreshDictionary(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const { data, error } = await supabase
      .from('search_dictionary')
      .select('term, language, maps_to_type, maps_to_value');
    if (!error && data && data.length > 0) {
      cache = data.map((row) => ({
        term: row.term,
        language: row.language as 'en' | 'kri',
        mapsToType: row.maps_to_type as DictionaryType,
        mapsToValue: row.maps_to_value,
      }));
      loaded = true;
    }
    inFlight = null;
  })();
  return inFlight;
}

export function isDictionaryLoaded(): boolean {
  return loaded;
}
