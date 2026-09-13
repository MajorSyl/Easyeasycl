import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { subscribeListingsChanged } from '../../lib/listings-cache-bus';
import { readCache, writeCache } from '../../lib/offline-cache';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '../../constants/theme';
import { type } from '../../constants/typography';
import { useTabBarGap } from '../../lib/use-bottom-gap';
import { ListingCard } from '../../components/ListingCard';
import { FilterPills, type PillOption } from '../../components/FilterPills';
import { EdgeFade } from '../../components/EdgeFade';
import { AppInstallPrompt } from '../../components/AppInstallPrompt';
import { daysSince, initialsFor } from '../../lib/format';
import { getRecentlyViewedIds } from '../../lib/recently-viewed';
import type { Listing, ListingCategory } from '../../lib/types';

type CategoryFilter = 'all' | ListingCategory;

const HOME_FEED_CACHE_KEY = 'easyfen_home_feed_cache_v1';
// Mirrors the "New" badge threshold on ListingCard, so a listing counted as
// "new" here is the same one that gets the "New" badge on its own card.
const NEW_WITHIN_DAYS = 7;
// Recommended draws on the whole leftover pool (any category), so it can
// afford a higher bar before it's worth its own row -- a thin one here
// would just be reshuffling whatever New Listings didn't already take.
const MIN_RECOMMENDED_POOL = 6;
// The "browse by type" rows and Recently Viewed are each scoped to a single
// category (or a single person's history), where inventory is naturally
// much thinner -- clearing 6 the same way Recommended does would hide, say,
// For Sale until there are 6 for-sale listings specifically, which is a
// much higher bar than "does this row have anything genuinely browsable."
// A 2-card row still scrolls and still reads as a real shelf, just a short
// one, the same way Airbnb doesn't wait for a market to have 6 boutique
// hotels before giving it a row.
const MIN_CATEGORY_POOL = 2;

const categoryOptions: PillOption<CategoryFilter>[] = [
  { value: 'all', label: 'All Properties' },
  { value: 'for_rent', label: 'For Rent' },
  { value: 'for_sale', label: 'For Sale' },
  { value: 'land', label: 'Land' },
  { value: 'daily_hourly', label: 'Daily/Hourly' },
];

// Order and short, Airbnb-style titles for the "browse by type" rows --
// deliberately shorter than the filter-pill labels above (which double as
// accessibility labels needing more context) since these sit directly
// under their own row of cards, where "Land for Sale" next to a Land badge
// on every card underneath is redundant.
const HOME_CATEGORY_ORDER: ListingCategory[] = ['for_sale', 'for_rent', 'land', 'daily_hourly'];
const CATEGORY_ROW_TITLES: Record<ListingCategory, string> = {
  for_sale: 'For Sale',
  for_rent: 'For Rent',
  land: 'Land',
  daily_hourly: 'Daily & Hourly Rentals',
};
// Plain text handed to Search's existing free-text query parser (see
// lib/search-query-parser.ts), which already recognizes each of these as a
// category filter -- reusing that instead of building a second, parallel
// category-filter mechanism just for this deep link.
const CATEGORY_SEARCH_QUERY: Record<ListingCategory, string> = {
  for_sale: 'for sale',
  for_rent: 'for rent',
  land: 'land',
  daily_hourly: 'daily',
};

type HomeSection = {
  key: string;
  title: string;
  listings: Listing[];
  showViewAll: boolean;
  // Search query text to deep-link "View All" to a pre-filtered list;
  // omitted means "View All" goes to a plain, unfiltered Search.
  viewAllQuery?: string;
};

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
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);

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
        .select('id, title, price, currency, price_unit, district, city, location, latitude, longitude, category, photos, view_count, is_premium, is_verified, owner_id, created_at, last_confirmed_at, owner:profiles(full_name, avatar_url, role)')
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

  // Re-read on every focus, not just mount -- the whole point of this row
  // is to reflect a listing the person just came back from viewing.
  useFocusEffect(
    useCallback(() => {
      if (!session) {
        setRecentlyViewedIds([]);
        return;
      }
      let cancelled = false;
      getRecentlyViewedIds().then((ids) => {
        if (!cancelled) setRecentlyViewedIds(ids);
      });
      return () => {
        cancelled = true;
      };
    }, [session])
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

  // Airbnb-style themed rows: each pulls from a genuinely different
  // criterion (recency, boost/views, property type, ...) and only ever
  // draws from whatever no earlier row on this same page load has already
  // claimed, so the same listing can't turn up twice under two headings.
  // A row that can't clear its minPool from what's left just doesn't get
  // added -- there's no "fallback to the full feed" that would make it
  // duplicate another row. Recently Viewed (added after this loop) is the
  // one deliberate exception -- see its own comment below for why.
  const homeSections = useMemo<HomeSection[]>(() => {
    const shown = new Set<string>();
    const built: HomeSection[] = [];

    function addSection(
      key: string,
      title: string,
      showViewAll: boolean,
      rank: (pool: Listing[]) => Listing[],
      minPool: number,
      options?: { viewAllQuery?: string; excludeShown?: boolean }
    ) {
      // New Listings and Recommended stay mutually exclusive (the whole
      // point of task #133's fix: a boosted listing shouldn't just be
      // "New Listings" restated under a different heading). A "browse by
      // type" row is a genuinely different axis -- what KIND of property,
      // not how recent it is -- so category rows deliberately opt out of
      // this and pull from the full list: on a young/small inventory where
      // almost everything still counts as "new," excluding already-shown
      // listings would starve every category row down to nothing, which is
      // exactly backwards for a page whose job is helping someone browse by
      // type in the first place.
      const excludeShown = options?.excludeShown ?? true;
      const pool = excludeShown ? listings.filter((l) => !shown.has(l.id)) : listings;
      if (pool.length < minPool) return;
      const ranked = rank(pool).slice(0, 10);
      if (ranked.length === 0) return;
      if (excludeShown) ranked.forEach((l) => shown.add(l.id));
      built.push({ key, title, listings: ranked, showViewAll, viewAllQuery: options?.viewAllQuery });
    }

    // Always leads, and with a much lower bar than the rows below it --
    // every market has a "what's new" row from day one, even with a
    // single listing, so it doesn't need to look like a curated shelf yet.
    addSection(
      'new',
      'New Listings',
      false,
      (pool) => pool.filter((l) => daysSince(l.created_at) <= NEW_WITHIN_DAYS),
      1
    );

    // Boosted listings first (real product purpose for the paid boost
    // feature), then by view count, from whatever New Listings left behind.
    addSection(
      'recommended',
      'Recommended',
      true,
      (pool) =>
        [...pool].sort((a, b) =>
          a.is_premium !== b.is_premium ? (a.is_premium ? -1 : 1) : (b.view_count ?? 0) - (a.view_count ?? 0)
        ),
      MIN_RECOMMENDED_POOL
    );

    // "Browse by type" rows -- an Airbnb-style category shelf. Each
    // category only gets its own row once there's enough of that type
    // specifically to fill one (see the excludeShown note in addSection
    // for why these draw from the full list, not just what's left over).
    for (const category of HOME_CATEGORY_ORDER) {
      addSection(
        `category-${category}`,
        CATEGORY_ROW_TITLES[category],
        true,
        (pool) => pool.filter((l) => l.category === category),
        MIN_CATEGORY_POOL,
        { viewAllQuery: CATEGORY_SEARCH_QUERY[category], excludeShown: false }
      );
    }

    // Personalization row, built from device-local view history (see
    // lib/recently-viewed.ts) rather than any category -- deliberately NOT
    // filtered against `shown`, since a listing someone actually looked at
    // is exactly as relevant here as it is under whatever category row it
    // also appears in. Real Airbnb rows work the same way: Recently Viewed
    // routinely repeats a listing also shown elsewhere on the same page.
    if (session && recentlyViewedIds.length > 0) {
      const byId = new Map(listings.map((l) => [l.id, l]));
      const recentlyViewed = recentlyViewedIds
        .map((id) => byId.get(id))
        .filter((l): l is Listing => Boolean(l))
        .slice(0, 10);
      if (recentlyViewed.length >= MIN_CATEGORY_POOL) {
        built.push({ key: 'recently-viewed', title: 'Recently Viewed', listings: recentlyViewed, showViewAll: false });
      }
    }

    // Every row above has a real minimum bar to clear, which is correct for
    // avoiding thin/duplicate rows -- but it means an inventory that's both
    // small AND mostly older than a week (no "New Listings") could clear
    // zero of them, leaving the page with listings but nothing rendered.
    // Guarantee there's always at least one row whenever there's inventory.
    if (built.length === 0 && listings.length > 0) {
      built.push({ key: 'all', title: 'Available Now', listings: listings.slice(0, 10), showViewAll: false });
    }

    return built;
  }, [listings, session, recentlyViewedIds]);

  const firstName = profile?.full_name?.trim().split(' ')[0];

  const renderRowCard = useCallback(
    ({ item }: { item: Listing }) => (
      <View style={styles.rowCard}>
        <ListingCard listing={item} />
      </View>
    ),
    []
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search bar + filter pills live OUTSIDE the ScrollView so they stick
          to the top while the greeting, Browse by Location, and sell banner
          scroll away naturally below them. */}
      <View style={styles.stickyBar}>
        <Pressable
          style={styles.searchBar}
          onPress={() => router.push('/search')}
          accessibilityRole="search"
          accessibilityLabel="Search properties, land, cities, and districts across Sierra Leone"
        >
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Text style={styles.searchPlaceholder}>Search Freetown, Bo, Makeni...</Text>
        </Pressable>

        <View style={styles.pillsWrap}>
          <FilterPills options={categoryOptions} value={categoryFilter} onChange={setCategoryFilter} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarGap + spacing.lg }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View>
          <AppInstallPrompt />
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

          {showingSavedData && (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline-outline" size={16} color={colors.textMuted} />
              <Text style={styles.offlineBannerText}>Showing saved listings — check your connection</Text>
            </View>
          )}

          <Pressable style={styles.neighborhoodRow} onPress={() => router.push('/neighborhoods')}>
            <View style={styles.neighborhoodIcon}>
              <Ionicons name="location-outline" size={16} color={colors.accent} />
            </View>
            <Text style={styles.neighborhoodRowText}>Browse by Location</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

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
              <Text style={styles.sellBannerTitle}>List your property</Text>
              <Text style={styles.sellBannerSubtitle}>It's free, and renters see it today</Text>
            </View>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : listings.length === 0 ? (
          <EmptyState label={loadError ? "Couldn't load properties. Pull down to try again." : 'No properties yet'} />
        ) : (
          homeSections.map((section) => (
            <View key={section.key} style={styles.section}>
              {section.showViewAll ? (
                <View style={styles.recommendedHeader}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Pressable
                    style={styles.viewAllButton}
                    onPress={() =>
                      router.push(
                        section.viewAllQuery
                          ? { pathname: '/search', params: { q: section.viewAllQuery } }
                          : '/search'
                      )
                    }
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`View all ${section.title}`}
                  >
                    <Ionicons name="arrow-forward" size={16} color={colors.accent} />
                  </Pressable>
                </View>
              ) : (
                <Text style={[styles.sectionTitle, styles.sectionTitleStandalone]}>{section.title}</Text>
              )}
              <View style={styles.rowWrap}>
                <FlatList
                  data={section.listings}
                  keyExtractor={(item) => item.id}
                  renderItem={renderRowCard}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.row}
                />
                <EdgeFade />
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  greetingBlock: { flex: 1 },
  greeting: { ...type.body, fontSize: fontSize.sm, color: colors.textMuted },
  headline: { ...type.display, color: colors.textPrimary, marginTop: 4 },
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
  stickyBar: {
    backgroundColor: colors.card,
    shadowColor: '#2B2620',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
    paddingTop: spacing.sm,
  },
  // Flat, bordered chrome -- no shadow -- so this reads as structural
  // navigation, not a competing "card" next to the listing grid below.
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  searchPlaceholder: { ...type.body, fontSize: fontSize.sm, color: colors.textMuted },
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
  sellBannerTitle: { ...type.cardTitle, fontSize: fontSize.md, color: '#fff' },
  sellBannerSubtitle: { ...type.secondary, color: 'rgba(255,255,255,0.92)', marginTop: 2 },
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  neighborhoodIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  neighborhoodRowText: { ...type.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary },
  pillsWrap: { paddingBottom: spacing.sm },
  section: { marginTop: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { ...type.sectionTitle, fontSize: fontSize.lg, color: colors.textPrimary },
  sectionTitleStandalone: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  recommendedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  // A small round icon button, Airbnb-row-header style, rather than a
  // "View All" text link -- icon-only, so it needs a real hit target
  // (32px, plus hitSlop above) rather than relying on text line-height.
  viewAllButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // No fixed height here — a card's text can grow taller under large
  // system font sizes (Dynamic Type), and a hard-clipped height would
  // truncate or overlap that content instead of just growing the row.
  rowWrap: { position: 'relative' },
  row: { paddingLeft: spacing.lg, paddingRight: spacing.xxl, gap: spacing.lg, alignItems: 'flex-start' },
  rowCard: { width: 200 },
  listContent: { paddingBottom: spacing.xxl },
  loadingState: { paddingTop: spacing.xxl, alignItems: 'center' },
  emptyState: { paddingTop: spacing.xxl, alignItems: 'center', gap: spacing.sm },
  emptyStateText: { color: colors.textMuted, fontSize: fontSize.sm },
});
