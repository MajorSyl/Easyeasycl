import { Component, useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebFooter } from '../components/WebFooter';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/auth-context';
import { FavoritesProvider } from '../lib/favorites-context';
import { AlertProvider } from '../lib/alert';
import { colors, fontSize, fontWeight, spacing } from '../constants/theme';
import { WELCOME_SEEN_KEY } from './welcome';

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
  const [checkingWelcome, setCheckingWelcome] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(WELCOME_SEEN_KEY).then((seen) => {
      if (!seen) router.replace('/welcome');
      setCheckingWelcome(false);
    });
  }, []);

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
                    <Stack.Screen name="welcome" />
                  </Stack>
                  {checkingWelcome && (
                    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
                      <View style={{ flex: 1, backgroundColor: colors.background }} />
                    </View>
                  )}
                  <WebFooter />
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
