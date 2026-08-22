import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { colors, fontSize, spacing } from '../constants/theme';
import { ListingCard } from '../components/ListingCard';
import type { Listing } from '../lib/types';

type FavoriteItem = { kind: 'listing'; id: string; savedAt: string; data: Listing };

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!session) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data: favorites, error: favoritesError } = await supabase
      .from('favorites')
      .select('item_type, item_id, created_at')
      .eq('user_id', session.user.id)
      .eq('item_type', 'listing')
      .order('created_at', { ascending: false });

    if (favoritesError) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    setLoadError(false);

    const rows = favorites ?? [];
    const listingIds = rows.map((r) => r.item_id);

    const ownerJoin = '*, owner:profiles(full_name, avatar_url, role)';
    const { data: listings } = listingIds.length
      ? await supabase.from('listings').select(ownerJoin).in('id', listingIds)
      : { data: [] };

    const byId = new Map<string, FavoriteItem>();
    for (const item of (listings as Listing[]) ?? []) {
      byId.set(item.id, { kind: 'listing', id: item.id, savedAt: '', data: item });
    }

    // Keep the order the user saved them in (newest first)
    const ordered: FavoriteItem[] = [];
    for (const row of rows) {
      const found = byId.get(row.item_id);
      if (found) ordered.push({ ...found, savedAt: row.created_at });
    }

    setItems(ordered);
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Ionicons name="heart" size={18} color={colors.favoriteIcon} />
        <Text style={styles.headerTitle}>Saved</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <ListingCard listing={item.data} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyStateTitle}>{loadError ? "Couldn't load favorites" : 'No favorites yet'}</Text>
              <Text style={styles.emptyStateText}>
                {loadError
                  ? 'Check your connection and try again.'
                  : 'Tap the heart on any listing to save it here.'}
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
  headerTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md, flexGrow: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyStateTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  emptyStateText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
});
