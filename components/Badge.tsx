import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../constants/theme';

type BadgeVariant = 'dark' | 'premium';

export function Badge({ label, variant }: { label: string; variant: BadgeVariant }) {
  return (
    <View style={[styles.base, variant === 'dark' ? styles.dark : styles.premium]}>
      <Text style={[styles.text, variant === 'dark' ? styles.darkText : styles.premiumText]}>{label}</Text>
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
  text: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  darkText: { color: colors.badgeDarkText },
  premiumText: { color: colors.premiumText },
});
