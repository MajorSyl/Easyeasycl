import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight, radius } from '../constants/theme';
import type { ListingCurrency } from '../lib/types';

const OPTIONS: { value: ListingCurrency; label: string }[] = [
  { value: 'NLE', label: 'NLe' },
  { value: 'USD', label: '$' },
];

// A two-way pill toggle rather than SelectField's modal sheet -- with only
// two options, a same-screen tap reads faster than opening a full sheet for
// a binary choice, and it sits naturally right beside the price input.
export function CurrencyToggle({
  value,
  onChange,
}: {
  value: ListingCurrency;
  onChange: (value: ListingCurrency) => void;
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
            accessibilityLabel={`Price in ${option.value === 'NLE' ? 'Leones' : 'US Dollars'}`}
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md - 3,
  },
  segmentActive: { backgroundColor: colors.accent },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMuted },
  labelActive: { color: '#fff' },
});
