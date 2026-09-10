import { Platform } from 'react-native';
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
