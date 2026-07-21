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
