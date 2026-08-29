import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, fontWeight, radius, spacing } from '../../constants/theme';
import { useTabBarGap } from '../../lib/use-bottom-gap';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { friendlyErrorMessage } from '../../lib/errors';
import { appAlert } from '../../lib/alert';
import { ListingCard } from '../../components/ListingCard';
import { CurrencyFilterToggle, type CurrencyFilter } from '../../components/CurrencyFilterToggle';
import type { Listing } from '../../lib/types';

type SearchResult = { kind: 'listing'; id: string; sortPrice: number; createdAt: string; data: Listing };

type SortMode = 'newest' | 'price_asc' | 'price_desc';

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

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const tabBarGap = useTabBarGap();
  const { session } = useAuth();
  const [query, setQuery] = useState('');
  const [budget, setBudget] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchError, setSearchError] = useState(false);
  const [savingSearch, setSavingSearch] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      runSearch(query, budget, currencyFilter, sortMode);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, budget, currencyFilter, sortMode]);

  // Switching to "All" drops both the budget and any price-based sort --
  // neither means anything once results can span more than one currency.
  function handleCurrencyChange(next: CurrencyFilter) {
    setCurrencyFilter(next);
    if (next === 'ALL') {
      setBudget('');
      if (priceSortModes.includes(sortMode)) setSortMode('newest');
    }
  }

  async function runSearch(text: string, budgetText: string, currency: CurrencyFilter, sort: SortMode) {
    setLoading(true);
    const term = escapeForFilter(text.trim());
    const maxPrice = currency !== 'ALL' && budgetText.trim() ? Number(budgetText) : null;

    let listingsQuery = supabase
      .from('listings')
      .select('id, title, price, currency, price_unit, location, category, photos, view_count, is_premium, owner_id, created_at, last_confirmed_at, owner:profiles(full_name, avatar_url, role)')
      .eq('is_active', true);

    if (term) {
      listingsQuery = listingsQuery.or(`title.ilike.%${term}%,location.ilike.%${term}%`);
    }
    if (currency !== 'ALL') {
      listingsQuery = listingsQuery.eq('currency', currency);
    }
    if (maxPrice && !Number.isNaN(maxPrice)) {
      listingsQuery = listingsQuery.lte('price', maxPrice);
    }

    const { data: listings, error } = await listingsQuery.order('created_at', { ascending: false }).limit(30);

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
    }));

    combined.sort((a, b) => {
      if (sort === 'price_asc') return a.sortPrice - b.sortPrice;
      if (sort === 'price_desc') return b.sortPrice - a.sortPrice;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setResults(combined);
    setLoading(false);
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
    const maxPrice = currencyFilter !== 'ALL' && budget.trim() ? Number(budget) : null;
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Goderich, Aberdeen, Lumley..."
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
        </View>

        <CurrencyFilterToggle value={currencyFilter} onChange={handleCurrencyChange} />

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
            style={styles.sortButton}
            onPress={() => setSortMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Sort results"
            accessibilityHint={`Currently sorted by ${sortLabels[sortMode]}`}
          >
            <Ionicons name="swap-vertical-outline" size={20} color={colors.textPrimary} />
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
          renderItem={({ item }) => <ListingCard listing={item.data} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name={searchError ? 'cloud-offline-outline' : 'search-outline'}
                size={36}
                color={colors.textMuted}
              />
              <Text style={styles.emptyStateText}>
                {searchError
                  ? "Couldn't load results. Check your connection and try again."
                  : 'No results. Try a different search or budget.'}
              </Text>
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
  emptyState: { paddingTop: spacing.xxl, alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyStateText: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center' },
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
