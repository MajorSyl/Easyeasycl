import { Platform } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Bottom padding that stays above the Android system navigation bar even on
// devices (e.g. MIUI) that wrongly report a zero bottom inset while their
// 3-button bar overlays the app.
export function useBottomGap() {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'android' ? Math.max(insets.bottom, 48) : insets.bottom;
}

// The tab bar's content height, excluding the safe-area inset -- the bar
// itself adds that inset on top of this (see app/(tabs)/_layout.tsx), and
// useBottomGap already accounts for it separately here. Same constant on
// every platform: React Navigation's own default (Apple's 49px) is sized
// for its stock 10px label, which doesn't leave enough room for this app's
// 11px label without clipping, so every platform uses this explicit,
// slightly taller value instead. Keep this in sync with the `height` set
// in app/(tabs)/_layout.tsx, and re-measure the label's actual rendered
// box (not just eyeball it) if either one changes.
export const TAB_BAR_CONTENT_HEIGHT = 58;

// Extra bottom padding for scrollable content on any of the four bottom-tab
// screens (Home/Search/Add Listing/Profile), so the last row of content
// never renders underneath the fixed tab bar.
export function useTabBarGap() {
  return useBottomGap() + TAB_BAR_CONTENT_HEIGHT;
}

// Routes that render the bottom tab bar -- any fixed/floating element
// (HelpWidget, SupportButton) needs extra bottom clearance above it there,
// and less everywhere else. Shared so the two floating buttons agree on
// exactly which screens need that extra clearance.
export const TAB_ROUTES = new Set(['/', '/search', '/add', '/profile']);

// The Property Detail screen's own sticky footer (price + Contact Agent),
// measured on-screen -- app/listing/[id].tsx's footer isn't a fixed
// constant like the tab bar, but this is close enough that a floating
// button stacked above it never sits on top of that bar's content.
const DETAIL_FOOTER_HEIGHT = 74;

// How far above the true bottom edge a floating action button (HelpWidget,
// SupportButton) needs to sit on the current screen, so it never overlaps
// the bottom tab bar or a screen's own sticky footer bar. Centralized here
// so both buttons agree on exactly the same clearance per route.
export function useFabClearance() {
  const pathname = usePathname();
  const bottomGap = useBottomGap();
  if (TAB_ROUTES.has(pathname)) return bottomGap + TAB_BAR_CONTENT_HEIGHT;
  if (pathname.startsWith('/listing/')) return bottomGap + DETAIL_FOOTER_HEIGHT;
  return bottomGap;
}
