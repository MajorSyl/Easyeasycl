import { formatPrice } from '../lib/format';
import type { ListingCategory, ListingCurrency, RateUnit } from '../lib/types';

export type DescriptionInput = {
  category: ListingCategory | null;
  bedrooms: string;
  // `location` already carries the full "specific area, City" text an agent
  // typed into the single Location field -- see components/LocationFields.tsx
  // -- so it's the only location value this needs. `city` is kept only as a
  // fallback for the (practically unreachable, since Location is required to
  // publish) case where it's somehow empty.
  location: string;
  city: string;
  price: number | null;
  currency: ListingCurrency;
  priceUnit: RateUnit;
  amenities: string[];
};

// Purely template-based (no AI/API call, zero live cost) -- every sentence
// slot below picks randomly from several pre-written phrasings, so two
// listings with the same type/bedrooms/price don't read as obviously
// copy-pasted from each other. Add more variety by appending to any array.
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
  (noun) => `Introducing a fantastic ${noun}`,
  (noun) => `Here's a great opportunity -- a ${noun}`,
  (noun) => `Looking for a new place? Consider this ${noun}`,
];

const BEDROOM_PHRASES: ((n: number) => string)[] = [
  (n) => `featuring ${n} bedroom${n === 1 ? '' : 's'}`,
  (n) => `with ${n} spacious bedroom${n === 1 ? '' : 's'}`,
  (n) => `offering ${n} comfortable bedroom${n === 1 ? '' : 's'}`,
  (n) => `boasting ${n} bedroom${n === 1 ? '' : 's'}`,
];

const LOCATION_LEAD_INS = ['in', 'located in', 'situated in', 'nestled in'];

const CLOSERS = [
  'Message the agent today to schedule a viewing.',
  "Contact the agent now -- this one won't stay available for long.",
  'Reach out for more details or to arrange a visit.',
  'Get in touch to learn more or book a viewing.',
  "Don't miss out -- send a message to find out more.",
  'Available now -- reach out to the agent to arrange a viewing.',
];

const AMENITY_INTROS = ['Comes with', 'Features', 'Includes', 'Also enjoy'];

function pick<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

function joinList(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

const PRICE_LINES: Record<ListingCategory, ((priceStr: string) => string)[]> = {
  for_sale: [(p) => `Priced at ${p}.`, (p) => `On the market for ${p}.`, (p) => `Yours for ${p}.`],
  land: [(p) => `On the market for ${p}.`, (p) => `Available for ${p}.`, (p) => `Priced at ${p}.`],
  daily_hourly: [(p) => `Available for ${p}.`, (p) => `Booking at ${p}.`],
  for_rent: [(p) => `Renting at ${p}.`, (p) => `Available to rent at ${p}.`, (p) => `Yours to rent for ${p}.`],
};

function priceLine(input: DescriptionInput): string {
  if (input.price == null || Number.isNaN(input.price) || input.price <= 0) return '';
  const priceStr = formatPrice(input.price, input.currency, input.priceUnit);
  return pick(PRICE_LINES[input.category ?? 'for_rent'])(priceStr);
}

// Assembles a usable first-draft description from whatever's already been
// filled in on the form -- an agent can always edit it before publishing,
// this just saves typing one from scratch.
export function generateListingDescription(input: DescriptionInput): string {
  const noun = input.category ? TYPE_NOUNS[input.category] : 'property';
  const bedroomsNum = Number(input.bedrooms);
  const bedroomsPhrase =
    input.bedrooms.trim() && !Number.isNaN(bedroomsNum) && bedroomsNum > 0
      ? ` ${pick(BEDROOM_PHRASES)(bedroomsNum)}`
      : '';
  const place = input.location.trim() || input.city.trim();
  const locationPhrase = place ? ` ${pick(LOCATION_LEAD_INS)} ${place}` : '';

  const opening = `${pick(OPENERS)(noun)}${bedroomsPhrase}${locationPhrase}.`;
  const amenitiesLine = input.amenities.length ? `${pick(AMENITY_INTROS)} ${joinList(input.amenities)}.` : '';

  return [opening, priceLine(input), amenitiesLine, pick(CLOSERS)]
    .filter((part) => part.length > 0)
    .join(' ');
}
