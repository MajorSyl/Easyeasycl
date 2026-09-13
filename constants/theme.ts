// Design tokens. Airbnb-style "quiet UI": a near-white page background with
// white cards on top -- blue is reserved for the brand accent (primary
// buttons, selected/active states, icons, links, badges), never used as
// decorative background fill, so it doesn't compete with listing photos.
// `border` is a cool neutral gray -- it used to be a warm clay tone left
// over from an earlier sand-toned palette, which read as muddy brown/tan,
// especially anywhere it's used as a fill (an inactive toggle segment, a
// disabled button) rather than just a hairline. Every pair below is matched
// against WCAG AA (4.5:1 for text, 3:1 for large text / UI components) by
// actual contrast math, not by eye -- see the `contrast` comments for the
// pairs that matter. Re-run the check before changing any of these.
export const colors = {
  background: '#FAFAFA',
  card: '#FFFFFF',
  border: '#DCE3EC',

  // contrast: 15.0:1 on card, 14.4:1 on background
  textPrimary: '#2B2620',
  // contrast: 7.6:1 on card, 7.2:1 on background
  textSecondary: '#5C5346',
  // contrast: 5.3:1 on card, 5.1:1 on background -- the AA floor for
  // normal text is 4.5:1, so this is as light as textMuted can go here.
  textMuted: '#746A5B',

  // Brand blue (matches the marketing site, PWA icon, and admin dashboard --
  // the in-app accent used to drift from this, which read as off-brand).
  // Reserved strictly for primary actions, selected/active states, and small
  // accents (icons, badges, links) -- never a page/card background fill.
  // contrast: 4.96:1 as text-on-card, 4.96:1 as white-on-fill (buttons), and
  // 4.75:1 as bare text directly on `background` -- accentStrong remains the
  // safer choice for link-style text that needs more margin above the AA
  // floor.
  accent: '#3E6FBF',
  // A light accent tint for small fills only (an icon circle, a badge) --
  // never a section or page background. contrast vs `background`: 1.14:1,
  // so pair it with a border or a card wrapper if it needs to read as
  // distinct from the bare page background rather than just tinted.
  accentSoft: '#E4ECF8',
  // Pressed/deep-emphasis state, and the safe choice for accent-colored
  // text sitting directly on `background`. contrast: 7.7-8.0:1 both
  // directions against card/white -- a real step up from accent, not just
  // a slightly-darker twin.
  accentStrong: '#2A4F8F',

  // Brand gold -- premium/verified/trust signals only, never body text (it
  // fails AA as text at 2.6:1 on light backgrounds -- always use it as a
  // fill with dark ink on top, per premiumBg/premiumText below).
  gold: '#C99A00',
  goldSoft: '#F8EFD9',

  badgeDarkBg: '#241E15',
  badgeDarkText: '#FFFFFF',

  // Premium badge: dark ink on brand gold reads clearly (6.37:1) and is the
  // familiar "premium" pairing; white-on-gold was 2.6:1 and unreadable.
  premiumBg: '#C99A00',
  premiumText: '#241E15',

  // Presence dot only (a small filled circle next to an avatar, not text).
  online: '#22C55E',
  // Anywhere online-ness needs to render as actual text, use this instead --
  // the bright green above is under 2.3:1 as text and fails AA.
  // contrast: 5.4:1 on card, 5.2:1 on background
  success: '#0F7A3D',

  favorite: '#FFFFFF',
  favoriteIcon: '#3E6FBF',

  star: '#3E6FBF',

  // contrast: 5.8:1 on card, 5.5:1 on background
  danger: '#C22A20',
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
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

// Body text starts at 16 (mobile-standards minimum); nothing sits below the
// 11pt legibility floor. `display` is reserved for one-per-screen hero
// headlines (welcome screen, empty states) — not for regular titles.
export const fontSize = {
  xs: 11,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 32,
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
    shadowColor: '#2B2620',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  raised: {
    shadowColor: '#2B2620',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
} as const;
