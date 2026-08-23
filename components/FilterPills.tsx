import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { EdgeFade } from './EdgeFade';

export type PillOption<T extends string> = { value: T; label: string };

export function FilterPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => onChange(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              {/* Active state is never color-only: a checkmark also appears,
                  so filter selection reads for color-vision-deficient users too. */}
              {active && <Ionicons name="checkmark" size={14} color="#fff" style={styles.pillCheck} />}
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <EdgeFade />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  row: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingRight: spacing.xl },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
  },
  pillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillCheck: { marginRight: 4 },
  pillText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  pillTextActive: { color: '#fff', fontWeight: '700' },
});
