import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '../constants/theme';

export type AmenityItem = { icon: keyof typeof Ionicons.glyphMap; label: string };

// Floating white quick-facts strip shown under a listing's photo carousel.
export function AmenityBar({ items }: { items: AmenityItem[] }) {
  return (
    <View style={styles.container}>
      {items.map((item) => (
        <View key={item.label} style={styles.item}>
          <Ionicons name={item.icon} size={18} color={colors.accent} />
          <Text style={styles.label} numberOfLines={1}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    ...shadow.card,
  },
  item: { flex: 1, alignItems: 'center', gap: 4 },
  label: { fontSize: 10, fontWeight: fontWeight.medium, color: colors.textMuted },
});
