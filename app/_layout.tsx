import { Component, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { WebFooter } from '../components/WebFooter';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/auth-context';
import { FavoritesProvider } from '../lib/favorites-context';

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
  return (
    <RootErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AuthProvider>
            <FavoritesProvider>
              <StatusBar style="dark" />
              <View style={{ flex: 1 }}>
                <Stack style={{ flex: 1 }} screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
                </Stack>
                <WebFooter />
              </View>
            </FavoritesProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#B42318', marginBottom: 12 },
  errorMessage: { fontSize: 13, color: '#344054', fontFamily: 'monospace' },
});
