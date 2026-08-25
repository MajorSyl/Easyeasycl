import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Logo } from '../components/Logo';
import { SkylineIllustration } from '../components/illustrations';
import { colors } from '../constants/theme';
import { ONBOARDING_SEEN_KEY } from './onboarding';

const AUTO_ADVANCE_MS = 1500;

// Always the first screen on a cold launch (see app/_layout.tsx), for
// returning users too — not just a first-run gate. Fades the logo in, then
// after a fixed delay routes on to the onboarding carousel (never seen
// it) or straight into the app (seen it before).
export default function SplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 550, useNativeDriver: true }).start();

    const timer = setTimeout(async () => {
      const seen = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
      router.replace(seen ? '/' : '/onboarding');
    }, AUTO_ADVANCE_MS);

    return () => clearTimeout(timer);
  }, [opacity]);

  return (
    <View style={styles.container}>
      <View style={styles.backdrop} pointerEvents="none">
        <SkylineIllustration width={480} height={320} />
      </View>
      <Animated.View style={{ opacity }}>
        <Logo size={120} showWordmark={false} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  backdrop: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', opacity: 0.9 },
});
