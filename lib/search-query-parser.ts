import { SIERRA_LEONE_DISTRICTS } from '../constants/locations';
import { getDictionarySync } from './search-dictionary';
import type { ListingCategory } from './types';

export type PriceIntent = 'asc' | 'desc' | null;

export type ParsedSearchQuery = {
  // Only 'land' maps directly onto the category enum from a type word;
  // for_rent/for_sale/daily_hourly come from transaction words (see below).
  category: ListingCategory | null;
  bedrooms: number | null;
  priceIntent: PriceIntent;
  // A recognized District/City/Location name -- filtered against all three
  // columns nationwide, not just city.
  locationTerm: string | null;
  // Descriptive property-type words ("apartment", "duplex", ...) that don't
  // map onto the category enum -- matched against title/description instead.
  keywordTerms: string[];
  // Whatever text wasn't consumed by any recognized token.
  leftoverText: string;
  // True once any rule below actually matched something. When false, the
  // caller should fall back to today's plain "search everything" behavior.
  matchedAnything: boolean;
  // How many distinct filter categories matched (category, bedrooms,
  // location, price intent, >=1 keyword each count once) -- used for
  // ranking near-matches and for the missing-filter follow-up flow.
  matchedFilterCount: number;
};

const BEDROOM_PATTERN = /(\d+)\s*[- ]?\s*(?:bed(?:room)?s?|rum)\b/i;

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Longer aliases first ("port loko" before "port") so a more specific match
// wins; matched on word boundaries so "bo" doesn't fire inside "bonthe".
function buildLocationAliases(): string[] {
  const aliases = new Set<string>();
  for (const d of SIERRA_LEONE_DISTRICTS) {
    aliases.add(d.name.replace(/ District$/i, ''));
    for (const city of d.cities) {
      aliases.add(city);
      const short = city.replace(/ Town$/i, '');
      if (short !== city) aliases.add(short);
    }
  }
  return [...aliases].sort((a, b) => b.length - a.length);
}

const LOCATION_ALIASES = buildLocationAliases();

function stripFirstMatch(text: string, pattern: RegExp): { text: string; match: string | null } {
  const m = text.match(pattern);
  if (!m) return { text, match: null };
  return { text: (text.slice(0, m.index) + ' ' + text.slice((m.index ?? 0) + m[0].length)).replace(/\s+/g, ' ').trim(), match: m[0] };
}

// Rule-based, no AI/API involved -- maps common natural phrasing (English or
// Krio, including mixed sentences) onto the app's real filters, falling back
// to plain text search when nothing recognizable is found. The word lists
// driving category/price-intent/type-keyword matching come from
// search-dictionary.ts (Supabase-backed, admin-editable); only the
// bedroom-count regex and location-alias list are structural and stay here.
export function parseSearchQuery(rawText: string): ParsedSearchQuery {
  let working = ` ${rawText.toLowerCase()} `;
  let matchedAnything = false;
  let matchedFilterCount = 0;

  const dictionary = getDictionarySync();
  const categoryTerms = dictionary
    .filter((e) => e.mapsToType === 'category' && e.mapsToValue)
    .sort((a, b) => b.term.length - a.term.length);
  const priceIntentTerms = dictionary
    .filter((e) => e.mapsToType === 'price_intent' && e.mapsToValue)
    .sort((a, b) => b.term.length - a.term.length);
  const typeKeywordTerms = dictionary
    .filter((e) => e.mapsToType === 'type_keyword')
    .map((e) => e.term)
    .sort((a, b) => b.length - a.length);

  // Bedrooms
  let bedrooms: number | null = null;
  {
    const { text, match } = stripFirstMatch(working, BEDROOM_PATTERN);
    if (match) {
      bedrooms = parseInt(match, 10);
      working = ` ${text} `;
      matchedAnything = true;
      matchedFilterCount++;
    }
  }

  // Price intent (cheap/affordable -> asc, luxury/expensive -> desc) --
  // English + Krio terms from the dictionary.
  let priceIntent: PriceIntent = null;
  for (const entry of priceIntentTerms) {
    const pattern = new RegExp(`\\b${escapeRegExp(entry.term)}\\b`, 'i');
    if (pattern.test(working)) {
      priceIntent = entry.mapsToValue as PriceIntent;
      working = working.replace(pattern, ' ');
      matchedAnything = true;
      matchedFilterCount++;
      break;
    }
  }

  // Category (transaction type) -- English + Krio terms from the dictionary.
  let category: ListingCategory | null = null;
  for (const entry of categoryTerms) {
    const pattern = new RegExp(`\\b${escapeRegExp(entry.term)}\\b`, 'i');
    if (pattern.test(working)) {
      category = entry.mapsToValue as ListingCategory;
      working = working.replace(pattern, ' ');
      matchedAnything = true;
      matchedFilterCount++;
      break;
    }
  }

  // Physical property-type keywords (can match more than one, e.g. "self
  // contained apartment" -- both get ANDed against title/description).
  const keywordTerms: string[] = [];
  for (const term of typeKeywordTerms) {
    const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');
    if (pattern.test(working)) {
      keywordTerms.push(term);
      working = working.replace(pattern, ' ');
      matchedAnything = true;
    }
  }
  if (keywordTerms.length > 0) matchedFilterCount++;

  // Location (District/City/Location name)
  let locationTerm: string | null = null;
  for (const alias of LOCATION_ALIASES) {
    const pattern = new RegExp(`\\b${escapeRegExp(alias.toLowerCase())}\\b`, 'i');
    if (pattern.test(working)) {
      locationTerm = alias;
      working = working.replace(pattern, ' ');
      matchedAnything = true;
      matchedFilterCount++;
      break;
    }
  }

  const leftoverText = working.replace(/\b(in|at|near|for|a|an|the|na|dae|wan)\b/gi, ' ').replace(/\s+/g, ' ').trim();

  return { category, bedrooms, priceIntent, locationTerm, keywordTerms, leftoverText, matchedAnything, matchedFilterCount };
}
