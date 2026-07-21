// Design tokens matched by eye from the Easyfen web prototype screenshots.
// Tweak these values if something looks slightly off compared to the design.
export const colors = {
  background: '#F7F8FA',
  card: '#FFFFFF',
  border: '#ECEEF1',

  textPrimary: '#101828',
  textSecondary: '#667085',
  textMuted: '#98A2B3',

  accent: '#1E6FE0',
  accentSoft: '#EAF2FE',

  badgeDarkBg: '#1A1E27',
  badgeDarkText: '#FFFFFF',

  premiumBg: '#F5A524',
  premiumText: '#FFFFFF',

  online: '#22C55E',
  favorite: '#FFFFFF',
  favoriteIcon: '#5B8DEF',

  star: '#F5A524',

  danger: '#E4483F',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
} as const;
