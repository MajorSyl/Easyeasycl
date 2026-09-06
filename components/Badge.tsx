import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';
import { type } from '../constants/typography';

type BadgeVariant = 'dark' | 'premium';

// Uppercase + letter-spacing is a deliberate, singular choice for the
// category chip ("RENT" / "SALE") -- it borrows the convention of real
// estate yard-sign lettering, so it reads as intentional rather than the
// generic "every label gets tracked-out caps" tell. The premium badge is a
// trust signal, not signage, so it stays normal case.
export function Badge({ label, variant }: { label: string; variant: BadgeVariant }) {
  return (
    <View style={[styles.base, variant === 'dark' ? styles.dark : styles.premium]}>
      <Text style={[variant === 'dark' ? styles.darkText : styles.premiumText, variant === 'dark' ? styles.darkLabel : styles.premiumLabel]}>
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
  darkLabel: { ...type.eyebrow },
  premiumLabel: { ...type.labelStrong },
  darkText: { color: colors.badgeDarkText },
  premiumText: { color: colors.premiumText },
});
