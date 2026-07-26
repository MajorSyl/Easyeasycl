import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSize, spacing } from '../constants/theme';

const LINKS = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Community Guidelines', href: '/guidelines' },
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
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  brand: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  links: {
    flexDirection: 'row',
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
