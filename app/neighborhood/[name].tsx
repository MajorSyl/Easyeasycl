import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors, fontSize, fontWeight, spacing } from '../../constants/theme';
import { ListingCard } from '../../components/ListingCard';
import type { Listing } from '../../lib/types';

export default function NeighborhoodListingsScreen() {
  const insets = useSafeAreaInsets();
  const { name } = useLocalSearchParams<{ name: string }>();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!name) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('listings')
      .select(
        'id, title, price, currency, price_unit, location, category, photos, view_count, is_premium, owner_id, created_at, last_confirmed_at, owner:profiles(full_name, avatar_url, role)'
      )
      .eq('is_active', true)
      .ilike('location', `%${name}%`)
      .order('created_at', { ascending: false });

    if (error) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    setLoadError(false);
    setListings((data as unknown as Listing[]) ?? []);
    setLoading(false);
  }, [name]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {name}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={listings}
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
                  : `No active listings in ${name} yet.`}
              </Text>
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
  headerTitle: { flex: 1, fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  row: { gap: spacing.md },
  emptyState: { paddingTop: spacing.xxl, alignItems: 'center', paddingHorizontal: spacing.xl, gap: spacing.sm },
  emptyStateText: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center' },
});
