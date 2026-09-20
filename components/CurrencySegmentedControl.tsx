import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/theme';
import { type } from '../constants/typography';
import type { ListingCurrency } from '../lib/types';

const OPTIONS: { value: ListingCurrency; label: string }[] = [
  { value: 'NLE', label: 'Leones (NLe)' },
  { value: 'USD', label: 'Dollars ($)' },
];

// Full-label variant of CurrencyToggle for the Create Listing form, where a
// first-time, non-technical user needs to recognize the currency by name --
// "NLe" / "$" alone assumes familiarity CurrencyToggle's other callers (an
// already-oriented Edit Listing form) can assume but this can't. Selection
// is never color-only: the active segment also gets a checkmark, and the
// inactive one is visibly greyed out rather than just unhighlighted, so
// which currency is active reads clearly even in a glance.
export function CurrencySegmentedControl({
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
            style={[styles.segment, active ? styles.segmentActive : styles.segmentInactive]}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Price in ${option.value === 'NLE' ? 'Leones' : 'US Dollars'}`}
          >
            {active && <Ionicons name="checkmark-circle" size={16} color="#fff" style={styles.check} />}
            <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
  },
  segmentActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  // Visibly muted, not just "not highlighted" -- a greyed fill and border,
  // separate from the selected segment's brand-blue fill.
  segmentInactive: { backgroundColor: colors.border, borderColor: colors.border },
  check: { marginRight: 6 },
  label: { ...type.button, fontSize: 14 },
  labelActive: { color: '#fff' },
  // textSecondary, not textMuted -- textMuted only clears 4.1:1 against
  // this fill (fails the 4.5:1 AA floor); textSecondary clears 5.8:1.
  labelInactive: { color: colors.textSecondary },
});
