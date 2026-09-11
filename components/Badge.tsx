import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';
import { type } from '../constants/typography';

type BadgeVariant = 'dark' | 'premium' | 'brand';

// Uppercase + letter-spacing is a deliberate, singular choice for the
// category chip ("RENT" / "SALE") -- it borrows the convention of real
// estate yard-sign lettering, so it reads as intentional rather than the
// generic "every label gets tracked-out caps" tell. The premium and brand
// badges are trust signals, not signage, so they stay normal case.
//
// 'brand' (solid accent blue, white text) is used for the card-overlay
// "New" / "Verified" tags -- our blue standing in for the highlighted-badge
// color an Airbnb-pattern card would otherwise use pink/red for.
export function Badge({ label, variant }: { label: string; variant: BadgeVariant }) {
  return (
    <View style={[styles.base, styles[variant]]}>
      <Text style={[styles[`${variant}Text` as const], variant === 'dark' ? styles.darkLabel : styles.premiumLabel]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  dark: { backgroundColor: colors.badgeDarkBg },
  premium: { backgroundColor: colors.premiumBg },
  brand: { backgroundColor: colors.accent },
  darkLabel: { ...type.eyebrow },
  premiumLabel: { ...type.labelStrong },
  darkText: { color: colors.badgeDarkText },
  premiumText: { color: colors.premiumText },
  brandText: { color: '#fff' },
});
