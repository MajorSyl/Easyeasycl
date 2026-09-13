import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, fontWeight, radius, spacing } from '../../constants/theme';
import { useTabBarGap } from '../../lib/use-bottom-gap';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { friendlyErrorMessage } from '../../lib/errors';
import { appAlert } from '../../lib/alert';
import { ListingCard } from '../../components/ListingCard';
import { CurrencyFilterToggle, type CurrencyFilter } from '../../components/CurrencyFilterToggle';
import { VoiceSearchButton, isVoiceSearchSupported, type SearchLanguage } from '../../components/VoiceSearchButton';
import { LanguageToggle } from '../../components/LanguageToggle';
import { distanceKm, formatDistance } from '../../lib/geo';
import { useDeviceLocation } from '../../lib/use-device-location';
import { parseSearchQuery, type ParsedSearchQuery } from '../../lib/search-query-parser';
import { refreshDictionary } from '../../lib/search-dictionary';
import { detectLanguage } from '../../lib/lang-detect';
import { matchLocationText } from '../../lib/location-match';
import { resolvePriceBand, findAlternatives, type AlternativeSuggestion } from '../../lib/search-stats';
import { FOLLOW_UP_SCRIPT, nextFollowUp, type FollowUpKey } from '../../lib/search-followup';
import { categoryLabel, parsePriceInput } from '../../lib/format';
import type { Listing } from '../../lib/types';

type SearchResult = {
  kind: 'listing';
  id: string;
  sortPrice: number;
  createdAt: string;
  data: Listing;
  distanceKm: number | null;
};

type SortMode = 'newest' | 'price_asc' | 'price_desc';
type FilterKey = 'category' | 'bedrooms' | 'locationTerm' | 'priceIntent';

const sortLabels: Record<SortMode, string> = {
  newest: 'Newest',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
};

// Sorting or filtering by a raw price number only means something within a
// single currency -- $50 sorting as "less than" NLe 5,000 is meaningless
// without an exchange rate. Price-based sort only shows up once a specific
// currency is selected; picking "All" falls back to Newest.
const priceSortModes: SortMode[] = ['price_asc', 'price_desc'];

function escapeForFilter(text: string) {
  return text.replace(/[,()%]/g, '');
}

function filterChipLabel(key: FilterKey, parsed: ParsedSearchQuery): string {
  if (key === 'category' && parsed.category) return categoryLabel(parsed.category);
  if (key === 'bedrooms' && parsed.bedrooms != null) return `${parsed.bedrooms} bed`;
  if (key === 'locationTerm' && parsed.locationTerm) return parsed.locationTerm;
  if (key === 'priceIntent' && parsed.priceIntent) return parsed.priceIntent === 'asc' ? 'Affordable' : 'Premium';
  return '';
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const tabBarGap = useTabBarGap();
  const { session } = useAuth();
  // Lets Home's category rows (For Sale, For Rent, ...) deep-link straight
  // into a pre-filtered result list by handing off plain text -- reusing
  // parseSearchQuery's existing category-word matching below rather than a
  // second, parallel category-filter mechanism.
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(() => q ?? '');
  const [budget, setBudget] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchError, setSearchError] = useState(false);
  const [savingSearch, setSavingSearch] = useState(false);
  const [nearMe, setNearMe] = useState(false);
  const [parsed, setParsed] = useState<ParsedSearchQuery | null>(null);
  const [unsupportedLanguageNotice, setUnsupportedLanguageNotice] = useState(false);
  const [language, setLanguage] = useState<SearchLanguage>('en');
  const [clearedFilters, setClearedFilters] = useState<Set<FilterKey>>(new Set());
  const [manualMode, setManualMode] = useState(false);
  const [skippedFollowUps, setSkippedFollowUps] = useState<Set<FollowUpKey>>(new Set());
  const [alternative, setAlternative] = useState<AlternativeSuggestion>(null);
  const [notifyRequested, setNotifyRequested] = useState(false);
  const { coords, requesting: requestingLocation, request: requestLocation } = useDeviceLocation();

  // Loads the admin-editable English/Krio synonym dictionary from Supabase
  // in the background -- search keeps working on the bundled defaults
  // (lib/search-dictionary.ts) until this lands, and never blocks on it.
  useEffect(() => {
    refreshDictionary();
  }, []);

  useEffect(() => {
    // A fresh query invalidates any filter the user removed by tapping a
    // chip's X on the *previous* result set, and re-opens the follow-up
    // conversation for the new question.
    setClearedFilters(new Set());
    setSkippedFollowUps(new Set());
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      runSearch(query, budget, currencyFilter, sortMode, nearMe ? coords : null, clearedFilters);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, budget, currencyFilter, sortMode, nearMe, coords, clearedFilters]);

  async function toggleNearMe() {
    if (nearMe) {
      setNearMe(false);
      return;
    }
    const next = coords ?? (await requestLocation());
    if (next) setNearMe(true);
  }

  // Switching to "All" drops both the budget and any price-based sort --
  // neither means anything once results can span more than one currency.
  function handleCurrencyChange(next: CurrencyFilter) {
    setCurrencyFilter(next);
    if (next === 'ALL') {
      setBudget('');
      if (priceSortModes.includes(sortMode)) setSortMode('newest');
    }
  }

  function handleVoiceResult(text: string) {
    setQuery((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
  }

  function handleQuickReply(value: string, key: FollowUpKey) {
    if (value) setQuery((prev) => (prev.trim() ? `${prev.trim()} ${value}` : value));
    else setSkippedFollowUps((prev) => new Set(prev).add(key));
  }

  function dismissConversation() {
    setManualMode(true);
    setSkippedFollowUps(new Set(FOLLOW_UP_SCRIPT.map((s) => s.key)));
  }

  function removeChip(key: FilterKey) {
    setClearedFilters((prev) => new Set(prev).add(key));
  }

  async function runSearch(
    text: string,
    budgetText: string,
    currency: CurrencyFilter,
    sort: SortMode,
    nearCoords: { lat: number; lng: number } | null,
    cleared: Set<FilterKey>
  ) {
    setLoading(true);
    setAlternative(null);
    setNotifyRequested(false);
    const trimmed = text.trim();
    const maxPrice = currency !== 'ALL' && budgetText.trim() ? parsePriceInput(budgetText) : null;

    // Rule-based language check (Phase 2/6): franc + a Krio marker-word
    // heuristic, not an AI call. A clearly-unsupported language shows a
    // friendly notice and skips running a nonsensical search rather than
    // silently returning garbage results.
    if (trimmed) {
      const detected = detectLanguage(trimmed);
      supabase
        .from('search_query_logs')
        .insert({ user_id: session?.user.id ?? null, raw_query: trimmed, detected_language: detected, matched_filter_count: 0, result_count: 0 })
        .then(() => {});
      if (detected === 'other') {
        setUnsupportedLanguageNotice(true);
        setLoading(false);
        return;
      }
    }
    setUnsupportedLanguageNotice(false);

    let listingsQuery = supabase
      .from('listings')
      .select(
        'id, title, price, currency, price_unit, district, city, location, latitude, longitude, category, photos, view_count, is_premium, is_verified, owner_id, created_at, last_confirmed_at, owner:profiles(full_name, avatar_url, role)'
      )
      .eq('is_active', true);

    // Rule-based keyword parsing (no AI/API): "cheap 2 bedroom house in Bo"
    // maps to category/bedrooms/location filters plus a price sort, all
    // from a lookup table + regex -- see lib/search-query-parser.ts. Falls
    // straight back to the old plain-text search when nothing matches.
    const parsedQuery = trimmed ? parseSearchQuery(trimmed) : null;
    setParsed(parsedQuery);

    const useCategory = parsedQuery?.category && !cleared.has('category') ? parsedQuery.category : null;
    const useBedrooms = parsedQuery?.bedrooms != null && !cleared.has('bedrooms') ? parsedQuery.bedrooms : null;
    const useLocation = parsedQuery?.locationTerm && !cleared.has('locationTerm') ? parsedQuery.locationTerm : null;
    const usePriceIntent = parsedQuery?.priceIntent && !cleared.has('priceIntent') ? parsedQuery.priceIntent : null;

    if (parsedQuery?.matchedAnything) {
      if (useCategory) listingsQuery = listingsQuery.eq('category', useCategory);
      if (useBedrooms != null) listingsQuery = listingsQuery.eq('bedrooms', useBedrooms);
      if (useLocation) {
        const loc = escapeForFilter(useLocation);
        listingsQuery = listingsQuery.or(`city.ilike.%${loc}%,district.ilike.%${loc}%,location.ilike.%${loc}%`);
      }
      for (const kw of parsedQuery.keywordTerms) {
        const safe = escapeForFilter(kw);
        listingsQuery = listingsQuery.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
      }
      if (parsedQuery.leftoverText) {
        const safe = escapeForFilter(parsedQuery.leftoverText);
        listingsQuery = listingsQuery.or(
          `title.ilike.%${safe}%,location.ilike.%${safe}%,city.ilike.%${safe}%,district.ilike.%${safe}%`
        );
      }
    } else if (trimmed) {
      const term = escapeForFilter(trimmed);
      // Nationwide: a district or city name (e.g. "Bo") matches just as
      // well as a neighborhood-level location or a title keyword.
      listingsQuery = listingsQuery.or(
        `title.ilike.%${term}%,location.ilike.%${term}%,city.ilike.%${term}%,district.ilike.%${term}%`
      );
    }
    if (currency !== 'ALL') {
      listingsQuery = listingsQuery.eq('currency', currency);
    }
    if (maxPrice && !Number.isNaN(maxPrice)) {
      listingsQuery = listingsQuery.lte('price', maxPrice);
    } else if (usePriceIntent && currency !== 'ALL') {
      // "Affordable"/"cheap"/"luxury" resolve to a real calculated price
      // band from this platform's own listing_stats (Phase 5), not a fixed
      // guess -- scoped to the matched district/category when known.
      const resolvedLoc = useLocation ? matchLocationText(useLocation) : null;
      const band = await resolvePriceBand(usePriceIntent, {
        district: resolvedLoc?.district ?? null,
        category: useCategory,
        currency,
      });
      if (band != null) {
        listingsQuery = usePriceIntent === 'asc' ? listingsQuery.lte('price', band) : listingsQuery.gte('price', band);
      }
    }

    // Near Me re-sorts by distance client-side, so pull a bigger pool than
    // the default page size -- otherwise "closest first" would only ever
    // rank among the 30 most recently posted listings.
    const { data: listings, error } = await listingsQuery
      .order('created_at', { ascending: false })
      .limit(nearCoords ? 150 : 30);

    if (error) {
      setSearchError(true);
      setResults([]);
      setLoading(false);
      return;
    }
    setSearchError(false);

    const combined: SearchResult[] = ((listings as unknown as Listing[]) ?? []).map((item) => ({
      kind: 'listing' as const,
      id: item.id,
      sortPrice: item.price,
      createdAt: item.created_at,
      data: item,
      distanceKm:
        nearCoords && item.latitude != null && item.longitude != null
          ? distanceKm(nearCoords.lat, nearCoords.lng, item.latitude, item.longitude)
          : null,
    }));

    // "cheap"/"luxury" in the query only becomes a real sort once a single
    // currency is selected -- same rule as the manual sort menu, comparing
    // raw price numbers across currencies is meaningless.
    const effectiveSort: SortMode =
      usePriceIntent && currency !== 'ALL' ? (usePriceIntent === 'asc' ? 'price_asc' : 'price_desc') : sort;

    if (nearCoords) {
      // Near Me overrides the picked sort mode -- closest first, listings
      // with no coordinates at all pushed to the end rather than dropped.
      combined.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    } else {
      combined.sort((a, b) => {
        if (effectiveSort === 'price_asc') return a.sortPrice - b.sortPrice;
        if (effectiveSort === 'price_desc') return b.sortPrice - a.sortPrice;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    setResults(combined);
    setLoading(false);

    // Zero results never end at a bare dead end (Phase 6.22): try nearby
    // locations with the same type/bedrooms, then the same location with
    // different type/bedrooms, before falling back to the "notify me" capture.
    if (combined.length === 0 && trimmed && parsedQuery?.matchedAnything) {
      const resolvedLoc = useLocation ? matchLocationText(useLocation) : null;
      const alt = await findAlternatives({
        district: resolvedLoc?.district ?? null,
        category: useCategory,
        bedrooms: useBedrooms,
        currency: currency === 'ALL' ? 'NLE' : currency,
      });
      setAlternative(alt);
    }
  }

  async function requestNotify() {
    if (!session) {
      router.push('/auth');
      return;
    }
    const resolvedLoc = parsed?.locationTerm ? matchLocationText(parsed.locationTerm) : null;
    const { error } = await supabase.from('search_notify_requests').insert({
      user_id: session.user.id,
      contact: session.user.email,
      category: parsed?.category ?? null,
      bedrooms: parsed?.bedrooms ?? null,
      district: resolvedLoc?.district ?? null,
      city: resolvedLoc?.city || null,
      max_price: budget.trim() ? parsePriceInput(budget) : null,
      currency: currencyFilter === 'ALL' ? null : currencyFilter,
    });
    if (error) {
      appAlert('Could not save', friendlyErrorMessage(error));
      return;
    }
    setNotifyRequested(true);
    appAlert("You're on the list", "We'll notify you when a matching listing is posted.");
  }

  const resultCountLabel = useMemo(
    () => `${results.length} result${results.length === 1 ? '' : 's'} found`,
    [results.length]
  );

  const canSaveSearch = query.trim().length > 0 || budget.trim().length > 0;

  async function saveSearch() {
    if (!canSaveSearch || savingSearch) return;
    if (!session) {
      router.push('/auth');
      return;
    }
    setSavingSearch(true);
    const maxPrice = currencyFilter !== 'ALL' && budget.trim() ? parsePriceInput(budget) : null;
    const { error } = await supabase.from('saved_searches').insert({
      user_id: session.user.id,
      query: query.trim() || null,
      max_price: maxPrice && !Number.isNaN(maxPrice) ? maxPrice : null,
      // Only actually consulted by the matching trigger when max_price is
      // also set (see notify_saved_search_matches) -- harmless default
      // otherwise, since a query-only saved search matches on keyword alone
      // regardless of a listing's currency.
      currency: currencyFilter === 'ALL' ? 'NLE' : currencyFilter,
    });
    setSavingSearch(false);
    if (error) {
      appAlert('Could not save search', friendlyErrorMessage(error));
      return;
    }
    appAlert('Search saved', "We'll notify you when a new listing matches this search.");
  }

  const filterChips: FilterKey[] = parsed
    ? (['category', 'bedrooms', 'locationTerm', 'priceIntent'] as FilterKey[]).filter((key) => {
        if (clearedFilters.has(key)) return false;
        if (key === 'category') return !!parsed.category;
        if (key === 'bedrooms') return parsed.bedrooms != null;
        if (key === 'locationTerm') return !!parsed.locationTerm;
        if (key === 'priceIntent') return !!parsed.priceIntent;
        return false;
      })
    : [];

  const followUp =
    !manualMode && query.trim() && parsed
      ? nextFollowUp(
          {
            category: clearedFilters.has('category') ? null : parsed.category,
            locationTerm: clearedFilters.has('locationTerm') ? null : parsed.locationTerm,
            bedrooms: clearedFilters.has('bedrooms') ? null : parsed.bedrooms,
            priceIntent: clearedFilters.has('priceIntent') ? null : parsed.priceIntent,
          },
          skippedFollowUps
        )
      : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Try 'cheap 2 bedroom in Bo' or voice search"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            accessibilityLabel="Search by location or keyword"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={14}
              accessibilityRole="button"
              accessibilityLabel="Clear search text"
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
          {isVoiceSearchSupported() && <VoiceSearchButton language={language} onResult={handleVoiceResult} />}
        </View>

        <View style={styles.langRow}>
          <LanguageToggle value={language} onChange={setLanguage} />
          <Pressable onPress={() => setManualMode((m) => !m)} hitSlop={8}>
            <Text style={styles.manualLink}>{manualMode ? 'Show smart search' : 'Switch to manual filters'}</Text>
          </Pressable>
        </View>

        <CurrencyFilterToggle value={currencyFilter} onChange={handleCurrencyChange} />

        <Pressable
          style={[styles.nearMeButton, nearMe && styles.nearMeButtonActive]}
          onPress={toggleNearMe}
          disabled={requestingLocation}
          accessibilityRole="button"
          accessibilityLabel="Sort by nearby listings"
          accessibilityState={{ selected: nearMe }}
        >
          {requestingLocation ? (
            <ActivityIndicator size="small" color={nearMe ? '#fff' : colors.accent} />
          ) : (
            <Ionicons name="navigate" size={14} color={nearMe ? '#fff' : colors.accent} />
          )}
          <Text style={[styles.nearMeButtonText, nearMe && styles.nearMeButtonTextActive]}>
            {nearMe ? 'Near Me · On' : 'Near Me'}
          </Text>
        </Pressable>

        <View style={styles.filterRow}>
          <View style={[styles.budgetField, currencyFilter === 'ALL' && styles.budgetFieldDisabled]}>
            <Text style={styles.budgetPrefix}>{currencyFilter === 'USD' ? '$' : 'NLe'}</Text>
            <TextInput
              style={styles.budgetInput}
              placeholder={currencyFilter === 'ALL' ? 'Pick a currency to set a budget' : 'Budget'}
              placeholderTextColor={colors.textMuted}
              value={budget}
              onChangeText={setBudget}
              keyboardType="decimal-pad"
              editable={currencyFilter !== 'ALL'}
              accessibilityLabel="Maximum budget"
              accessibilityHint={currencyFilter === 'ALL' ? 'Select a currency above first' : undefined}
            />
          </View>
          <Pressable
            style={[styles.sortButton, nearMe && styles.sortButtonDisabled]}
            onPress={() => setSortMenuOpen(true)}
            disabled={nearMe}
            accessibilityRole="button"
            accessibilityLabel="Sort results"
            accessibilityHint={nearMe ? 'Sorted by distance while Near Me is on' : `Currently sorted by ${sortLabels[sortMode]}`}
          >
            <Ionicons name="swap-vertical-outline" size={20} color={nearMe ? colors.textMuted : colors.textPrimary} />
          </Pressable>
          <Pressable
            style={[styles.sortButton, !canSaveSearch && styles.sortButtonDisabled]}
            onPress={saveSearch}
            disabled={!canSaveSearch || savingSearch}
            accessibilityRole="button"
            accessibilityLabel="Save this search"
            accessibilityHint="Notifies you when a new listing matches this search"
            accessibilityState={{ disabled: !canSaveSearch || savingSearch }}
          >
            {savingSearch ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="bookmark-outline" size={20} color={canSaveSearch ? colors.textPrimary : colors.textMuted} />
            )}
          </Pressable>
        </View>

        {unsupportedLanguageNotice && (
          <View style={styles.noticeBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
            <Text style={styles.noticeText}>
              Easyfen currently supports English and Krio. Please try rephrasing your search.
            </Text>
          </View>
        )}

        {!manualMode && followUp && (
          <View style={styles.followUpCard}>
            <Text style={styles.followUpQuestion}>{followUp.question}</Text>
            <View style={styles.quickReplyRow}>
              {followUp.quickReplies.map((qr) => (
                <Pressable
                  key={qr.label}
                  style={styles.quickReplyChip}
                  onPress={() => handleQuickReply(qr.value, followUp.key)}
                >
                  <Text style={styles.quickReplyText}>{qr.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.showResultsButton} onPress={dismissConversation}>
              <Text style={styles.showResultsButtonText}>Just show me results</Text>
            </Pressable>
          </View>
        )}

        {query.trim().length > 0 && (
          <Text style={styles.searchForText} numberOfLines={1}>
            Search results for: "{query.trim()}"
          </Text>
        )}

        {filterChips.length > 0 && (
          <View style={styles.chipsRow}>
            {filterChips.map((key) => (
              <View key={key} style={styles.chip}>
                <Text style={styles.chipText}>{filterChipLabel(key, parsed!)}</Text>
                <Pressable onPress={() => removeChip(key)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${filterChipLabel(key, parsed!)} filter`}>
                  <Ionicons name="close" size={13} color={colors.accent} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.resultCount}>{loading ? 'Searching...' : resultCountLabel}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarGap + spacing.lg }]}
          renderItem={({ item }) => (
            <ListingCard
              listing={item.data}
              distanceLabel={nearMe && item.distanceKm != null ? formatDistance(item.distanceKm) : undefined}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name={searchError ? 'cloud-offline-outline' : 'search-outline'}
                size={36}
                color={colors.textMuted}
              />
              {searchError ? (
                <Text style={styles.emptyStateText}>Couldn't load results. Check your connection and try again.</Text>
              ) : alternative?.kind === 'other_location' ? (
                <>
                  <Text style={styles.emptyStateText}>
                    No exact matches yet, but there are listings in {alternative.locations.join(', ')}.
                  </Text>
                  <Pressable style={styles.emptyCta} onPress={() => setQuery(alternative.locations[0])}>
                    <Text style={styles.emptyCtaText}>Show {alternative.locations[0]} listings</Text>
                  </Pressable>
                </>
              ) : alternative?.kind === 'other_filters' ? (
                <>
                  <Text style={styles.emptyStateText}>
                    No exact match, but {alternative.district} has {categoryLabel(alternative.category as any)}
                    {alternative.bedrooms != null ? ` (${alternative.bedrooms} bed)` : ''} listings.
                  </Text>
                  <Pressable
                    style={styles.emptyCta}
                    onPress={() => setQuery(`${alternative.category} in ${alternative.district}`)}
                  >
                    <Text style={styles.emptyCtaText}>Show those instead</Text>
                  </Pressable>
                </>
              ) : query.trim() ? (
                <>
                  <Text style={styles.emptyStateText}>No matches yet for "{query.trim()}".</Text>
                  {notifyRequested ? (
                    <Text style={styles.emptyStateText}>We'll let you know when something matches.</Text>
                  ) : (
                    <Pressable style={styles.emptyCta} onPress={requestNotify}>
                      <Text style={styles.emptyCtaText}>Notify me when available</Text>
                    </Pressable>
                  )}
                </>
              ) : (
                <Text style={styles.emptyStateText}>No results. Try a different search or budget.</Text>
              )}
              {!searchError && !alternative && !query.trim() && (
                <Pressable style={styles.emptyCta} onPress={() => router.push('/add')}>
                  <Text style={styles.emptyCtaText}>List Your Property</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}

      <Modal visible={sortMenuOpen} transparent animationType="fade" onRequestClose={() => setSortMenuOpen(false)}>
        <Pressable
          style={styles.backdrop}
          onPress={() => setSortMenuOpen(false)}
          accessibilityLabel="Close sort menu"
        >
          <View style={styles.sheet} accessibilityRole="menu">
            {(Object.keys(sortLabels) as SortMode[])
              .filter((mode) => currencyFilter !== 'ALL' || !priceSortModes.includes(mode))
              .map((mode) => (
              <Pressable
                key={mode}
                style={styles.option}
                onPress={() => {
                  setSortMode(mode);
                  setSortMenuOpen(false);
                }}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: mode === sortMode }}
              >
                <Text style={[styles.optionText, mode === sortMode && styles.optionTextActive]}>
                  {sortLabels[mode]}
                </Text>
                {mode === sortMode && <Ionicons name="checkmark" size={18} color={colors.accent} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  searchBar: {
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
  searchInput: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary },
  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  manualLink: { fontSize: fontSize.xs, color: colors.accent, fontWeight: fontWeight.semibold, textDecorationLine: 'underline' },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  noticeText: { flex: 1, fontSize: fontSize.xs, color: colors.textSecondary },
  followUpCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  followUpQuestion: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  quickReplyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickReplyChip: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  quickReplyText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.accent },
  showResultsButton: { alignSelf: 'flex-start' },
  showResultsButtonText: { fontSize: fontSize.xs, color: colors.textMuted, textDecorationLine: 'underline' },
  searchForText: { fontSize: fontSize.xs, color: colors.textSecondary, fontStyle: 'italic' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.accent },
  nearMeButton: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  nearMeButtonActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  nearMeButtonText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.accent },
  nearMeButtonTextActive: { color: '#fff' },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  budgetField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  budgetFieldDisabled: { opacity: 0.5 },
  budgetPrefix: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.semibold },
  budgetInput: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary, paddingVertical: 12 },
  sortButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortButtonDisabled: { opacity: 0.5 },
  resultCount: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.semibold, marginTop: 2 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  emptyState: { paddingTop: spacing.xxl, alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyStateText: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center' },
  emptyCta: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  emptyCtaText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: '#fff' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.xl,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  optionText: { fontSize: fontSize.md, color: colors.textPrimary },
  optionTextActive: { color: colors.accent, fontWeight: fontWeight.semibold },
});
