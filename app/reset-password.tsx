import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from '../lib/supabase';
import { friendlyErrorMessage } from '../lib/errors';
import { colors, fontSize, fontWeight, radius, spacing } from '../constants/theme';
import { Logo } from '../components/Logo';

const MIN_PASSWORD_LENGTH = 8;

type Status = 'checking' | 'ready' | 'invalid' | 'saving' | 'done';

// Supabase's recovery link puts the token in the URL's hash fragment (its
// implicit-flow format) rather than the query string, so it never reaches a
// server and Expo Router's own params parsing won't see it either. This
// app's Supabase client also has detectSessionInUrl off (lib/supabase.ts --
// disabled because Google sign-in's web redirect is already handled by
// hand, see lib/google-auth.ts), so nothing auto-detects it. Extract it
// with the same expo-auth-session helper Google sign-in uses, and turn it
// into a real session with setSession() ourselves.
async function extractRecoverySession(): Promise<boolean> {
  const url = Platform.OS === 'web' ? window.location.href : await Linking.getInitialURL();
  if (!url) return false;
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode || params.type !== 'recovery' || !params.access_token || !params.refresh_token) {
    return false;
  }
  const { error } = await supabase.auth.setSession({
    access_token: params.access_token,
    refresh_token: params.refresh_token,
  });
  return !error;
}

export default function ResetPasswordScreen() {
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    extractRecoverySession().then((ok) => setStatus(ok ? 'ready' : 'invalid'));
  }, []);

  async function handleSubmit() {
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setStatus('saving');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(friendlyErrorMessage(updateError.message));
      setStatus('ready');
      return;
    }
    setStatus('done');
    setTimeout(() => router.replace('/'), 1500);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.brandRow}>
        <Logo size={56} showWordmark={false} />
      </View>

      <Text style={styles.title}>Set a new password</Text>

      {status === 'checking' && (
        <View style={styles.centerBlock}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.subtitle}>Verifying your reset link…</Text>
        </View>
      )}

      {status === 'invalid' && (
        <Text style={styles.error}>
          This reset link is invalid or has expired. Go back to the login screen and tap "Forgot password?" to
          request a new one.
        </Text>
      )}

      {(status === 'ready' || status === 'saving') && (
        <>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>New password</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Confirm new password</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor={colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.submitButton, status === 'saving' && styles.submitButtonDisabled]}
            disabled={status === 'saving'}
            onPress={handleSubmit}
          >
            {status === 'saving' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Set new password</Text>
            )}
          </Pressable>
        </>
      )}

      {status === 'done' && <Text style={styles.notice}>Password updated. Redirecting you…</Text>}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, justifyContent: 'center' },
  brandRow: { alignItems: 'center', marginBottom: spacing.lg },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  centerBlock: { alignItems: 'center', gap: spacing.md },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center' },
  field: { marginBottom: spacing.md },
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  error: { color: colors.danger, fontSize: fontSize.sm, marginBottom: spacing.md, textAlign: 'center' },
  notice: { color: colors.success, fontSize: fontSize.sm, textAlign: 'center' },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitButtonDisabled: { backgroundColor: colors.border },
  submitText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
