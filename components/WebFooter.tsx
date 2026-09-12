import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSize, radius, spacing } from '../constants/theme';

const LINKS = [
  { label: 'Download App', href: '/download' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Community Guidelines', href: '/guidelines' },
  { label: 'Agent Agreement', href: '/agent-agreement' },
] as const;

export function WebFooter() {
  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.footer}>
      <Text style={styles.brand}>© {new Date().getFullYear()} Easyfen. All rights reserved.</Text>
      <View style={styles.links}>
        {LINKS.map((link, i) => (
          <View key={link.href} style={styles.linkWrap}>
            {i > 0 && <Text style={styles.sep}>·</Text>}
            <Pressable onPress={() => router.push(link.href as any)}>
              {({ hovered }: any) => (
                <Text style={[styles.link, hovered && styles.linkHovered]}>{link.label}</Text>
              )}
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Matches the rounded-card treatment used everywhere else on Profile
  // (headerCard, savedRow, etc.) -- this used to be a flat, unbordered
  // rectangle with no breathing room from the cards around it, which read
  // as an unstyled leftover rather than part of the same page.
  //
  // Stacked column, not a row-with-space-between: `links` is a nested flex
  // row, and a nested row's `flexWrap` has no width to wrap *within* unless
  // its parent stretches it to fill the line (the default 'stretch'
  // cross-axis behavior of a column) -- as a row-sharing-space-with-`brand`
  // child it only shrinks to its own content and overflows past the card's
  // (and the viewport's) edge instead of wrapping, which is what cut off
  // the last one or two links on narrow screens.
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  brand: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  linkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sep: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  link: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  linkHovered: {
    color: colors.accent,
  },
});
