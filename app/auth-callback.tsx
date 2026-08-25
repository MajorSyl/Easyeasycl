import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSize, spacing } from '../constants/theme';
import { finishWebGoogleSignIn, isFirstSignIn } from '../lib/google-auth';
import { appAlert } from '../lib/alert';
import { supabase } from '../lib/supabase';

// Landing page for the web Google sign-in redirect (see
// lib/google-auth.ts). Native never actually navigates here -- its OAuth
// redirect is captured directly inside signInWithGoogle() before app
// navigation happens, so this screen only has real work to do on web.
export default function AuthCallbackScreen() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    finishWebGoogleSignIn().then(async (errorMessage) => {
      if (errorMessage) {
        appAlert('Could not sign in with Google', errorMessage);
        router.replace('/');
        return;
      }

      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        router.replace('/');
        return;
      }

      router.replace(isFirstSignIn(user) ? '/select-role' : '/');
    });
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.text}>Finishing sign-in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.background },
  text: { fontSize: fontSize.sm, color: colors.textSecondary },
});
