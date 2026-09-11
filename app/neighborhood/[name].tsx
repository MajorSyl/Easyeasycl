import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { type } from '../../constants/typography';
import { ListingCard } from '../../components/ListingCard';
import type { Listing } from '../../lib/types';

export default function CityListingsScreen() {
  const insets = useSafeAreaInsets();
  const { name: city } = useLocalSearchParams<{ name: string }>();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!city) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('listings')
      .select(
        'id, title, price, currency, price_unit, district, city, location, latitude, longitude, category, photos, view_count, is_premium, is_verified, owner_id, created_at, last_confirmed_at, owner:profiles(full_name, avatar_url, role)'
      )
      .eq('is_active', true)
      .eq('city', city)
      .order('created_at', { ascending: false });

    if (error) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    setLoadError(false);
    setListings((data as unknown as Listing[]) ?? []);
    setLocationFilter(null);
    setLoading(false);
  }, [city]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Drilling further into the specific Locations within this city --
  // e.g. "Goderich (3)", "Aberdeen (5)" -- as quick-filter chips rather than
  // a whole extra screen.
  const locationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of listings) counts.set(l.location, (counts.get(l.location) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [listings]);

  const filtered = locationFilter ? listings.filter((l) => l.location === locationFilter) : listings;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {city}
        </Text>
      </View>

      {locationCounts.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Pressable
            style={[styles.chip, locationFilter === null && styles.chipActive]}
            onPress={() => setLocationFilter(null)}
          >
            <Text style={[styles.chipText, locationFilter === null && styles.chipTextActive]}>
              All ({listings.length})
            </Text>
          </Pressable>
          {locationCounts.map(([loc, count]) => (
            <Pressable
              key={loc}
              style={[styles.chip, locationFilter === loc && styles.chipActive]}
              onPress={() => setLocationFilter(loc)}
            >
              <Text style={[styles.chipText, locationFilter === loc && styles.chipTextActive]}>
                {loc} ({count})
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <ListingCard listing={item} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name={loadError ? 'cloud-offline-outline' : 'home-outline'}
                size={36}
                color={colors.textMuted}
              />
              <Text style={styles.emptyStateText}>
                {loadError
                  ? "Couldn't load listings. Check your connection and try again."
                  : `No listings in ${city} yet — check back soon, or be the first to list a property here!`}
              </Text>
              {!loadError && (
                <Pressable style={styles.emptyCta} onPress={() => router.push('/add')}>
                  <Text style={styles.emptyCtaText}>List Your Property</Text>
                </Pressable>
              )}
            </View>
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
  headerTitle: { flex: 1, ...type.screenTitle, fontSize: fontSize.xl, color: colors.textPrimary },
  chipRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { ...type.labelStrong, fontSize: fontSize.xs, color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md, flexGrow: 1 },
  row: { gap: spacing.md },
  emptyState: { paddingTop: spacing.xxl, alignItems: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
  emptyStateText: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center' },
  emptyCta: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  emptyCtaText: { ...type.button, fontSize: fontSize.sm, color: '#fff' },
});
