// Design tokens. Ice-blue / electric-blue palette — soft sky-blue screen
// backgrounds with white cards and a vibrant blue accent for CTAs, matched
// against WCAG AA (4.5:1 for text, 3:1 for large text / UI components)
// rather than chosen by eye — see the `contrast` comments for the pairs
// that matter.
export const colors = {
  background: '#EBF3FF',
  card: '#FFFFFF',
  border: '#DBEAFE',

  textPrimary: '#0F172A',
  // contrast: 7.6:1 on card, 6.8:1 on background
  textSecondary: '#475569',
  // contrast: 5.5:1 on card, 4.9:1 on background — the spec's literal
  // #64748B only clears 4.3:1 against the new icy-blue background (fails
  // the 4.5:1 AA floor), so this is darkened slightly from the reference.
  textMuted: '#5A6B80',

  // Vibrant electric blue, used for primary CTAs and the active filter state.
  // contrast: 5.8:1 both as text-on-white and white-on-fill (buttons).
  accent: '#0052FF',
  accentSoft: '#DBEAFE',
  accentStrong: '#0043D1',

  // Brand gold — kept for premium/verified/rating signals of trust and
  // status, distinct from the blue interaction color so the two meanings
  // never collide on screen.
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
  // text and fails AA. Darkened from #15803D, which only cleared 4.49:1
  // against the new icy-blue background — just under the 4.5:1 AA floor.
  success: '#106B30',

  favorite: '#FFFFFF',
  favoriteIcon: '#3B82F6',

  star: '#3B82F6',

  // contrast: 5.8:1 on card, 5.2:1 on background — was #D6392F, which
  // dropped to 4.19:1 against the new icy-blue background (fails AA)
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
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
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
