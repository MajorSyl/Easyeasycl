import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, fontSize, fontWeight, radius, spacing } from '../constants/theme';
import { type } from '../constants/typography';
import { SIERRA_LEONE_DISTRICTS, type District } from '../constants/locations';
import { nearestCity } from '../lib/geo';
import { useDeviceLocation } from '../lib/use-device-location';

type CityRow = { city: string; district: string; count: number };
type Section = { title: string; data: CityRow[] };

// "Browse by Location" -- nationwide now, not Freetown-only: every known
// city/town is listed (not just ones with active listings -- an empty city
// is still browsable, it just shows the empty state once you drill in),
// grouped by district, with the user's own city floated to the top once
// location permission is granted.
export default function BrowseByLocationScreen() {
  const insets = useSafeAreaInsets();
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [myCity, setMyCity] = useState<string | null>(null);
  const { requesting, request } = useDeviceLocation();

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('listings').select('city').eq('is_active', true);
    if (error) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    setLoadError(false);
    const next = new Map<string, number>();
    for (const row of data ?? []) {
      if (!row.city) continue;
      next.set(row.city, (next.get(row.city) ?? 0) + 1);
    }
    setCounts(next);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function useMyLocation() {
    const coords = await request();
    if (!coords) return;
    const nearest = nearestCity(coords.lat, coords.lng);
    if (nearest) setMyCity(nearest.city);
  }

  const districts: District[] = myCity
    ? [
        ...SIERRA_LEONE_DISTRICTS.filter((d) => d.cities.includes(myCity!)),
        ...SIERRA_LEONE_DISTRICTS.filter((d) => !d.cities.includes(myCity!)),
      ]
    : SIERRA_LEONE_DISTRICTS;

  const sections: Section[] = districts.map((d) => ({
    title: d.name,
    data: [...d.cities]
      .sort((a, b) => (a === myCity ? -1 : b === myCity ? 1 : 0) || (counts.get(b) ?? 0) - (counts.get(a) ?? 0))
      .map((city) => ({ city, district: d.name, count: counts.get(city) ?? 0 })),
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Browse by Location</Text>
      </View>

      <Pressable style={styles.locationPrompt} onPress={useMyLocation} disabled={requesting}>
        {requesting ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Ionicons name="navigate-outline" size={16} color={colors.accent} />
        )}
        <Text style={styles.locationPromptText}>
          {myCity ? `Showing ${myCity} first` : 'Use my location to find my city'}
        </Text>
      </Pressable>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.city}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => <Text style={styles.districtHeader}>{section.title}</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/neighborhood/${encodeURIComponent(item.city)}`)}>
              <View style={styles.rowIcon}>
                <Ionicons name="location-outline" size={18} color={colors.accent} />
              </View>
              <Text style={styles.rowName}>{item.city}</Text>
              <Text style={styles.rowCount}>
                {item.count} listing{item.count === 1 ? '' : 's'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          )}
          ListEmptyComponent={
            loadError ? (
              <View style={styles.emptyState}>
                <Ionicons name="cloud-offline-outline" size={36} color={colors.textMuted} />
                <Text style={styles.emptyStateText}>Couldn't load locations. Check your connection and try again.</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitle: { ...type.screenTitle, fontSize: fontSize.xl, color: colors.textPrimary },
  locationPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
  },
  locationPromptText: { ...type.bodyMedium, fontSize: fontSize.sm, color: colors.accentStrong },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm, flexGrow: 1 },
  districtHeader: {
    ...type.labelStrong,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    backgroundColor: colors.background,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: { flex: 1, ...type.bodyMedium, fontSize: fontSize.md, color: colors.textPrimary },
  rowCount: { ...type.secondary, fontSize: fontSize.sm, color: colors.textMuted },
  emptyState: { paddingTop: spacing.xxl, alignItems: 'center', gap: spacing.sm },
  emptyStateText: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center', paddingHorizontal: spacing.xl },
});
