// Freetown neighborhoods used to bucket listings' free-text `location` field
// for neighborhood browsing. `location` is whatever the poster typed (e.g.
// "Lumley, Freetown", "Aberdeen Beach"), so grouping is done by checking
// which of these known names appears in the text, not an exact match.
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
