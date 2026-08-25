import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/auth-context';
import { FavoritesProvider } from '../lib/favorites-context';
import { AlertProvider } from '../lib/alert';
import { SettingsProvider } from '../lib/settings';
import { colors, fontSize, fontWeight, spacing } from '../constants/theme';

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
  }, [pathname]);

  return (
    <RootErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AuthProvider>
            <FavoritesProvider>
              <SettingsProvider>
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
              </SettingsProvider>
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
