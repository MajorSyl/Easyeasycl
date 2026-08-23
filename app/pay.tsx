import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { friendlyErrorMessage } from '../lib/errors';
import { colors, fontSize, fontWeight, radius, spacing } from '../constants/theme';
import {
  MOBILE_MONEY_RECEIVING,
  PAYMENT_PRODUCTS,
  type MobileMoneyProvider,
  type PaymentPurpose,
} from '../constants/payments';

type ExistingStatus =
  | { kind: 'none' }
  | { kind: 'pending' }
  | { kind: 'active'; until: string | null };

export default function PayScreen() {
  const insets = useSafeAreaInsets();
  const { session, profile, refreshProfile } = useAuth();
  const params = useLocalSearchParams<{ purpose: string; listingId?: string }>();
  const purpose = params.purpose as PaymentPurpose;
  const listingId = params.listingId ?? null;

  const [provider, setProvider] = useState<MobileMoneyProvider>('orange_money');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existing, setExisting] = useState<ExistingStatus>({ kind: 'none' });

  const product = PAYMENT_PRODUCTS[purpose];

  const checkExisting = useCallback(async () => {
    if (!session || !product) {
      setChecking(false);
      return;
    }
    setChecking(true);

    if (purpose === 'listing_boost' && listingId) {
      const { data: boost } = await supabase
        .from('listing_boosts')
        .select('ends_at')
        .eq('listing_id', listingId)
        .gt('ends_at', new Date().toISOString())
        .maybeSingle();
      if (boost) {
        setExisting({ kind: 'active', until: boost.ends_at });
        setChecking(false);
        return;
      }
      const { data: pending } = await supabase
        .from('payments')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('purpose', 'listing_boost')
        .eq('related_listing_id', listingId)
        .eq('status', 'pending')
        .maybeSingle();
      setExisting(pending ? { kind: 'pending' } : { kind: 'none' });
    } else if (purpose === 'agent_subscription') {
      const { data: sub } = await supabase
        .from('agent_subscriptions')
        .select('ends_at')
        .eq('user_id', session.user.id)
        .gt('ends_at', new Date().toISOString())
        .maybeSingle();
      if (sub) {
        setExisting({ kind: 'active', until: sub.ends_at });
        setChecking(false);
        return;
      }
      const { data: pending } = await supabase
        .from('payments')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('purpose', 'agent_subscription')
        .eq('status', 'pending')
        .maybeSingle();
      setExisting(pending ? { kind: 'pending' } : { kind: 'none' });
    } else if (purpose === 'agent_verification') {
      if (profile?.verification_tier === 'agent_verified' || profile?.verification_tier === 'id_verified') {
        setExisting({ kind: 'active', until: null });
        setChecking(false);
        return;
      }
      const { data: pending } = await supabase
        .from('payments')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('purpose', 'agent_verification')
        .eq('status', 'pending')
        .maybeSingle();
      setExisting(pending ? { kind: 'pending' } : { kind: 'none' });
    }
    setChecking(false);
  }, [session, purpose, listingId, product, profile?.verification_tier]);

  useFocusEffect(
    useCallback(() => {
      checkExisting();
    }, [checkExisting])
  );

  async function handleSubmit() {
    if (!session || !product || submitting) return;
    if (!reference.trim()) {
      Alert.alert('Enter the reference code', 'You should have received this by SMS after sending the payment.');
      return;
    }
    if (purpose === 'listing_boost' && !listingId) return;

    setSubmitting(true);
    const { error } = await supabase.from('payments').insert({
      user_id: session.user.id,
      purpose,
      related_listing_id: purpose === 'listing_boost' ? listingId : null,
      amount: product.amount,
      momo_provider: provider,
      momo_reference: reference.trim(),
    });
    setSubmitting(false);

    if (error) {
      Alert.alert('Could not submit', friendlyErrorMessage(error));
      return;
    }

    setReference('');
    setExisting({ kind: 'pending' });
    await refreshProfile();
    Alert.alert(
      'Submitted for review',
      "We'll verify the payment and activate it shortly. You can check back here for the status."
    );
  }

  if (!session) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.loggedOutTitle}>Log in to continue</Text>
        <Pressable style={styles.loginButton} onPress={() => router.push('/auth')}>
          <Text style={styles.loginButtonText}>Log In / Sign Up</Text>
        </Pressable>
      </View>
    );
  }

  if (!product || (purpose === 'listing_boost' && !listingId)) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.loggedOutTitle}>Not available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{product.label}</Text>
      </View>

      {checking ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : existing.kind === 'active' ? (
        <View style={styles.statusCard}>
          <Ionicons name="checkmark-circle" size={32} color={colors.success} />
          <Text style={styles.statusTitle}>Already active</Text>
          <Text style={styles.statusText}>
            {existing.until
              ? `Active until ${new Date(existing.until).toLocaleDateString('en-GB')}.`
              : 'Your account already has this.'}
          </Text>
        </View>
      ) : existing.kind === 'pending' ? (
        <View style={styles.statusCard}>
          <Ionicons name="time-outline" size={32} color={colors.gold} />
          <Text style={styles.statusTitle}>Pending review</Text>
          <Text style={styles.statusText}>
            We've received your submission and will confirm the payment shortly.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.priceCard}>
            <Text style={styles.priceAmount}>NLE {product.amount.toLocaleString('en-US')}</Text>
            <Text style={styles.priceDuration}>{product.durationLabel}</Text>
            <Text style={styles.priceDescription}>{product.description}</Text>
          </View>

          <Text style={styles.sectionTitle}>1. Send payment</Text>
          <View style={styles.providerRow}>
            {(Object.keys(MOBILE_MONEY_RECEIVING) as MobileMoneyProvider[]).map((key) => (
              <Pressable
                key={key}
                style={[styles.providerPill, provider === key && styles.providerPillActive]}
                onPress={() => setProvider(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: provider === key }}
              >
                {/* Matches FilterPills' active pattern: fill + checkmark + bold,
                    so selection is never signaled by color alone. */}
                {provider === key && <Ionicons name="checkmark" size={14} color="#fff" style={styles.providerPillCheck} />}
                <Text style={[styles.providerPillText, provider === key && styles.providerPillTextActive]}>
                  {MOBILE_MONEY_RECEIVING[key].label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.receivingCard}>
            <Text style={styles.receivingLabel}>Send NLE {product.amount.toLocaleString('en-US')} to</Text>
            <Text style={styles.receivingNumber}>{MOBILE_MONEY_RECEIVING[provider].number}</Text>
            <Text style={styles.receivingName}>{MOBILE_MONEY_RECEIVING[provider].accountName}</Text>
          </View>

          <Text style={styles.sectionTitle}>2. Enter the reference code</Text>
          <Text style={styles.helperText}>You'll receive this by SMS after the payment goes through.</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. OM123456"
            placeholderTextColor={colors.textMuted}
            value={reference}
            onChangeText={setReference}
            autoCapitalize="characters"
          />

          <Pressable
            style={[styles.submitButton, !reference.trim() && styles.submitButtonDisabled]}
            disabled={!reference.trim() || submitting}
            onPress={handleSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={[styles.submitButtonText, !reference.trim() && styles.submitButtonTextDisabled]}
              >
                Submit for Review
              </Text>
            )}
          </Pressable>
          <Text style={styles.disclaimer}>
            An admin verifies each payment manually before it activates. If your payment can't be verified, contact
            support for a refund.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  loggedOutTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.lg },
  loginButton: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  loginButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  statusCard: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  statusTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
  statusText: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center' },
  priceCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  priceAmount: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.accent },
  priceDuration: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 2 },
  priceDescription: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 20 },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.sm },
  providerRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  providerPill: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  providerPillActive: { backgroundColor: colors.accent, borderColor: colors.accent, flexDirection: 'row', justifyContent: 'center' },
  providerPillCheck: { marginRight: 4 },
  providerPillText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary },
  providerPillTextActive: { color: '#fff', fontWeight: fontWeight.bold },
  receivingCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  receivingLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  receivingNumber: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.accent, marginTop: 4 },
  receivingName: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  helperText: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.sm },
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
  submitButton: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  submitButtonDisabled: { backgroundColor: colors.border },
  submitButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold },
  submitButtonTextDisabled: { color: colors.textMuted },
  disclaimer: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md, lineHeight: 18 },
});
