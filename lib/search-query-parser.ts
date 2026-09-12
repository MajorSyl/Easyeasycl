import { SIERRA_LEONE_DISTRICTS } from '../constants/locations';
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
};

// Cheap/expensive intent -- combined with an already-selected currency
// (comparing raw price numbers across currencies is meaningless, same rule
// the rest of Search already follows), this becomes a price sort.
const CHEAP_WORDS = ['cheap', 'affordable', 'budget', 'low cost', 'low-cost', 'inexpensive'];
const LUXURY_WORDS = ['luxury', 'luxurious', 'high end', 'high-end', 'premium', 'expensive', 'upscale'];

// Transaction-type words -> the real `category` column.
const CATEGORY_WORDS: { words: string[]; category: ListingCategory }[] = [
  { words: ['for rent', 'to rent', 'to let', 'rent', 'rental'], category: 'for_rent' },
  { words: ['for sale', 'to buy', 'sale', 'buy'], category: 'for_sale' },
  { words: ['land', 'plot', 'plot of land'], category: 'land' },
  { words: ['daily', 'hourly', 'per day', 'per hour', 'short stay', 'short let'], category: 'daily_hourly' },
];

// Physical-type words -- there's no dedicated column for these, so they're
// matched against title/description instead of a filter column.
const TYPE_KEYWORDS = [
  'apartment',
  'flat',
  'house',
  'bungalow',
  'duplex',
  'self contained',
  'self-contained',
  'studio',
  'bedsitter',
  'room',
  'compound',
  'mansion',
  'townhouse',
];

const BEDROOM_PATTERN = /(\d+)\s*[- ]?\s*bed(?:room)?s?\b/i;

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

// Rule-based, no AI/API involved -- maps common natural phrasing ("cheap 2
// bedroom house in Bo") onto the app's real filters, falling back to plain
// text search when nothing recognizable is found.
export function parseSearchQuery(rawText: string): ParsedSearchQuery {
  let working = ` ${rawText.toLowerCase()} `;
  let matchedAnything = false;

  // Bedrooms
  let bedrooms: number | null = null;
  {
    const { text, match } = stripFirstMatch(working, BEDROOM_PATTERN);
    if (match) {
      bedrooms = parseInt(match, 10);
      working = ` ${text} `;
      matchedAnything = true;
    }
  }

  // Price intent
  let priceIntent: PriceIntent = null;
  for (const word of CHEAP_WORDS) {
    const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
    if (pattern.test(working)) {
      priceIntent = 'asc';
      working = working.replace(pattern, ' ');
      matchedAnything = true;
      break;
    }
  }
  if (!priceIntent) {
    for (const word of LUXURY_WORDS) {
      const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
      if (pattern.test(working)) {
        priceIntent = 'desc';
        working = working.replace(pattern, ' ');
        matchedAnything = true;
        break;
      }
    }
  }

  // Category (transaction type)
  let category: ListingCategory | null = null;
  outer: for (const group of CATEGORY_WORDS) {
    for (const word of group.words) {
      const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
      if (pattern.test(working)) {
        category = group.category;
        working = working.replace(pattern, ' ');
        matchedAnything = true;
        break outer;
      }
    }
  }

  // Physical property-type keywords (can match more than one, e.g. "self
  // contained apartment" -- both get ANDed against title/description).
  const keywordTerms: string[] = [];
  for (const word of TYPE_KEYWORDS) {
    const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
    if (pattern.test(working)) {
      keywordTerms.push(word);
      working = working.replace(pattern, ' ');
      matchedAnything = true;
    }
  }

  // Location (District/City/Location name)
  let locationTerm: string | null = null;
  for (const alias of LOCATION_ALIASES) {
    const pattern = new RegExp(`\\b${escapeRegExp(alias.toLowerCase())}\\b`, 'i');
    if (pattern.test(working)) {
      locationTerm = alias;
      working = working.replace(pattern, ' ');
      matchedAnything = true;
      break;
    }
  }

  const leftoverText = working.replace(/\b(in|at|near|for|a|an|the)\b/gi, ' ').replace(/\s+/g, ' ').trim();

  return { category, bedrooms, priceIntent, locationTerm, keywordTerms, leftoverText, matchedAnything };
}
