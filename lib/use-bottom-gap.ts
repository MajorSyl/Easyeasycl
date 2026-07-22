import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Bottom padding that stays above the Android system navigation bar even on
// devices (e.g. MIUI) that wrongly report a zero bottom inset while their
// 3-button bar overlays the app.
export function useBottomGap() {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'android' ? Math.max(insets.bottom, 48) : insets.bottom;
}
