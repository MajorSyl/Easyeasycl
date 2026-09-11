import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius, spacing } from '../constants/theme';
import { type } from '../constants/typography';

const DISMISSED_AT_KEY = 'easyfen_install_prompt_dismissed_at';
// "A few days" -- long enough that it isn't a nag on every visit, short
// enough that a genuinely interested-but-busy visitor sees it again.
const REPROMPT_AFTER_MS = 3 * 24 * 60 * 60 * 1000;
const SHOW_AFTER_MS = 3000;

// Module-level, not state -- this is "don't show again this session" in the
// most literal sense: it only resets on a real reload (page refresh / app
// relaunch), same lifetime as the in-memory session itself, independent of
// which screen re-mounts this component.
let dismissedThisSession = false;

// Web-only -- native builds are already the app this promotes. Was a
// permanent card wedged into the Home feed, pushing real listings down on
// every single visit; now a soft, deferred, dismissible prompt instead, so
// it asks once and then gets out of the way.
export function AppInstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || dismissedThisSession) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    AsyncStorage.getItem(DISMISSED_AT_KEY).then((raw) => {
      if (cancelled) return;
      const dismissedAt = raw ? Number(raw) : 0;
      if (dismissedAt && Date.now() - dismissedAt < REPROMPT_AFTER_MS) return;
      timer = setTimeout(() => {
        if (!cancelled && !dismissedThisSession) setVisible(true);
      }, SHOW_AFTER_MS);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    dismissedThisSession = true;
    setVisible(false);
    AsyncStorage.setItem(DISMISSED_AT_KEY, String(Date.now())).catch(() => {});
  }

  function download() {
    dismiss();
    router.push('/download');
  }

  if (Platform.OS !== 'web') return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss} accessibilityLabel="Close">
        {/* Swallow taps on the sheet itself so they don't bubble to the
            backdrop's dismiss handler. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Pressable
            style={styles.closeButton}
            onPress={dismiss}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>

          <View style={styles.iconWrap}>
            <Ionicons name="logo-android" size={22} color={colors.accent} />
          </View>
          <Text style={styles.title}>Get the Easyfen app</Text>
          <Text style={styles.subtitle}>Browse listings and message agents faster, right from your phone.</Text>

          <Pressable
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            onPress={download}
            accessibilityRole="button"
            accessibilityLabel="Download the Easyfen app for Android"
          >
            <Text style={styles.ctaText}>Download for Android</Text>
          </Pressable>
          <Pressable onPress={dismiss} hitSlop={8} style={styles.laterButton}>
            <Text style={styles.laterText}>Maybe later</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  closeButton: { position: 'absolute', top: spacing.md, right: spacing.md, padding: 4 },
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
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  ctaPressed: { backgroundColor: colors.accentStrong },
  ctaText: { ...type.button, color: '#fff' },
  laterButton: { alignSelf: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  laterText: { ...type.button, color: colors.textMuted },
});
