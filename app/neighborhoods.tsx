import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, fontSize, fontWeight, radius, spacing } from '../constants/theme';
import { FREETOWN_NEIGHBORHOODS } from '../constants/neighborhoods';

type NeighborhoodCount = { name: string; count: number };

export default function NeighborhoodsScreen() {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<NeighborhoodCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('listings').select('location').eq('is_active', true);
    if (error) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    setLoadError(false);

    const locations = (data ?? []).map((r) => (r.location ?? '').toLowerCase());
    const counts: NeighborhoodCount[] = FREETOWN_NEIGHBORHOODS.map((name) => ({
      name,
      count: locations.filter((loc) => loc.includes(name.toLowerCase())).length,
    })).filter((n) => n.count > 0);

    counts.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    setRows(counts);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Browse by Neighborhood</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/neighborhood/${encodeURIComponent(item.name)}`)}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="location-outline" size={18} color={colors.accent} />
              </View>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowCount}>
                {item.count} listing{item.count === 1 ? '' : 's'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name={loadError ? 'cloud-offline-outline' : 'location-outline'}
                size={36}
                color={colors.textMuted}
              />
              <Text style={styles.emptyStateText}>
                {loadError
                  ? "Couldn't load neighborhoods. Check your connection and try again."
                  : 'No neighborhoods with active listings yet.'}
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  rowCount: { fontSize: fontSize.sm, color: colors.textMuted },
  emptyState: { paddingTop: spacing.xxl, alignItems: 'center', gap: spacing.sm },
  emptyStateText: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center', paddingHorizontal: spacing.xl },
});
