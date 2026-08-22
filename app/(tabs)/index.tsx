import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { subscribeListingsChanged } from '../../lib/listings-cache-bus';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { ListingCard } from '../../components/ListingCard';
import { FilterPills, type PillOption } from '../../components/FilterPills';
import { Logo } from '../../components/Logo';
import type { Listing, ListingCategory } from '../../lib/types';

type CategoryFilter = 'all' | ListingCategory;

const categoryOptions: PillOption<CategoryFilter>[] = [
  { value: 'all', label: 'All Properties' },
  { value: 'for_rent', label: 'For Rent' },
  { value: 'for_sale', label: 'For Sale' },
  { value: 'land', label: 'Land' },
  { value: 'daily_hourly', label: 'Daily/Hourly' },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Switching category filters shouldn't re-hit the network every time if we
  // already have recent data for that filter — only refetch once the cached
  // copy is more than a minute old, or on pull-to-refresh.
  const CACHE_TTL_MS = 60_000;
  const cacheRef = useRef<Map<CategoryFilter, { rows: Listing[]; fetchedAt: number }>>(new Map());

  const load = useCallback(
    async (force = false) => {
      const cached = cacheRef.current.get(categoryFilter);
      if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        setListings(cached.rows);
        setLoadError(false);
        return;
      }
      let query = supabase
        .from('listings')
        .select('id, title, price, currency, price_unit, location, category, photos, view_count, is_premium, owner_id, created_at, owner:profiles(full_name, avatar_url, role)')
        .order('created_at', { ascending: false });
      if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);
      const { data, error } = await query;
      if (error) {
        setLoadError(true);
        return;
      }
      setLoadError(false);
      const rows = (data as unknown as Listing[]) ?? [];
      cacheRef.current.set(categoryFilter, { rows, fetchedAt: Date.now() });
      setListings(rows);
    },
    [categoryFilter]
  );

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  // Keep a ref to the latest `load` so the subscription callback never needs
  // to re-subscribe just because section/filter changed.
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);

  useEffect(
    () =>
      subscribeListingsChanged(() => {
        cacheRef.current = new Map();
        loadRef.current(true);
      }),
    [] // stable — never re-subscribes
  );

  const loadUnreadCount = useCallback(async () => {
    if (!session) {
      setUnreadCount(0);
      return;
    }
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .or(`participant_one.eq.${session.user.id},participant_two.eq.${session.user.id}`);
    const ids = (conversations ?? []).map((c) => c.id);
    if (ids.length === 0) {
      setUnreadCount(0);
      return;
    }
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', ids)
      .is('read_at', null)
      .neq('sender_id', session.user.id);
    setUnreadCount(count ?? 0);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadUnreadCount();
    }, [loadUnreadCount])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([load(true), loadUnreadCount()]);
    setRefreshing(false);
  }

  function openMessages() {
    router.push(session ? '/messages' : '/auth');
  }

  function openProfile() {
    router.push(session ? '/profile' : '/auth');
  }

  const renderListing = useCallback(
    ({ item }: { item: Listing }) => <ListingCard listing={item} />,
    []
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.brandRow}>
        <Logo size={150} />
      </View>
      <View style={styles.topBar}>
        <Pressable style={styles.searchBar} onPress={() => router.push('/search')}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Text style={styles.searchPlaceholder}>Search properties, land, neighborhoods...</Text>
        </Pressable>
        <Pressable style={styles.iconButton} onPress={() => router.push(session ? '/notifications' : '/auth')} hitSlop={8}>
          <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>
        <Pressable style={styles.iconButton} onPress={openMessages} hitSlop={8}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textPrimary} />
          {unreadCount > 0 && <View style={styles.unreadDot} />}
        </Pressable>
        <Pressable style={styles.iconButton} onPress={openProfile} hitSlop={8}>
          <Ionicons name="person-circle-outline" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.pillsWrap}>
        <FilterPills options={categoryOptions} value={categoryFilter} onChange={setCategoryFilter} />
      </View>

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={renderListing}
        ListEmptyComponent={
          !loading ? (
            <EmptyState label={loadError ? "Couldn't load properties. Pull down to try again." : 'No properties yet'} />
          ) : null
        }
      />
    </View>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  brandRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchPlaceholder: { color: colors.textMuted, fontSize: fontSize.sm },
  iconButton: { padding: 4 },
  unreadDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  unreadBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  pillsWrap: { paddingTop: spacing.sm, paddingBottom: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  row: { gap: spacing.md },
  emptyState: { paddingTop: spacing.xxl, alignItems: 'center' },
  emptyStateText: { color: colors.textMuted, fontSize: fontSize.sm },
});
