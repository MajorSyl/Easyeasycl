import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fontSize, fontWeight, radius, spacing } from '../constants/theme';

// Web-only -- native builds are already the app this promotes, so showing
// it there would be a confusing self-referential loop (see app/download.tsx,
// which has the same native guard).
//
// Uses the brand mark's blue (#3E6FBF) rather than constants/theme.ts's UI
// accent (#0052FF) -- deliberately: this is a brand moment ("get our app"),
// not an in-app interaction, the same distinction the admin dashboard's
// sidebar already makes for the same reason (see README's Brand section).
const BRAND_BLUE = '#3E6FBF';

export function DownloadAppBanner() {
  if (Platform.OS !== 'web') return null;

  return (
    <Pressable style={styles.banner} onPress={() => router.push('/download')}>
      <View style={styles.iconWrap}>
        <Ionicons name="logo-android" size={20} color="#fff" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Get the Easyfen app</Text>
        <Text style={styles.subtitle}>Free download for Android</Text>
      </View>
      <View style={styles.cta}>
        <Text style={styles.ctaText}>Download</Text>
        <Ionicons name="arrow-forward" size={14} color="#fff" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: BRAND_BLUE,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  title: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#fff' },
  subtitle: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  ctaText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: '#fff' },
});
