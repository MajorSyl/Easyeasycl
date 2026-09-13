import type { ListingCategory } from './types';

// Fixed, hand-written decision tree -- never generated dynamically (no AI
// call). Editable here directly; each entry is one follow-up question asked
// when that filter is still missing after parsing the query, in priority
// order (property type asked first, budget last).
export type FollowUpKey = 'category' | 'locationTerm' | 'bedrooms' | 'priceIntent';

export type QuickReply = { label: string; value: string };

export type FollowUpStep = {
  key: FollowUpKey;
  question: string;
  quickReplies: QuickReply[];
};

export const FOLLOW_UP_SCRIPT: FollowUpStep[] = [
  {
    key: 'category',
    question: "What are you looking for?",
    quickReplies: [
      { label: 'For Rent', value: 'for rent' },
      { label: 'For Sale', value: 'for sale' },
      { label: 'Land', value: 'land' },
      { label: 'Daily / Hourly', value: 'daily' },
    ],
  },
  {
    key: 'locationTerm',
    question: 'Which area are you interested in?',
    quickReplies: [
      { label: 'Freetown', value: 'Freetown' },
      { label: 'Bo', value: 'Bo Town' },
      { label: 'Makeni', value: 'Makeni' },
      { label: 'Kenema', value: 'Kenema' },
    ],
  },
  {
    key: 'bedrooms',
    question: 'How many bedrooms?',
    quickReplies: [
      { label: '1 bed', value: '1 bedroom' },
      { label: '2 bed', value: '2 bedroom' },
      { label: '3 bed', value: '3 bedroom' },
      { label: '4+ bed', value: '4 bedroom' },
    ],
  },
  {
    key: 'priceIntent',
    question: "What's your budget?",
    quickReplies: [
      { label: 'Affordable', value: 'cheap' },
      { label: 'Mid-range', value: '' },
      { label: 'Premium', value: 'luxury' },
    ],
  },
];

export type CapturedFilters = {
  category: ListingCategory | null;
  locationTerm: string | null;
  bedrooms: number | null;
  priceIntent: 'asc' | 'desc' | null;
};

// First missing filter in script order, or null once everything's captured
// (or the user chose to skip ahead with "Just show me results").
export function nextFollowUp(captured: CapturedFilters, skipped: Set<FollowUpKey>): FollowUpStep | null {
  for (const step of FOLLOW_UP_SCRIPT) {
    if (skipped.has(step.key)) continue;
    if (step.key === 'category' && !captured.category) return step;
    if (step.key === 'locationTerm' && !captured.locationTerm) return step;
    if (step.key === 'bedrooms' && captured.bedrooms == null) return step;
    if (step.key === 'priceIntent' && !captured.priceIntent) return step;
  }
  return null;
}
