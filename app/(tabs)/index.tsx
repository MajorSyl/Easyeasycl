import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { subscribeListingsChanged } from '../../lib/listings-cache-bus';
import { readCache, writeCache } from '../../lib/offline-cache';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '../../constants/theme';
import { useTabBarGap } from '../../lib/use-bottom-gap';
import { ListingCard } from '../../components/ListingCard';
import { PropertyCard } from '../../components/PropertyCard';
import { FilterPills, type PillOption } from '../../components/FilterPills';
import { EdgeFade } from '../../components/EdgeFade';
import { DownloadAppBanner } from '../../components/DownloadAppBanner';
import { initialsFor } from '../../lib/format';
import type { Listing, ListingCategory } from '../../lib/types';

type CategoryFilter = 'all' | ListingCategory;

const HOME_FEED_CACHE_KEY = 'easyfen_home_feed_cache_v1';

const categoryOptions: PillOption<CategoryFilter>[] = [
  { value: 'all', label: 'All Properties' },
  { value: 'for_rent', label: 'For Rent' },
  { value: 'for_sale', label: 'For Sale' },
  { value: 'land', label: 'Land' },
  { value: 'daily_hourly', label: 'Daily/Hourly' },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const tabBarGap = useTabBarGap();
  const { session, profile } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showingSavedData, setShowingSavedData] = useState(false);

  // Switching category filters shouldn't re-hit the network every time if we
  // already have recent data for that filter — only refetch once the cached
  // copy is more than a minute old, or on pull-to-refresh.
  const CACHE_TTL_MS = 60_000;
  // Also the offline fallback: this same map is persisted to disk (see
  // HOME_FEED_CACHE_KEY below) so a fetch failure can fall back to the last
  // successfully loaded feed instead of an empty/error screen.
  const cacheRef = useRef<Map<CategoryFilter, { rows: Listing[]; fetchedAt: number }>>(new Map());
  const hydratedRef = useRef(false);

  const persistCache = useCallback(() => {
    writeCache(HOME_FEED_CACHE_KEY, Object.fromEntries(cacheRef.current));
  }, []);

  const load = useCallback(
    async (force = false) => {
      const cached = cacheRef.current.get(categoryFilter);
      if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        setListings(cached.rows);
        setLoadError(false);
        setShowingSavedData(false);
        return;
      }
      let query = supabase
        .from('listings')
        .select('id, title, price, currency, price_unit, location, category, photos, view_count, is_premium, owner_id, created_at, last_confirmed_at, owner:profiles(full_name, avatar_url, role)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);
      const { data, error } = await query;
      if (error) {
        if (cached) {
          setListings(cached.rows);
          setLoadError(false);
          setShowingSavedData(true);
        } else {
          setLoadError(true);
          setShowingSavedData(false);
        }
        return;
      }
      setLoadError(false);
      setShowingSavedData(false);
      const rows = (data as unknown as Listing[]) ?? [];
      cacheRef.current.set(categoryFilter, { rows, fetchedAt: Date.now() });
      setListings(rows);
      persistCache();
    },
    [categoryFilter, persistCache]
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!hydratedRef.current) {
        const persisted = await readCache<Record<string, { rows: Listing[]; fetchedAt: number }>>(HOME_FEED_CACHE_KEY);
        if (persisted && !cancelled) {
          for (const [key, value] of Object.entries(persisted)) {
            cacheRef.current.set(key as CategoryFilter, value);
          }
        }
        hydratedRef.current = true;
      }
      if (cancelled) return;
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    }
    run();
    return () => {
      cancelled = true;
    };
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

    let unreadMessages = 0;
    if (ids.length > 0) {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', ids)
        .is('read_at', null)
        .neq('sender_id', session.user.id);
      unreadMessages = count ?? 0;
    }

    const { count: unreadMatches } = await supabase
      .from('saved_search_matches')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .is('read_at', null);

    setUnreadCount(unreadMessages + (unreadMatches ?? 0));
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

  function openAddListing() {
    router.push(session ? '/add' : '/auth');
  }

  // "New Listings" — a fresh-first strip, not a fake proximity search (the
  // app has no geolocation data to actually rank by "near you").
  const freshListings = useMemo(() => listings.slice(0, 10), [listings]);
  // "Recommended" surfaces boosted/featured listings when there are any —
  // real product purpose for the paid boost feature — and falls back to the
  // full feed once inventory of boosted listings is thin.
  const recommended = useMemo(() => {
    const featured = listings.filter((l) => l.is_premium);
    return featured.length > 0 ? featured : listings;
  }, [listings]);

  const firstName = profile?.full_name?.trim().split(' ')[0];

  const renderFreshCard = useCallback(
    ({ item }: { item: Listing }) => (
      <View style={styles.freshCard}>
        <ListingCard listing={item} />
      </View>
    ),
    []
  );

  const renderRecommendedCard = useCallback(
    ({ item }: { item: Listing }) => (
      <View style={styles.recommendedCard}>
        <PropertyCard listing={item} />
      </View>
    ),
    []
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={recommended}
        keyExtractor={(item) => item.id}
        renderItem={renderRecommendedCard}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarGap + spacing.lg }]}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <View style={styles.greetingBlock}>
                <Text style={styles.greeting}>{firstName ? `Hello ${firstName}!` : 'Hello!'}</Text>
                <Text style={styles.headline}>Find Your{'\n'}Dream Home</Text>
              </View>
              <View style={styles.headerIcons}>
                <Pressable
                  style={styles.iconButton}
                  onPress={() => router.push(session ? '/notifications' : '/auth')}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Notifications"
                  accessibilityHint={unreadCount > 0 ? `${unreadCount} unread` : undefined}
                >
                  <Ionicons name="notifications-outline" size={18} color={colors.textPrimary} />
                  {unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                  )}
                </Pressable>
                <Pressable
                  style={styles.iconButton}
                  onPress={openMessages}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Messages"
                  accessibilityHint={unreadCount > 0 ? 'You have unread messages' : undefined}
                >
                  <Ionicons name="chatbubble-outline" size={18} color={colors.textPrimary} />
                  {unreadCount > 0 && <View style={styles.unreadDot} />}
                </Pressable>
                <Pressable
                  style={styles.avatar}
                  onPress={openProfile}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Your profile"
                >
                  {profile?.avatar_url ? (
                    <Image
                      source={{ uri: profile.avatar_url }}
                      style={styles.avatarImage}
                      contentFit="cover"
                      accessible
                      accessibilityLabel="Your profile photo"
                    />
                  ) : (
                    <Text style={styles.avatarText}>{initialsFor(profile?.full_name ?? null)}</Text>
                  )}
                </Pressable>
              </View>
            </View>

            <DownloadAppBanner />

            {showingSavedData && (
              <View style={styles.offlineBanner}>
                <Ionicons name="cloud-offline-outline" size={16} color={colors.textMuted} />
                <Text style={styles.offlineBannerText}>Showing saved listings — check your connection</Text>
              </View>
            )}

            <Pressable
              style={styles.searchBar}
              onPress={() => router.push('/search')}
              accessibilityRole="search"
              accessibilityLabel="Search properties, land, and neighborhoods"
            >
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <Text style={styles.searchPlaceholder}>Search your location</Text>
            </Pressable>

            <Pressable style={styles.neighborhoodRow} onPress={() => router.push('/neighborhoods')}>
              <View style={styles.neighborhoodIcon}>
                <Ionicons name="location-outline" size={16} color={colors.accent} />
              </View>
              <Text style={styles.neighborhoodRowText}>Browse by Neighborhood</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            <View style={styles.pillsWrap}>
              <FilterPills options={categoryOptions} value={categoryFilter} onChange={setCategoryFilter} />
            </View>

            <Pressable
              style={styles.sellBanner}
              onPress={openAddListing}
              accessibilityRole="button"
              accessibilityLabel="List your property"
              accessibilityHint="Opens the form to post a new listing for rent, sale, or land"
            >
              <View style={styles.sellBannerIcon}>
                <Ionicons name="megaphone-outline" size={20} color="#fff" />
              </View>
              <View style={styles.sellBannerBody}>
                <Text style={styles.sellBannerTitle}>List Your Property</Text>
                <Text style={styles.sellBannerSubtitle}>Reach renters and buyers across Sierra Leone</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </Pressable>

            {freshListings.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>New Listings</Text>
                <View style={styles.freshCarouselWrap}>
                  <FlatList
                    data={freshListings}
                    keyExtractor={(item) => item.id}
                    renderItem={renderFreshCard}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.freshRow}
                  />
                  <EdgeFade />
                </View>
              </View>
            )}

            <View style={[styles.section, styles.recommendedHeader]}>
              <Text style={styles.sectionTitle}>Recommended</Text>
              <Pressable onPress={() => router.push('/search')} hitSlop={8}>
                <Text style={styles.viewAll}>View All</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <EmptyState label={loadError ? "Couldn't load properties. Pull down to try again." : 'No properties yet'} />
          )
        }
      />
    </View>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="home-outline" size={36} color={colors.textMuted} />
      <Text style={styles.emptyStateText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  greetingBlock: { flex: 1 },
  greeting: { fontSize: fontSize.sm, color: colors.textMuted },
  headline: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.textPrimary, marginTop: 4, lineHeight: 32 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
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
  unreadBadgeText: { color: '#fff', fontSize: 9, fontWeight: fontWeight.bold },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.card,
    ...shadow.card,
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.accent },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  searchPlaceholder: { color: colors.textMuted, fontSize: fontSize.sm },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  offlineBannerText: { flex: 1, fontSize: fontSize.xs, color: colors.textMuted },
  sellBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    minHeight: 44,
    ...shadow.raised,
  },
  sellBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellBannerBody: { flex: 1 },
  sellBannerTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: '#fff' },
  sellBannerSubtitle: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.92)', marginTop: 2 },
  neighborhoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  neighborhoodIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  neighborhoodRowText: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  pillsWrap: { paddingBottom: spacing.md },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
  recommendedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  viewAll: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.accent },
  // No fixed height here — a card's text can grow taller under large
  // system font sizes (Dynamic Type), and a hard-clipped height would
  // truncate or overlap that content instead of just growing the row.
  freshCarouselWrap: { position: 'relative' },
  freshRow: { paddingLeft: spacing.lg, paddingRight: spacing.xxl, gap: spacing.md, alignItems: 'stretch' },
  freshCard: { width: 190 },
  recommendedCard: { paddingHorizontal: spacing.lg },
  listContent: { paddingBottom: spacing.xxl },
  loadingState: { paddingTop: spacing.xxl, alignItems: 'center' },
  emptyState: { paddingTop: spacing.xxl, alignItems: 'center', gap: spacing.sm },
  emptyStateText: { color: colors.textMuted, fontSize: fontSize.sm },
});
