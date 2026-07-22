import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { colors, fontSize, spacing } from '../constants/theme';
import { ListingCard } from '../components/ListingCard';
import { HotelCard } from '../components/HotelCard';
import { ServiceCard } from '../components/ServiceCard';
import { getOrCreateConversation } from '../lib/conversations';
import type { Hotel, Listing, Service } from '../lib/types';

type FavoriteItem =
  | { kind: 'listing'; id: string; savedAt: string; data: Listing }
  | { kind: 'hotel'; id: string; savedAt: string; data: Hotel }
  | { kind: 'service'; id: string; savedAt: string; data: Service };

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data: favorites } = await supabase
      .from('favorites')
      .select('item_type, item_id, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    const rows = favorites ?? [];
    const listingIds = rows.filter((r) => r.item_type === 'listing').map((r) => r.item_id);
    const hotelIds = rows.filter((r) => r.item_type === 'hotel').map((r) => r.item_id);
    const serviceIds = rows.filter((r) => r.item_type === 'service').map((r) => r.item_id);

    const ownerJoin = '*, owner:profiles(full_name, avatar_url, role)';
    const [listings, hotels, services] = await Promise.all([
      listingIds.length ? supabase.from('listings').select(ownerJoin).in('id', listingIds) : Promise.resolve({ data: [] }),
      hotelIds.length ? supabase.from('hotels').select(ownerJoin).in('id', hotelIds) : Promise.resolve({ data: [] }),
      serviceIds.length ? supabase.from('services').select(ownerJoin).in('id', serviceIds) : Promise.resolve({ data: [] }),
    ]);

    const byId = new Map<string, FavoriteItem>();
    for (const item of (listings.data as Listing[]) ?? []) {
      byId.set(`listing-${item.id}`, { kind: 'listing', id: item.id, savedAt: '', data: item });
    }
    for (const item of (hotels.data as Hotel[]) ?? []) {
      byId.set(`hotel-${item.id}`, { kind: 'hotel', id: item.id, savedAt: '', data: item });
    }
    for (const item of (services.data as Service[]) ?? []) {
      byId.set(`service-${item.id}`, { kind: 'service', id: item.id, savedAt: '', data: item });
    }

    // Keep the order the user saved them in (newest first)
    const ordered: FavoriteItem[] = [];
    for (const row of rows) {
      const found = byId.get(`${row.item_type}-${row.item_id}`);
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

  async function handleHire(service: Service) {
    if (!session) {
      router.push('/auth');
      return;
    }
    try {
      const conversationId = await getOrCreateConversation(session.user.id, service.owner_id, null);
      router.push(`/messages/${conversationId}`);
    } catch {
      // ServiceCard press still opens the detail page where Hire can be retried
    }
  }

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
          renderItem={({ item }) => {
            if (item.kind === 'listing') return <ListingCard listing={item.data} />;
            if (item.kind === 'hotel') return <HotelCard hotel={item.data} />;
            return <ServiceCard service={item.data} onHire={() => handleHire(item.data)} />;
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyStateTitle}>No favorites yet</Text>
              <Text style={styles.emptyStateText}>
                Tap the heart on any listing, hotel, or service to save it here.
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
