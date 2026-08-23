import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Bottom padding that stays above the Android system navigation bar even on
// devices (e.g. MIUI) that wrongly report a zero bottom inset while their
// 3-button bar overlays the app.
export function useBottomGap() {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'android' ? Math.max(insets.bottom, 48) : insets.bottom;
}

// Default React Navigation bottom tab bar content height (excludes the
// safe-area inset, which the tab bar adds on top of this and which
// useBottomGap already accounts for separately).
export const TAB_BAR_HEIGHT = 56;

// Extra bottom padding for scrollable content on any of the four bottom-tab
// screens (Home/Search/Add Listing/Profile), so the last row of content
// never renders underneath the fixed tab bar.
export function useTabBarGap() {
  return useBottomGap() + TAB_BAR_HEIGHT;
}
