import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { friendlyErrorMessage } from '../lib/errors';
import { appAlert } from '../lib/alert';
import { colors, fontSize, fontWeight, radius, spacing } from '../constants/theme';

const CONFIRM_WORD = 'DELETE';

const DELETED_ITEMS = [
  'Your profile, name, photo, and phone number',
  'All of your listings',
  'Your conversations and messages with other users',
  'Saved listings and saved searches',
  'Your Agent Subscription and Verified Agent status',
];

export default function DeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const { session, signOut } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_WORD && !deleting;

  async function handleDelete() {
    if (!session || !canDelete) return;
    setDeleting(true);
    const { error } = await supabase.rpc('delete_own_account');
    if (error) {
      setDeleting(false);
      appAlert('Could not delete account', friendlyErrorMessage(error));
      return;
    }
    await signOut();
    router.replace('/');
  }

  if (!session) {
    router.replace('/');
    return null;
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Delete Account</Text>
      </View>

      <View style={styles.warningIconWrap}>
        <Ionicons name="warning" size={32} color={colors.danger} />
      </View>

      <Text style={styles.warningTitle}>This can't be undone</Text>
      <Text style={styles.warningBody}>Deleting your account permanently removes:</Text>

      <View style={styles.list}>
        {DELETED_ITEMS.map((item) => (
          <View key={item} style={styles.listRow}>
            <Ionicons name="close-circle" size={16} color={colors.danger} />
            <Text style={styles.listText}>{item}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.note}>
        Payment records are kept for accounting purposes, with your personal information removed from them. This is
        separate from and unaffected by the rest of your data being deleted.
      </Text>

      <Text style={styles.confirmLabel}>
        Type <Text style={styles.confirmWord}>{CONFIRM_WORD}</Text> below to confirm
      </Text>
      <TextInput
        style={styles.input}
        value={confirmText}
        onChangeText={setConfirmText}
        placeholder={CONFIRM_WORD}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      <Pressable
        style={[styles.deleteButton, !canDelete && styles.deleteButtonDisabled]}
        disabled={!canDelete}
        onPress={handleDelete}
        accessibilityRole="button"
        accessibilityLabel="Permanently delete my account"
        accessibilityState={{ disabled: !canDelete }}
      >
        {deleting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.deleteButtonText}>Permanently Delete My Account</Text>
        )}
      </Pressable>

      <Pressable style={styles.cancelButton} onPress={() => router.back()}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  warningIconWrap: { alignItems: 'center', marginBottom: spacing.sm },
  warningTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, textAlign: 'center' },
  warningBody: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  list: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  listText: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary },
  note: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18, marginBottom: spacing.xl },
  confirmLabel: { fontSize: fontSize.sm, color: colors.textPrimary, marginBottom: spacing.sm },
  confirmWord: { fontWeight: fontWeight.bold, color: colors.danger },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  deleteButton: {
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  deleteButtonDisabled: { backgroundColor: colors.border },
  deleteButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold },
  cancelButton: { paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xs },
  cancelButtonText: { color: colors.textSecondary, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
