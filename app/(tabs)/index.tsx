import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { ListingCard } from '../../components/ListingCard';
import { FilterPills, type PillOption } from '../../components/FilterPills';
import { formatPrice, initialsFor } from '../../lib/format';
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

  const load = useCallback(async () => {
    if (section === 'properties') {
      let query = supabase
        .from('listings')
        .select('*, owner:profiles(full_name, avatar_url, role)')
        .order('created_at', { ascending: false });
      if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);
      const { data } = await query;
      setListings((data as Listing[]) ?? []);
    } else if (section === 'hotels') {
      const { data } = await supabase
        .from('hotels')
        .select('*, owner:profiles(full_name, avatar_url, role)')
        .order('created_at', { ascending: false });
      setHotels((data as Hotel[]) ?? []);
    } else {
      const { data } = await supabase
        .from('services')
        .select('*, owner:profiles(full_name, avatar_url, role)')
        .order('created_at', { ascending: false });
      setServices((data as Service[]) ?? []);
    }
  }, [section, categoryFilter]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

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
    await Promise.all([load(), loadUnreadCount()]);
    setRefreshing(false);
  }

  function openMessages() {
    router.push(session ? '/messages' : '/auth');
  }

  function openProfile() {
    router.push(session ? '/profile' : '/auth');
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable style={styles.searchBar} onPress={() => router.push('/search')}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Text style={styles.searchPlaceholder}>Search properties, land, services...</Text>
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
          renderItem={({ item }) => (
            <View style={styles.simpleCard}>
              <Text style={styles.simpleCardTitle}>{item.name}</Text>
              <Text style={styles.simpleCardSubtitle}>{item.location}</Text>
              <Text style={styles.simpleCardPrice}>
                {formatPrice(item.rate, item.currency, item.rate_unit)} · {initialsFor(item.owner?.full_name ?? null)} ★{' '}
                {item.rating.toFixed(1)} ({item.rating_count})
              </Text>
            </View>
          )}
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
          renderItem={({ item }) => (
            <View style={styles.simpleCard}>
              <Text style={styles.simpleCardTitle}>{item.business_name}</Text>
              <Text style={styles.simpleCardSubtitle}>
                {item.category} · {item.location}
              </Text>
              <Text style={styles.simpleCardPrice}>
                {formatPrice(item.rate, item.currency, item.rate_unit)} · ★ {item.rating.toFixed(1)} ({item.rating_count})
              </Text>
            </View>
          )}
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
  simpleCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  simpleCardTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  simpleCardSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  simpleCardPrice: { fontSize: fontSize.sm, color: colors.accent, fontWeight: '600', marginTop: spacing.xs },
  emptyState: { paddingTop: spacing.xxl, alignItems: 'center' },
  emptyStateText: { color: colors.textMuted, fontSize: fontSize.sm },
});
