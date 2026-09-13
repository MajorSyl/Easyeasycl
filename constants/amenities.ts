// Optional amenity tags an agent can tick on Add Listing -- feeds both the
// generated description (constants/description-templates.ts) and, later,
// could become its own filter. Add or rename one here and the checkbox row
// and the generator both pick it up automatically.
export const AMENITIES = [
  'Parking',
  'Fenced Compound',
  'Running Water',
  'Electricity (NEC/Solar)',
  'Furnished',
  'Security/Watchman',
  'Tiled Floors',
  'Water Tank/Borehole',
] as const;
