import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '../constants/theme';
import { type } from '../constants/typography';
import { Logo } from './Logo';

const DISMISSED_KEY = 'easyfen_install_banner_dismissed';

// Web-only -- native builds are already the app this promotes. An
// Airbnb-style top banner: once closed it's gone for good (persisted to
// localStorage via AsyncStorage), not a nag that reappears on a timer.
export function AppInstallPrompt() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    AsyncStorage.getItem(DISMISSED_KEY).then((raw) => {
      setDismissed(raw === 'true');
    });
  }, []);

  function dismiss() {
    setDismissed(true);
    AsyncStorage.setItem(DISMISSED_KEY, 'true').catch(() => {});
  }

  function useApp() {
    dismiss();
    router.push('/download');
  }

  if (Platform.OS !== 'web' || dismissed) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.iconWrap}>
        <Logo size={28} showWordmark={false} />
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.title} numberOfLines={1}>
          Get the Easyfen App
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          The fastest way to use Easyfen
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        onPress={useApp}
        accessibilityRole="button"
        accessibilityLabel="Use the Easyfen app"
      >
        <Text style={styles.ctaText}>Use App</Text>
      </Pressable>
      <Pressable
        style={styles.closeButton}
        onPress={dismiss}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <Ionicons name="close" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xl + spacing.sm,
    ...shadow.card,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { flex: 1, minWidth: 0 },
  title: { ...type.cardTitle, fontSize: fontSize.sm, color: colors.textPrimary },
  subtitle: { ...type.secondary, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
  },
  ctaPressed: { backgroundColor: colors.accentStrong },
  ctaText: { ...type.button, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: '#fff' },
  closeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
