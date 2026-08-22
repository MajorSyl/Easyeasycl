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

const rateUnitAbbreviation: Record<Exclude<RateUnit, null>, string> = {
  hour: 'hr',
  day: 'day',
  month: 'mo',
  night: 'night',
};

export function formatPrice(price: number, currency: string, unit: RateUnit) {
  const amount = Math.round(price).toLocaleString('en-US');
  return unit ? `${currency} ${amount} / ${rateUnitAbbreviation[unit]}` : `${currency} ${amount}`;
}

export function initialsFor(name: string | null) {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

const roleLabels: Record<string, string> = {
  agent: 'AGENT',
  service_provider: 'SERVICE PROVIDER',
  hotel_owner: 'HOTEL',
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
