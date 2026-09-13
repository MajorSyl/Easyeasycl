import { useEffect, useState } from 'react';
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
// choice as components/AppInstallPrompt.tsx, see its comment for why.
const BRAND_BLUE = '#3E6FBF';

// The browser fires this before showing its own native "Install app" UI on
// Chrome/Android and holds a deferred prompt we can trigger ourselves from
// a button tap -- but only if the page hasn't already been installed and
// the browser thinks the PWA is installable (valid manifest + service
// worker + HTTPS). Safari never fires this; there, "Add to Home Screen"
// stays a manual Share-menu step with no programmatic equivalent.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function DownloadScreen() {
  const insets = useSafeAreaInsets();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showApkOption, setShowApkOption] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    function onPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  async function triggerInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Get the App</Text>
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
              This page is for installing Easyfen on the web — nothing to do here on your phone.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Install Easyfen on your phone</Text>
            <Text style={styles.subtitle}>
              No App Store or Play Store needed. Add Easyfen straight to your Home Screen — it opens full-screen like
              a real app, and every update we ship appears the next time you open it, automatically.
            </Text>

            {installPrompt && (
              <Pressable style={styles.installNowBtn} onPress={triggerInstall}>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.installNowBtnText}>Install App</Text>
              </Pressable>
            )}

            {/* iOS */}
            <View style={styles.platformSection}>
              <View style={styles.platformHeader}>
                <Ionicons name="logo-apple" size={18} color={colors.textPrimary} />
                <Text style={styles.platformTitle}>iPhone &amp; iPad (Safari)</Text>
              </View>

              <View style={styles.instructions}>
                <InstructionStep
                  number={1}
                  text="Open easyfen.com in Safari — this has to be Safari, since Chrome and other browsers on iOS can't add to the Home Screen."
                  icon="compass-outline"
                />
                <InstructionStep
                  number={2}
                  text="Tap the Share button in the toolbar — the square with an arrow pointing up."
                  icon="share-outline"
                />
                <InstructionStep number={3} text='Scroll down and tap "Add to Home Screen".' icon="add-circle-outline" />
                <InstructionStep number={4} text={'Tap "Add" in the top-right corner — that\'s it.'} icon="checkmark-circle-outline" />
              </View>
            </View>

            {/* Secondary: native Android APK */}
            <Pressable style={styles.apkToggle} onPress={() => setShowApkOption((v) => !v)}>
              <Text style={styles.apkToggleText}>Prefer a native Android app instead?</Text>
              <Ionicons name={showApkOption ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
            </Pressable>

            {showApkOption && (
              <View style={styles.apkSection}>
                <Text style={styles.apkNote}>
                  This is a separate, standalone Android app (.apk), not the auto-updating web install above. New
                  versions require manually downloading and reinstalling it — the web install updates itself with
                  every visit, so most people are better off with that.
                </Text>
                <Pressable style={styles.downloadBtn} onPress={() => Linking.openURL(APK_DOWNLOAD_URL)}>
                  <Ionicons name="download-outline" size={18} color="#fff" />
                  <Text style={styles.downloadBtnText}>Download for Android</Text>
                </Pressable>
                <Text style={styles.fileNote}>Downloads an .apk file (~105 MB), no Play Store account needed.</Text>
              </View>
            )}
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
    maxWidth: 420,
  },
  installNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: BRAND_BLUE,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
    marginBottom: spacing.xl,
  },
  installNowBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: '#fff' },
  platformSection: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  platformTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.textSecondary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignSelf: 'stretch',
    marginTop: spacing.md,
  },
  downloadBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: '#fff' },
  fileNote: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center' },
  instructions: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    width: '100%',
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
  apkToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  apkToggleText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },
  apkSection: {
    width: '100%',
    marginTop: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  apkNote: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18, marginBottom: spacing.sm },
  alreadyHave: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  alreadyHaveTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  alreadyHaveBody: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', maxWidth: 300 },
});
