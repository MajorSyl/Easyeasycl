// Design tokens. Colors are built around the brand mark (components/Logo.tsx):
// a muted slate-blue + gold pair, not an arbitrary "pick a nice blue." Every
// color below was checked against WCAG AA (4.5:1 for text, 3:1 for large
// text / UI components) rather than chosen by eye — see the `contrast`
// comments for the pairs that matter.
export const colors = {
  background: '#F7F8FA',
  card: '#FFFFFF',
  border: '#ECEEF1',

  textPrimary: '#101828',
  // contrast: 7.7:1 on card, 7.2:1 on background
  textSecondary: '#475467',
  // contrast: 4.9:1 on card, 4.6:1 on background — was #98A2B3 (~2.5:1, failed AA)
  textMuted: '#67718A',

  // Brand blue, matched to the logo mark rather than a separate "app blue."
  // contrast: 5.0:1 both as text-on-white and white-on-fill (buttons).
  accent: '#3E6FBF',
  accentSoft: '#E7EDF7',
  accentStrong: '#2F5697',

  // Brand gold, matched to the logo mark. Used for premium/verified/rating —
  // signals of trust and status, which is what the mark's gold half stands
  // for in the wordmark itself.
  gold: '#B8912E',
  goldSoft: '#F6F1E5',

  badgeDarkBg: '#1A1E27',
  badgeDarkText: '#FFFFFF',

  // Premium badge: dark text on the brand gold reads clearly (6.0:1) and
  // looks intentional (gold + dark ink is a familiar "premium" pairing);
  // white-on-gold was 2.0:1 and unreadable.
  premiumBg: '#B8912E',
  premiumText: '#221A08',

  // Presence dot only (a small filled circle next to an avatar, not text).
  online: '#22C55E',
  // Anywhere online-ness needs to render as actual text (e.g. a status
  // message), use this instead — the bright green above is under 2.3:1 as
  // text and fails AA.
  success: '#15803D',

  favorite: '#FFFFFF',
  favoriteIcon: '#5B8DEF',

  star: '#B8912E',

  // contrast: 4.7:1 both ways — was #E4483F (~4.0:1, just under AA)
  danger: '#D6392F',
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

// Body text starts at 16 (mobile-standards minimum); nothing sits below the
// 11pt legibility floor.
export const fontSize = {
  xs: 11,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

// Shared shadow presets so every card doesn't re-declare the same five
// shadow properties inline.
export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  raised: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
} as const;
