import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { friendlyErrorMessage } from '../../lib/errors';
import { useAuth } from '../../lib/auth-context';
import { getOrCreateConversation } from '../../lib/conversations';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { ListingCard } from '../../components/ListingCard';
import { HotelCard } from '../../components/HotelCard';
import { ServiceCard } from '../../components/ServiceCard';
import type { Hotel, Listing, Service } from '../../lib/types';

type SearchResult =
  | { kind: 'listing'; id: string; sortPrice: number; createdAt: string; data: Listing }
  | { kind: 'hotel'; id: string; sortPrice: number; createdAt: string; data: Hotel }
  | { kind: 'service'; id: string; sortPrice: number; createdAt: string; data: Service };

type SortMode = 'newest' | 'price_asc' | 'price_desc';

const sortLabels: Record<SortMode, string> = {
  newest: 'Newest',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
};

function escapeForFilter(text: string) {
  return text.replace(/[,()%]/g, '');
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [query, setQuery] = useState('');
  const [budget, setBudget] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiring, setHiring] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      runSearch(query, budget, sortMode);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, budget, sortMode]);

  async function runSearch(text: string, budgetText: string, sort: SortMode) {
    setLoading(true);
    const term = escapeForFilter(text.trim());
    const maxPrice = budgetText.trim() ? Number(budgetText) : null;

    let listingsQuery = supabase.from('listings').select('*, owner:profiles(full_name, avatar_url, role)');
    let hotelsQuery = supabase.from('hotels').select('*, owner:profiles(full_name, avatar_url, role)');
    let servicesQuery = supabase.from('services').select('*, owner:profiles(full_name, avatar_url, role)');

    if (term) {
      listingsQuery = listingsQuery.or(`title.ilike.%${term}%,location.ilike.%${term}%`);
      hotelsQuery = hotelsQuery.or(`name.ilike.%${term}%,location.ilike.%${term}%`);
      servicesQuery = servicesQuery.or(`business_name.ilike.%${term}%,category.ilike.%${term}%,location.ilike.%${term}%`);
    }
    if (maxPrice && !Number.isNaN(maxPrice)) {
      listingsQuery = listingsQuery.lte('price', maxPrice);
      hotelsQuery = hotelsQuery.lte('rate', maxPrice);
      servicesQuery = servicesQuery.lte('rate', maxPrice);
    }

    const [{ data: listings }, { data: hotels }, { data: services }] = await Promise.all([
      listingsQuery.order('created_at', { ascending: false }).limit(30),
      hotelsQuery.order('created_at', { ascending: false }).limit(30),
      servicesQuery.order('created_at', { ascending: false }).limit(30),
    ]);

    const combined: SearchResult[] = [
      ...((listings as Listing[]) ?? []).map((item) => ({
        kind: 'listing' as const,
        id: item.id,
        sortPrice: item.price,
        createdAt: item.created_at,
        data: item,
      })),
      ...((hotels as Hotel[]) ?? []).map((item) => ({
        kind: 'hotel' as const,
        id: item.id,
        sortPrice: item.rate,
        createdAt: item.created_at,
        data: item,
      })),
      ...((services as Service[]) ?? []).map((item) => ({
        kind: 'service' as const,
        id: item.id,
        sortPrice: item.rate,
        createdAt: item.created_at,
        data: item,
      })),
    ];

    combined.sort((a, b) => {
      if (sort === 'price_asc') return a.sortPrice - b.sortPrice;
      if (sort === 'price_desc') return b.sortPrice - a.sortPrice;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setResults(combined);
    setLoading(false);
  }

  async function handleHire(service: Service) {
    if (!session) {
      router.push('/auth');
      return;
    }
    if (hiring) return;
    setHiring(true);
    try {
      const conversationId = await getOrCreateConversation(session.user.id, service.owner_id, null);
      router.push(`/messages/${conversationId}`);
    } catch (err) {
      Alert.alert('Could not start conversation', friendlyErrorMessage(err));
    } finally {
      setHiring(false);
    }
  }

  const resultCountLabel = useMemo(
    () => `${results.length} result${results.length === 1 ? '' : 's'} found`,
    [results.length]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Goderich, Plumbers, Hotels..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <View style={styles.filterRow}>
          <View style={styles.budgetField}>
            <Text style={styles.budgetPrefix}>NLE</Text>
            <TextInput
              style={styles.budgetInput}
              placeholder="Budget"
              placeholderTextColor={colors.textMuted}
              value={budget}
              onChangeText={setBudget}
              keyboardType="decimal-pad"
            />
          </View>
          <Pressable style={styles.sortButton} onPress={() => setSortMenuOpen(true)}>
            <Ionicons name="options-outline" size={20} color={colors.textPrimary} />
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
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            if (item.kind === 'listing') return <ListingCard listing={item.data} />;
            if (item.kind === 'hotel') return <HotelCard hotel={item.data} />;
            return <ServiceCard service={item.data} onHire={() => handleHire(item.data)} />;
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No results. Try a different search or budget.</Text>
            </View>
          }
        />
      )}

      <Modal visible={sortMenuOpen} transparent animationType="fade" onRequestClose={() => setSortMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSortMenuOpen(false)}>
          <View style={styles.sheet}>
            {(Object.keys(sortLabels) as SortMode[]).map((mode) => (
              <Pressable
                key={mode}
                style={styles.option}
                onPress={() => {
                  setSortMode(mode);
                  setSortMenuOpen(false);
                }}
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
  budgetPrefix: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '600' },
  budgetInput: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary, paddingVertical: 10 },
  sortButton: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCount: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  emptyState: { paddingTop: spacing.xxl, alignItems: 'center' },
  emptyStateText: { color: colors.textMuted, fontSize: fontSize.sm },
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
  optionTextActive: { color: colors.accent, fontWeight: '600' },
});
