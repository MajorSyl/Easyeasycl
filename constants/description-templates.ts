import { formatPrice } from '../lib/format';
import type { ListingCategory, ListingCurrency, RateUnit } from '../lib/types';

export type DescriptionInput = {
  category: ListingCategory | null;
  bedrooms: string;
  district: string;
  city: string;
  location: string;
  price: number | null;
  currency: ListingCurrency;
  priceUnit: RateUnit;
  amenities: string[];
};

// Purely template-based (no AI/API call) -- picks randomly from a handful
// of pre-written phrasings per slot, so two agents listing similar
// properties don't get an identical, obviously-copy-pasted draft. Add more
// variety by appending to any of the arrays below.
const TYPE_NOUNS: Record<ListingCategory, string> = {
  for_rent: 'home',
  for_sale: 'property',
  land: 'plot of land',
  daily_hourly: 'space',
};

const OPENERS: ((noun: string) => string)[] = [
  (noun) => `Discover this well-located ${noun}`,
  (noun) => `Welcome to this attractive ${noun}`,
  (noun) => `Check out this ${noun}`,
  (noun) => `Now available -- a ${noun}`,
  (noun) => `Take a look at this ${noun}`,
];

const CLOSERS = [
  'Message the agent today to schedule a viewing.',
  "Contact the agent now -- this one won't stay available for long.",
  'Reach out for more details or to arrange a visit.',
  'Get in touch to learn more or book a viewing.',
];

function pick<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

function joinList(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function priceLine(input: DescriptionInput): string {
  if (input.price == null || Number.isNaN(input.price) || input.price <= 0) return '';
  const priceStr = formatPrice(input.price, input.currency, input.priceUnit);
  switch (input.category) {
    case 'for_sale':
      return `Priced at ${priceStr}.`;
    case 'land':
      return `On the market for ${priceStr}.`;
    case 'daily_hourly':
      return `Available for ${priceStr}.`;
    case 'for_rent':
    default:
      return `Renting at ${priceStr}.`;
  }
}

// Assembles a usable first-draft description from whatever's already been
// filled in on the form -- an agent can always edit it before publishing,
// this just saves typing one from scratch.
export function generateListingDescription(input: DescriptionInput): string {
  const noun = input.category ? TYPE_NOUNS[input.category] : 'property';
  const bedroomsNum = Number(input.bedrooms);
  const bedroomsPhrase =
    input.bedrooms.trim() && !Number.isNaN(bedroomsNum) && bedroomsNum > 0
      ? ` featuring ${bedroomsNum} bedroom${bedroomsNum === 1 ? '' : 's'}`
      : '';
  const locationPhrase = input.location.trim()
    ? ` in ${input.location}${input.city ? `, ${input.city}` : ''}`
    : input.city
      ? ` in ${input.city}`
      : '';

  const opening = `${pick(OPENERS)(noun)}${bedroomsPhrase}${locationPhrase}.`;
  const amenitiesLine = input.amenities.length
    ? `Comes with ${joinList(input.amenities.map((a) => a.toLowerCase()))}.`
    : '';

  return [opening, priceLine(input), amenitiesLine, pick(CLOSERS)]
    .filter((part) => part.length > 0)
    .join(' ');
}
