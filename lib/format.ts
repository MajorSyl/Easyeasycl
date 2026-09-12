import type { ListingCategory, RateUnit } from './types';

const categoryBadgeLabels: Record<ListingCategory, string> = {
  for_rent: 'RENT',
  for_sale: 'SALE',
  land: 'LAND',
  daily_hourly: 'HOURLY',
};

export function categoryBadgeLabel(category: ListingCategory) {
  return categoryBadgeLabels[category];
}

const categoryLabels: Record<ListingCategory, string> = {
  for_rent: 'For Rent',
  for_sale: 'For Sale',
  land: 'Land',
  daily_hourly: 'Daily/Hourly',
};

// Full-word form of categoryBadgeLabel, for prose contexts (the listing
// detail summary line) where the yard-sign-style "RENT"/"SALE" abbreviation
// used on card badges would read as clipped rather than intentional.
export function categoryLabel(category: ListingCategory) {
  return categoryLabels[category];
}

const rateUnitAbbreviation: Record<Exclude<RateUnit, null>, string> = {
  hour: 'hr',
  day: 'day',
  month: 'mo',
  night: 'night',
};

// USD gets a plain "$" prefix (no space, the universal convention); NLE
// gets "NLe" -- the standard abbreviation for the Leone, distinct from the
// bare "NLE" stored in the database (currency is a fixed enum value there,
// this is just how it reads to a person). Falls back to the raw stored
// code for anything unrecognized, so a data issue degrades to "odd label"
// rather than a wrong symbol.
const currencyDisplay: Record<string, { symbol: string; spaced: boolean }> = {
  USD: { symbol: '$', spaced: false },
  NLE: { symbol: 'NLe', spaced: true },
};

// formatPrice above renders with thousands-separator commas (12,500), so a
// user editing a price field naturally types it back the same way -- this
// strips those commas before parsing rather than silently producing NaN
// (which read as "the Publish button just won't turn on" with no
// explanation, since a NaN price fails the required-fields check).
export function parsePriceInput(text: string): number {
  return Number(text.replace(/,/g, '').trim());
}

export function formatPrice(price: number, currency: string, unit: RateUnit) {
  const amount = Math.round(price).toLocaleString('en-US');
  const display = currencyDisplay[currency] ?? { symbol: currency, spaced: true };
  const amountWithSymbol = `${display.symbol}${display.spaced ? ' ' : ''}${amount}`;
  return unit ? `${amountWithSymbol} / ${rateUnitAbbreviation[unit]}` : amountWithSymbol;
}

// Renders a listing's place as a single display string, without repeating
// the city. Since the redesigned Add Listing "Location" field folds the
// city into what the agent types (e.g. "Goderich, Freetown"), `location`
// alone already reads as a complete place for most listings; naively
// appending the stored `city` on top of that produced "Goderich, Freetown,
// Freetown". Older listings from before that redesign still have a bare
// specific-area `location` ("Wilberforce") with `city` stored separately,
// so this only appends city/district when they aren't already part of the
// location text.
export function formatListingPlace(listing: { location: string; city: string; district?: string }): string {
  const parts = [listing.location];
  const locationLower = listing.location.toLowerCase();
  if (listing.city && !locationLower.includes(listing.city.toLowerCase())) {
    parts.push(listing.city);
  }
  if (listing.district && !locationLower.includes(listing.district.toLowerCase())) {
    parts.push(listing.district);
  }
  return parts.filter((part) => part.trim().length > 0).join(', ');
}

export function initialsFor(name: string | null) {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

const roleLabels: Record<string, string> = {
  agent: 'AGENT',
  landlord: 'LANDLORD',
  agency: 'AGENCY',
};

export function roleLabel(role: string | undefined | null) {
  if (!role) return null;
  return roleLabels[role] ?? null;
}

export function daysSince(isoDate: string) {
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function formatListingAge(isoDate: string) {
  const days = daysSince(isoDate);
  if (days === 0) return 'Listed today';
  if (days === 1) return 'Listed 1 day ago';
  if (days < 30) return `Listed ${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Listed ${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `Listed ${years} year${years === 1 ? '' : 's'} ago`;
}

const verificationLabels: Record<string, string> = {
  phone_verified: 'Phone Verified',
  agent_verified: 'Agent Verified',
  id_verified: 'ID Verified',
};

// 'agent_verified' is the one shared tier granted through the same admin
// review path regardless of who requested it -- the label just needs to
// read correctly for whichever role holds it.
export function verificationBadgeLabel(tier: string | null | undefined, role?: string | null) {
  if (!tier) return null;
  if (tier === 'agent_verified') {
    if (role === 'landlord') return 'Verified Property Owner';
    if (role === 'agency') return 'Verified Agency';
  }
  return verificationLabels[tier] ?? null;
}

// "Agent since <Month Year>" -- the account's real creation date, not a
// fabricated tenure stat. Falls back to a plain "On Easyfen since ..." for
// the first year, since "Agent for 3 months" reads oddly that early on.
export function agentTenureLabel(isoDate: string) {
  const created = new Date(isoDate);
  const months = Math.floor(daysSince(isoDate) / 30);
  const monthYear = created.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  if (months < 12) return `On Easyfen since ${monthYear}`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} on Easyfen`;
}

export function formatMessageTimestamp(isoDate: string) {
  const date = new Date(isoDate);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
