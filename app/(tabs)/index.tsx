import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { friendlyErrorMessage } from '../../lib/errors';
import { useAuth } from '../../lib/auth-context';
import { getOrCreateConversation } from '../../lib/conversations';
import { subscribeListingsChanged } from '../../lib/listings-cache-bus';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { ListingCard } from '../../components/ListingCard';
import { HotelCard } from '../../components/HotelCard';
import { ServiceCard } from '../../components/ServiceCard';
import { FilterPills, type PillOption } from '../../components/FilterPills';
import type { Hotel, Listing, ListingCategory, Service } from '../../lib/types';

type Section = 'properties' | 'hotels' | 'services';
type CategoryFilter = 'all' | ListingCategory;

const sectionOptions: PillOption<Section>[] = [
  { value: 'properties', label: 'Properties' },
  { value: 'hotels', label: 'Hotels' },
  { value: 'services', label: 'Services' },
];

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
  const [section, setSection] = useState<Section>('properties');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [listings, setListings] = useState<Listing[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Switching between Properties/Hotels/Services shouldn't re-hit the network
  // every time if we already have recent data for that tab — only refetch
  // once the cached copy is more than a minute old, or on pull-to-refresh.
  const CACHE_TTL_MS = 60_000;
  const cacheRef = useRef<{
    listings: Map<CategoryFilter, { rows: Listing[]; fetchedAt: number }>;
    hotels: { rows: Hotel[]; fetchedAt: number } | null;
    services: { rows: Service[]; fetchedAt: number } | null;
  }>({ listings: new Map(), hotels: null, services: null });

  const load = useCallback(
    async (force = false) => {
      if (section === 'properties') {
        const cached = cacheRef.current.listings.get(categoryFilter);
        if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
          setListings(cached.rows);
          return;
        }
        let query = supabase
          .from('listings')
          .select('*, owner:profiles(full_name, avatar_url, role)')
          .order('created_at', { ascending: false });
        if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);
        const { data } = await query;
        const rows = (data as Listing[]) ?? [];
        cacheRef.current.listings.set(categoryFilter, { rows, fetchedAt: Date.now() });
        setListings(rows);
      } else if (section === 'hotels') {
        const cached = cacheRef.current.hotels;
        if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
          setHotels(cached.rows);
          return;
        }
        const { data } = await supabase
          .from('hotels')
          .select('*, owner:profiles(full_name, avatar_url, role)')
          .order('created_at', { ascending: false });
        const rows = (data as Hotel[]) ?? [];
        cacheRef.current.hotels = { rows, fetchedAt: Date.now() };
        setHotels(rows);
      } else {
        const cached = cacheRef.current.services;
        if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
          setServices(cached.rows);
          return;
        }
        const { data } = await supabase
          .from('services')
          .select('*, owner:profiles(full_name, avatar_url, role)')
          .order('created_at', { ascending: false });
        const rows = (data as Service[]) ?? [];
        cacheRef.current.services = { rows, fetchedAt: Date.now() };
        setServices(rows);
      }
    },
    [section, categoryFilter]
  );

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(
    () =>
      subscribeListingsChanged(() => {
        cacheRef.current = { listings: new Map(), hotels: null, services: null };
        load(true);
      }),
    [load]
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

  async function handleHire(service: Service) {
    if (!session) {
      router.push('/auth');
      return;
    }
    try {
      const conversationId = await getOrCreateConversation(session.user.id, service.owner_id, null);
      router.push(`/messages/${conversationId}`);
    } catch (err) {
      Alert.alert('Could not start conversation', friendlyErrorMessage(err));
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable style={styles.searchBar} onPress={() => router.push('/search')}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Text style={styles.searchPlaceholder}>Search properties, land, services...</Text>
        </Pressable>
        <Pressable style={styles.iconButton} onPress={() => router.push(session ? '/notifications' : '/auth')}>
          <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>
        <Pressable style={styles.iconButton} onPress={openMessages}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textPrimary} />
          {unreadCount > 0 && <View style={styles.unreadDot} />}
        </Pressable>
        <Pressable style={styles.iconButton} onPress={openProfile}>
          <Ionicons name="person-circle-outline" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.sectionTabs}>
        {sectionOptions.map((option) => {
          const active = option.value === section;
          return (
            <Pressable key={option.value} style={styles.sectionTab} onPress={() => setSection(option.value)}>
              <Text style={[styles.sectionTabText, active && styles.sectionTabTextActive]}>{option.label}</Text>
              {active && <View style={styles.sectionTabIndicator} />}
            </Pressable>
          );
        })}
      </View>

      {section === 'properties' && (
        <View style={styles.pillsWrap}>
          <FilterPills options={categoryOptions} value={categoryFilter} onChange={setCategoryFilter} />
        </View>
      )}

      {section === 'properties' && (
        <FlatList
          data={listings}
          key="properties-grid"
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          renderItem={({ item }) => <ListingCard listing={item} />}
          ListEmptyComponent={!loading ? <EmptyState label="No properties yet" /> : null}
        />
      )}

      {section === 'hotels' && (
        <FlatList
          data={hotels}
          key="hotels-list"
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          renderItem={({ item }) => <HotelCard hotel={item} />}
          ListEmptyComponent={!loading ? <EmptyState label="No hotels yet" /> : null}
        />
      )}

      {section === 'services' && (
        <FlatList
          data={services}
          key="services-list"
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          renderItem={({ item }) => <ServiceCard service={item} onHire={() => handleHire(item)} />}
          ListEmptyComponent={!loading ? <EmptyState label="No services yet" /> : null}
        />
      )}
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
  sectionTabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTab: { paddingBottom: spacing.sm },
  sectionTabText: { fontSize: fontSize.md, color: colors.textMuted, fontWeight: '600' },
  sectionTabTextActive: { color: colors.accent },
  sectionTabIndicator: {
    marginTop: spacing.sm,
    height: 2,
    backgroundColor: colors.accent,
    borderRadius: 1,
  },
  pillsWrap: { paddingVertical: spacing.md },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  row: { gap: spacing.md },
  emptyState: { paddingTop: spacing.xxl, alignItems: 'center' },
  emptyStateText: { color: colors.textMuted, fontSize: fontSize.sm },
});
