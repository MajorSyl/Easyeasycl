import { StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';
import { fontFamily } from '../../constants/typography';
import { TAB_BAR_CONTENT_HEIGHT } from '../../lib/use-bottom-gap';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

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
          // React Navigation's own default (Apple's 49pt content height, on
          // top of the safe-area inset) is sized for its stock 10px label --
          // this app uses an 11px label, and once you also add an explicit
          // lineHeight (below), that 49px content row genuinely doesn't have
          // room for a fixed 28px icon *plus* the label without visibly
          // clipping it. This was previously "fixed" for web only with a
          // literal height, which (a) didn't help native/the installed app
          // at all, and (b) would have been actively wrong on a device with
          // a bottom safe-area inset (home indicator / gesture bar), since a
          // literal height replaces the library's height calculation
          // entirely -- set as a bare number it leaves no room for the
          // inset, and the bar would sit under it again (the exact bug
          // "Fix bottom nav overlap app-wide" fixed earlier).
          //
          // So: give every platform the same, larger content height, with
          // the device's actual bottom inset added on top of it (mirroring
          // what the library does internally with its own 49px constant) --
          // that's what setting a numeric `height` here without also
          // shrinking the inset out of it here achieves, since React
          // Navigation still applies `paddingBottom: insets.bottom` inside
          // this exact height on its own.
          //
          // TAB_BAR_CONTENT_HEIGHT (lib/use-bottom-gap.ts) is that shared
          // constant -- keep it in sync with this, and re-measure the
          // label's actual rendered box (not just eyeball it) if either
          // this height or the label's fontSize/lineHeight ever changes.
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
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
