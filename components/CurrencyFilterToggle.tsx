import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight, radius } from '../constants/theme';

// A filter needs an "All" state a listing itself can never have (every
// listing has exactly one currency) -- that's why this is a separate
// three-way toggle from CurrencyToggle rather than reusing it. Comparing a
// price across currencies without a fixed exchange rate is meaningless, so
// "All" means "not comparing by price at all" rather than "show both."
export type CurrencyFilter = 'ALL' | 'NLE' | 'USD';

const OPTIONS: { value: CurrencyFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'NLE', label: 'NLe' },
  { value: 'USD', label: '$' },
];

export function CurrencyFilterToggle({
  value,
  onChange,
}: {
  value: CurrencyFilter;
  onChange: (value: CurrencyFilter) => void;
}) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={
              option.value === 'ALL' ? 'All currencies' : option.value === 'NLE' ? 'Leones' : 'US Dollars'
            }
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md - 3,
  },
  segmentActive: { backgroundColor: colors.accent },
  label: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted },
  labelActive: { color: '#fff' },
});
