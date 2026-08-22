import { useRef, useState } from 'react';
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
import { useAuth } from '../lib/auth-context';
import { friendlyErrorMessage } from '../lib/errors';
import { colors, fontSize, fontWeight, radius, spacing } from '../constants/theme';
import { Logo } from '../components/Logo';

// Cheap, no-third-party-account bot deterrents for signup: a field real
// users never see or fill (bots that auto-fill every form field do), and a
// minimum time-on-form (scripted submits happen in milliseconds; humans
// take at least a couple seconds to type a name/email/password).
const HONEYPOT_MIN_MS = 2000;

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState(''); // honeypot — must stay empty
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const mountedAt = useRef(Date.now());

  const canSubmit =
    email.trim().length > 3 && password.length >= 6 && (mode === 'sign_in' || fullName.trim().length > 0);

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);

    if (mode === 'sign_in') {
      const message = await signIn(email.trim(), password);
      setSubmitting(false);
      if (message) {
        setError(friendlyErrorMessage(message));
        return;
      }
      if (router.canGoBack()) router.back();
      return;
    }

    if (website.trim().length > 0 || Date.now() - mountedAt.current < HONEYPOT_MIN_MS) {
      // Behave identically to a normal validation failure — don't tell an
      // automated client which check it tripped.
      setSubmitting(false);
      setError('Something went wrong. Please try again.');
      return;
    }

    const result = await signUp(email.trim(), password, fullName.trim());
    setSubmitting(false);
    if (result.error) {
      setError(friendlyErrorMessage(result.error));
      return;
    }
    if (result.needsEmailConfirmation) {
      setMode('sign_in');
      setNotice('Account created! Check your email and tap the confirmation link, then log in here.');
      return;
    }
    router.replace('/onboarding');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.brandRow}>
        <Logo size={56} showWordmark={false} />
      </View>

      <Text style={styles.title}>{mode === 'sign_in' ? 'Log in to Easyfen' : 'Create your account'}</Text>
      <Text style={styles.subtitle}>
        {mode === 'sign_in'
          ? 'Log in to save favorites, message agents, and post listings.'
          : 'Sign up to post listings, chat with agents, and save favorites.'}
      </Text>

      {mode === 'sign_up' && (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Aminata Kamara"
            placeholderTextColor={colors.textMuted}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        </View>
      )}
      {mode === 'sign_up' && (
        <TextInput
          style={styles.honeypot}
          value={website}
          onChangeText={setWebsite}
          placeholder="Website"
          tabIndex={-1}
          importantForAutofill="no"
          autoComplete="off"
        />
      )}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Min. 6 characters"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {notice && <Text style={styles.notice}>{notice}</Text>}

      <Pressable
        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        disabled={!canSubmit || submitting}
        onPress={handleSubmit}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>
            {mode === 'sign_in' ? 'Log In' : 'Sign Up'}
          </Text>
        )}
      </Pressable>

      <Pressable onPress={() => setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in')}>
        <Text style={styles.switchText}>
          {mode === 'sign_in' ? "Don't have an account? " : 'Already have an account? '}
          <Text style={styles.switchTextBold}>{mode === 'sign_in' ? 'Sign up' : 'Log in'}</Text>
        </Text>
      </Pressable>
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
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xl, textAlign: 'center' },
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
  honeypot: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    left: -9999,
  },
  error: { color: colors.danger, fontSize: fontSize.sm, marginBottom: spacing.md },
  notice: { color: colors.success, fontSize: fontSize.sm, marginBottom: spacing.md },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitButtonDisabled: { backgroundColor: colors.border },
  submitText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  submitTextDisabled: { color: colors.textMuted },
  switchText: { textAlign: 'center', color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.lg },
  switchTextBold: { color: colors.accent, fontWeight: fontWeight.semibold },
});
