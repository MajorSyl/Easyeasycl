import { StyleSheet, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '../components/Logo';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '../constants/theme';

export const WELCOME_SEEN_KEY = 'easyfen_seen_welcome';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  async function getStarted() {
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, '1');
    router.replace('/');
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.hero}>
        <View style={styles.heroBackdrop} />
        <View style={styles.heroMark}>
          <Logo size={140} showWordmark={false} />
        </View>
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>Let's Explore{'\n'}Beautiful Homes</Text>
        <Text style={styles.subtitle}>
          Find rentals, homes for sale, and land across Sierra Leone — search by neighborhood, message agents
          directly, and save your favorites along the way.
        </Text>
      </View>

      <Pressable style={styles.cta} onPress={getStarted}>
        <Text style={styles.ctaText}>Get Started</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xl, justifyContent: 'space-between' },
  hero: { alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  heroBackdrop: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.accentSoft,
  },
  heroMark: {
    borderRadius: radius.xxl,
    ...shadow.raised,
  },
  copy: { alignItems: 'flex-start' },
  title: { fontSize: fontSize.display, fontWeight: fontWeight.bold, color: colors.textPrimary, lineHeight: 40 },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.md, lineHeight: 21 },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.xxl,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    ...shadow.raised,
  },
  ctaText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
