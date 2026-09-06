import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/theme';
import { type } from '../constants/typography';

// Web-only -- native builds are already the app this promotes, so showing
// it there would be a confusing self-referential loop (see app/download.tsx,
// which has the same native guard).
//
// This used to be a single cramped pill (icon, text, and a CTA all squeezed
// into one row with a tacked-on arrow) sitting directly under the "Find Your
// Dream Home" hero, competing with it for attention. It's now a bordered
// card -- not a solid brand-blue block -- so it reads as its own moment
// rather than a second hero, with real icon -> headline -> subtext -> CTA
// hierarchy and room for each to breathe.
export function DownloadAppBanner() {
  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="logo-android" size={22} color={colors.accent} />
      </View>
      <Text style={styles.title}>Get the Easyfen app</Text>
      <Text style={styles.subtitle}>Browse listings and message agents faster, right from your phone.</Text>
      <Pressable
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        onPress={() => router.push('/download')}
        accessibilityRole="button"
        accessibilityLabel="Download the Easyfen app for Android"
      >
        <Text style={styles.ctaText}>Download for Android</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { ...type.cardTitle, fontSize: 16, lineHeight: 21, color: colors.textPrimary },
  subtitle: { ...type.secondary, color: colors.textMuted, marginBottom: 6 },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: 11,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  ctaPressed: { backgroundColor: colors.accentStrong },
  ctaText: { ...type.button, color: '#fff' },
});
