import { Platform } from 'react-native';
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
          borderTopColor: colors.border,
          // React Navigation sizes the tab bar around the device's safe-area
          // inset by default. On a real mobile browser that inset can come
          // back oversized (there's no actual notch/gesture-bar for a
          // website to clear -- the browser's own chrome already sits
          // outside the page), which showed up as a large dead gap of blank
          // space below the bar. Web gets a fixed, compact height instead of
          // relying on that calculation; native iOS/Android keep the
          // automatic safe-area-aware sizing, which is correct there.
          ...(Platform.OS === 'web' && { height: 64, paddingBottom: 8, paddingTop: 8 }),
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: fontFamily.labelMedium },
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
