// Compact relative-time strings ("2h ago", "1d ago", "3w ago") for the
// dashboard's activity feeds -- a shorter style than the root app's
// "Listed X days ago" (lib/format.ts there), which is written for a
// listing card rather than a dense admin row.
export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// Payments (boosts, subscriptions, verification fees) are always
// NLE-denominated platform charges regardless of what currency any given
// listing is priced in -- see constants/payments.ts in the main app. Keep
// this one hardcoded rather than routing it through formatListingPrice
// below, which is a different concept (a landlord's own listing price,
// USD or NLE) that shouldn't be conflated with platform fees.
export function formatNLE(amount: number): string {
  return `NLE ${Number(amount).toLocaleString('en-US')}`;
}

// Mirrors lib/format.ts's formatPrice in the main app -- USD gets a plain
// "$" prefix, NLE displays as "NLe" (the standard abbreviation), distinct
// from the bare "NLE" the database actually stores.
export function formatListingPrice(amount: number, currency: string): string {
  const rounded = Number(amount).toLocaleString('en-US');
  if (currency === 'USD') return `$${rounded}`;
  if (currency === 'NLE') return `NLe ${rounded}`;
  return `${currency} ${rounded}`;
}
