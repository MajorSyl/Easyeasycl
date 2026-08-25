import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';
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
  const { width, height } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 550, useNativeDriver: true }).start();

    const timer = setTimeout(async () => {
      const seen = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
      router.replace(seen ? '/' : '/onboarding');
    }, AUTO_ADVANCE_MS);

    return () => clearTimeout(timer);
  }, [opacity]);

  // Skyline is capped to a fixed band at the bottom of the screen so it
  // never grows tall enough to crowd the logo above it -- the two never
  // share vertical space, regardless of device height.
  const skylineHeight = Math.min(height * 0.28, 260);

  return (
    <View style={styles.container}>
      <View style={styles.logoZone}>
        <Animated.View style={{ opacity }}>
          <Logo size={Math.min(width * 0.62, 280)} />
        </Animated.View>
      </View>

      <View style={[styles.backdrop, { height: skylineHeight }]} pointerEvents="none">
        <SkylineIllustration width={width} height={skylineHeight} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  logoZone: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backdrop: { width: '100%' },
});
