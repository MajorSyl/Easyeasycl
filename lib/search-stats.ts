import { supabase } from './supabase';
import type { ListingCategory } from './types';

export type ListingStatRow = {
  district: string;
  city: string | null;
  category: string;
  bedrooms: number | null;
  currency: string;
  listing_count: number;
  avg_price: number | null;
  min_price: number | null;
  max_price: number | null;
  p25_price: number | null;
  p50_price: number | null;
};

// Resolves "cheap"/"affordable" (and "luxury"/"expensive") to a real price
// threshold computed from this platform's own listing data for the given
// district + category + currency, instead of a hardcoded guess -- "cheap in
// Aberdeen" and "cheap in Bo" can mean very different numbers. Falls back to
// province-wide (district omitted) stats when there's no data narrow enough
// yet, and returns null only when there's no data at all to work from.
export async function resolvePriceBand(
  intent: 'asc' | 'desc',
  opts: { district?: string | null; category?: ListingCategory | null; currency: string }
): Promise<number | null> {
  let query = supabase
    .from('listing_stats')
    .select('district, category, currency, p25_price, p50_price, max_price, listing_count')
    .eq('currency', opts.currency);
  if (opts.category) query = query.eq('category', opts.category);
  if (opts.district) query = query.eq('district', opts.district);

  const { data } = await query;
  let rows = (data as ListingStatRow[] | null) ?? [];
  if (rows.length === 0 && opts.district) {
    // Nothing narrow enough for this district -- widen to the whole
    // category/currency instead of giving up.
    let widened = supabase.from('listing_stats').select('district, category, currency, p25_price, p50_price, max_price, listing_count').eq('currency', opts.currency);
    if (opts.category) widened = widened.eq('category', opts.category);
    const { data: widenedData } = await widened;
    rows = (widenedData as ListingStatRow[] | null) ?? [];
  }
  if (rows.length === 0) return null;

  const totalWeight = rows.reduce((sum, r) => sum + r.listing_count, 0);
  if (totalWeight === 0) return null;

  // Weighted average of the district(s)' 25th percentile (for "cheap") or
  // max (for "luxury") -- a plain unweighted average would let a
  // single-listing district skew the threshold as much as one with dozens.
  const field = intent === 'asc' ? 'p25_price' : 'max_price';
  const weighted = rows.reduce((sum, r) => sum + (r[field] ?? r.p50_price ?? 0) * r.listing_count, 0);
  return weighted / totalWeight;
}

export type AlternativeSuggestion =
  | { kind: 'other_location'; locations: string[] }
  | { kind: 'other_filters'; district: string; category: string; bedrooms: number | null }
  | null;

// Phase 6.22's priority order for a zero-result search: (a) same
// category/bedrooms elsewhere, named by location; (b) same location with a
// different bedroom count or category; (c) neither -- caller shows the
// "notify me" capture instead.
export async function findAlternatives(opts: {
  district: string | null;
  category: ListingCategory | null;
  bedrooms: number | null;
  currency: string;
}): Promise<AlternativeSuggestion> {
  if (opts.category) {
    let query = supabase
      .from('listing_stats')
      .select('district, city, listing_count')
      .eq('category', opts.category)
      .eq('currency', opts.currency)
      .gt('listing_count', 0);
    if (opts.bedrooms != null) query = query.eq('bedrooms', opts.bedrooms);
    if (opts.district) query = query.neq('district', opts.district);
    const { data } = await query.order('listing_count', { ascending: false }).limit(3);
    const rows = (data as ListingStatRow[] | null) ?? [];
    if (rows.length > 0) {
      const names = [...new Set(rows.map((r) => r.city || r.district))];
      return { kind: 'other_location', locations: names };
    }
  }

  if (opts.district) {
    const { data } = await supabase
      .from('listing_stats')
      .select('district, city, category, bedrooms, listing_count')
      .eq('district', opts.district)
      .eq('currency', opts.currency)
      .gt('listing_count', 0)
      .order('listing_count', { ascending: false })
      .limit(1);
    const row = (data as ListingStatRow[] | null)?.[0];
    if (row && (row.category !== opts.category || row.bedrooms !== opts.bedrooms)) {
      return { kind: 'other_filters', district: row.district, category: row.category, bedrooms: row.bedrooms };
    }
  }

  return null;
}
