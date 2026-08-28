// Mirrors constants/neighborhoods.ts in the root Expo app. Duplicated rather
// than imported since apps/admin is a separate Next.js project with its own
// package.json/tsconfig and doesn't share a module boundary with the root
// app. listings.location is free text (e.g. "Lumley, Freetown"), so a
// listing is bucketed by checking which of these known names appears in it,
// not by an exact match against a dedicated column.
export const FREETOWN_NEIGHBORHOODS = [
  'Aberdeen',
  'Wilberforce',
  'Congo Cross',
  'Lumley',
  'Goderich',
  'Hill Station',
  'Murray Town',
  'Kissy',
  'Wellington',
  'Brookfields',
  'Regent',
  'Juba',
] as const;

export function matchNeighborhood(location: string | null): string | null {
  if (!location) return null;
  const lower = location.toLowerCase();
  return FREETOWN_NEIGHBORHOODS.find((n) => lower.includes(n.toLowerCase())) ?? null;
}
