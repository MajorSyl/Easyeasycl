import { useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, fontWeight, radius, spacing } from '../constants/theme';
import { Logo } from '../components/Logo';
import {
  ChatIllustration,
  CottonTreeIllustration,
  IllustrationCard,
  SkylineIllustration,
  WaveBeachIllustration,
} from '../components/illustrations';

export const ONBOARDING_SEEN_KEY = 'easyfen_seen_onboarding';

const SLIDES = [
  {
    headline: 'Find your next home in Freetown',
    body: 'Real listings across every neighborhood you know — from Aberdeen to Wilberforce.',
    Illustration: CottonTreeIllustration,
  },
  {
    headline: 'Real listings, real neighborhoods',
    body: 'Search where you actually want to live, filter by price, and see what’s new first.',
    Illustration: WaveBeachIllustration,
  },
  {
    headline: 'Message agents and owners directly',
    body: 'No middlemen, no wasted trips — just a conversation.',
    Illustration: ChatIllustration,
  },
  {
    headline: 'List your properties, reach real buyers',
    body: 'Post in minutes and get discovered across the city.',
    Illustration: SkylineIllustration,
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  async function finish() {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    router.replace('/');
  }

  function goNext() {
    if (isLast) {
      finish();
      return;
    }
    scrollRef.current?.scrollTo({ x: width * (index + 1), animated: true });
    setIndex(index + 1);
  }

  function handleScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.skipRow}>
        <Logo size={28} showWordmark={false} />
        <Pressable onPress={finish} hitSlop={8} accessibilityRole="button" accessibilityLabel="Skip onboarding">
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <IllustrationCard size={Math.min(width * 0.6, 240)}>
              <slide.Illustration width={Math.min(width * 0.6, 240)} height={Math.min(width * 0.6, 240)} />
            </IllustrationCard>
            <Text style={styles.headline}>{slide.headline}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.dots} accessibilityLabel={`Slide ${index + 1} of ${SLIDES.length}`}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <Pressable
          style={styles.cta}
          onPress={goNext}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Get Started' : 'Next slide'}
        >
          <Text style={styles.ctaText}>{isLast ? 'Get Started' : 'Next'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  skipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  skip: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.semibold },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl, gap: spacing.xl },
  headline: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 34,
  },
  body: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, maxWidth: 320 },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.accent, width: 20 },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.xxl,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
