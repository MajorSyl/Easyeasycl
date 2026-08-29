import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, fontWeight, radius, spacing } from '../constants/theme';
import { Logo } from '../components/Logo';

// Published by .github/workflows/eas-build.yml -- every APK build replaces
// this exact release asset rather than creating a new release, so the URL
// itself never changes between versions. Nothing here needs to change the
// next time a new build ships.
const APK_DOWNLOAD_URL = 'https://github.com/MajorSyl/Easyeasycl/releases/download/android-latest/easyfen.apk';

// Brand mark blue, not constants/theme.ts's UI accent -- same deliberate
// choice as DownloadAppBanner.tsx, see its comment for why.
const BRAND_BLUE = '#3E6FBF';

export default function DownloadScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Download Easyfen</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.logoRow}>
          <Logo size={48} showWordmark={false} />
        </View>

        {Platform.OS !== 'web' ? (
          <View style={styles.alreadyHave}>
            <Ionicons name="checkmark-circle" size={28} color={colors.accent} />
            <Text style={styles.alreadyHaveTitle}>You're already using the app 🎉</Text>
            <Text style={styles.alreadyHaveBody}>
              This page is for downloading Easyfen on the web — nothing to do here on your phone.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Get Easyfen on your phone</Text>
            <Text style={styles.subtitle}>
              Browse, message agents, and post listings on the go. Pick your platform below.
            </Text>

            {/* Android */}
            <View style={styles.platformSection}>
              <View style={styles.platformHeader}>
                <Ionicons name="logo-android" size={18} color={colors.textPrimary} />
                <Text style={styles.platformTitle}>Android</Text>
              </View>

              <Pressable style={styles.downloadBtn} onPress={() => Linking.openURL(APK_DOWNLOAD_URL)}>
                <Ionicons name="download-outline" size={20} color="#fff" />
                <Text style={styles.downloadBtnText}>Download for Android</Text>
              </Pressable>
              <Text style={styles.fileNote}>Downloads an .apk file (~105 MB), no Play Store account needed.</Text>

              <View style={styles.instructions}>
                <Text style={styles.instructionsTitle}>Installing it</Text>
                <InstructionStep number={1} text="Tap Download above and let the .apk file finish downloading." />
                <InstructionStep
                  number={2}
                  text={'Open it from your Downloads/notifications. If Android blocks it, tap "Settings" in the prompt and allow installs from this source — that\'s expected for an app outside the Play Store.'}
                />
                <InstructionStep number={3} text="Tap Install, then open Easyfen and sign in or create an account." />
              </View>
            </View>

            {/* iOS */}
            <View style={styles.platformSection}>
              <View style={styles.platformHeader}>
                <Ionicons name="logo-apple" size={18} color={colors.textPrimary} />
                <Text style={styles.platformTitle}>iPhone &amp; iPad</Text>
              </View>
              <Text style={styles.platformNote}>
                Easyfen isn't in the App Store yet — instead, add it to your Home Screen straight from Safari. It
                opens full-screen like a regular app, with its own icon, and works from an internet connection you've
                used before even when you go offline.
              </Text>

              <View style={styles.instructions}>
                <Text style={styles.instructionsTitle}>Add to Home Screen</Text>
                <InstructionStep
                  number={1}
                  text="Open easyfen.com in Safari (this has to be Safari — Chrome and other browsers on iOS can't add to the Home Screen)."
                  icon="compass-outline"
                />
                <InstructionStep
                  number={2}
                  text='Tap the Share button in the toolbar — the square with an arrow pointing up.'
                  icon="share-outline"
                />
                <InstructionStep number={3} text='Scroll down and tap "Add to Home Screen".' icon="add-circle-outline" />
                <InstructionStep number={4} text={'Tap "Add" in the top-right corner — that\'s it.'} icon="checkmark-circle-outline" />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function InstructionStep({ number, text, icon }: { number: number; text: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
      {icon && <Ionicons name={icon} size={18} color={colors.textMuted} style={styles.stepIcon} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textPrimary },
  body: { padding: spacing.xl, maxWidth: 560, alignSelf: 'center', width: '100%', alignItems: 'center' },
  logoRow: { marginBottom: spacing.lg },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.xl,
    maxWidth: 380,
  },
  platformSection: {
    width: '100%',
    marginBottom: spacing.xxl,
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  platformTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
  platformNote: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: BRAND_BLUE,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignSelf: 'flex-start',
  },
  downloadBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: '#fff' },
  fileNote: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.sm },
  instructions: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    width: '100%',
  },
  instructionsTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.accent },
  stepText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  stepIcon: { marginTop: 1 },
  alreadyHave: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  alreadyHaveTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  alreadyHaveBody: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', maxWidth: 300 },
});
