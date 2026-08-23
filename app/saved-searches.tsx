import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { friendlyErrorMessage } from '../lib/errors';
import { appAlert } from '../lib/alert';
import { colors, fontSize, fontWeight, radius, spacing } from '../constants/theme';

type SavedSearch = {
  id: string;
  query: string | null;
  max_price: number | null;
  created_at: string;
};

export default function SavedSearchesScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!session) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('saved_searches')
      .select('id, query, max_price, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    setLoadError(false);
    setItems((data as SavedSearch[]) ?? []);
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function confirmRemove(item: SavedSearch) {
    appAlert('Remove saved search', 'You will no longer be notified about this search.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeSearch(item) },
    ]);
  }

  async function removeSearch(item: SavedSearch) {
    const { error } = await supabase.from('saved_searches').delete().eq('id', item.id);
    if (error) {
      appAlert('Could not remove search', friendlyErrorMessage(error));
      return;
    }
    setItems((prev) => prev.filter((s) => s.id !== item.id));
  }

  function labelFor(item: SavedSearch) {
    const parts: string[] = [];
    if (item.query) parts.push(`"${item.query}"`);
    if (item.max_price != null) parts.push(`under NLE ${Math.round(item.max_price).toLocaleString('en-US')}`);
    return parts.length ? parts.join(' · ') : 'All listings';
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Ionicons name="bookmark" size={18} color={colors.accent} />
        <Text style={styles.headerTitle}>Saved Searches</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name="search-outline" size={16} color={colors.accent} />
              </View>
              <Text style={styles.rowText} numberOfLines={1}>
                {labelFor(item)}
              </Text>
              <Pressable
                onPress={() => confirmRemove(item)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Delete saved search: ${labelFor(item)}`}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="bookmark-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyStateTitle}>
                {loadError ? "Couldn't load saved searches" : 'No saved searches yet'}
              </Text>
              <Text style={styles.emptyStateText}>
                {loadError
                  ? 'Check your connection and try again.'
                  : 'Save a search and we’ll notify you when a new listing matches.'}
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
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyStateTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  emptyStateText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
});
