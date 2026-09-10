import { Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { fontFamily } from '../../constants/typography';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          // A plain white bar sitting directly on the app's blue background
          // read as a mismatched, disconnected rectangle rather than an
          // intentional surface -- a soft shadow cast *upward* (negative
          // height offset, since this bar is docked to the bottom) makes it
          // read as elevated/floating instead. `elevation` covers Android;
          // shadow* covers iOS/web.
          shadowColor: '#2B2620',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 8,
          // React Navigation sizes the tab bar around the device's safe-area
          // inset by default. On a real mobile browser that inset can come
          // back oversized (there's no actual notch/gesture-bar for a
          // website to clear -- the browser's own chrome already sits
          // outside the page), which showed up as a large dead gap of blank
          // space below the bar. Web gets a fixed height instead of relying
          // on that calculation; native iOS/Android keep the automatic
          // safe-area-aware sizing, which is correct there.
          //
          // IMPORTANT: don't add vertical padding here on top of this fixed
          // height. Each tab item already reserves a fixed 28px for its icon
          // plus its own 5px top/bottom padding (~38px total) before the
          // label gets whatever's left -- extra padding on the bar itself
          // eats directly into that remainder and squeezes the label's line
          // box short enough to clip descenders (the previous fix here --
          // height:64 + paddingTop/Bottom:8 -- left only 9px for an 11px
          // label, which is what caused that). 58px leaves the label ~20px,
          // comfortably clear of the icon and any descenders. If this height
          // ever changes, keep lib/use-bottom-gap.ts's TAB_BAR_HEIGHT in
          // sync and re-measure the label's rendered box (not just eyeball
          // it) before shipping.
          ...(Platform.OS === 'web' && { height: 58 }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: fontFamily.labelMedium,
          lineHeight: 15,
          // Never let this Text be the thing that gets compressed if space
          // is ever tight again -- if it doesn't fit, it should visibly
          // overflow (easy to spot) rather than silently clip (easy to miss).
          flexShrink: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add Listing',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
