import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/auth-context';
import { FavoritesProvider } from '../lib/favorites-context';
import { AlertProvider } from '../lib/alert';
import { colors, fontSize, fontWeight, spacing } from '../constants/theme';

// Data Saver was removed entirely (it's no longer a setting anywhere in the
// app) -- this clears the one AsyncStorage/localStorage key it used to
// leave behind on devices that had it set, so removing the feature doesn't
// also leave orphaned storage. Safe to call on every boot: a no-op once the
// key is gone.
AsyncStorage.removeItem('easyfen_data_lite_mode').catch(() => {});

// Must be called at import time, not inside a component -- doing it later
// risks the native module auto-hiding the splash before this ever runs.
// No-ops safely on web (there's no native splash there to hold open).
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 400, fade: true });

// Shows the actual error on screen instead of silently crash-looping the app,
// so problems in release builds can be diagnosed from a screenshot.
class RootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView contentContainerStyle={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack?.split('\n').slice(0, 12).join('\n')}
          </Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  // Splash is always the first thing shown on a bare cold launch (just
  // opening the app), for returning users too -- not just a first-run
  // gate. It decides on its own (see app/splash.tsx) whether to continue
  // to onboarding or straight into the app, after a fixed short delay.
  //
  // It must NOT hijack a launch that already has real intent, though: a
  // shared listing deep link, or the web OAuth callback landing on
  // /auth-callback mid-flow (that's a full page load on web, so this
  // layout mounts fresh right in the middle of it) -- redirecting either
  // of those to /splash would either strip the destination or race
  // app/auth-callback.tsx's own redirect. Only the bare root path counts
  // as "no specific destination."
  //
  // The native splash (expo-splash-screen, app.json) is hidden right here,
  // unconditionally, regardless of which branch below fires -- it is
  // deliberately NOT tied to whether we redirected to /splash. That keeps
  // it independent of the routing fix above: a deep-link / OAuth-callback
  // cold launch never redirects to /splash, so if hiding the native splash
  // depended on that redirect happening, it would never hide at all for
  // those entry points and the app would look frozen on native's splash
  // forever. Hiding it here instead means every cold-launch path reaches
  // this same line and reveals whatever screen is about to render next.
  const pathname = usePathname();
  const [booting, setBooting] = useState(true);
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    if (pathname === '/') {
      router.replace('/splash');
    }
    setBooting(false);
    SplashScreen.hideAsync().catch(() => {});
  }, [pathname]);

  return (
    <RootErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AuthProvider>
            <FavoritesProvider>
              <AlertProvider>
                <StatusBar style="dark" />
                <View style={{ flex: 1 }}>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
                  </Stack>
                  {booting && (
                    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
                      <View style={{ flex: 1, backgroundColor: colors.background }} />
                    </View>
                  )}
                </View>
              </AlertProvider>
            </FavoritesProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  errorTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.danger, marginBottom: spacing.md },
  errorMessage: { fontSize: fontSize.sm, color: colors.textSecondary, fontFamily: 'monospace' },
});
