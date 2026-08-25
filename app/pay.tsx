import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { friendlyErrorMessage } from '../lib/errors';
import { appAlert } from '../lib/alert';
import { uploadPaymentScreenshot } from '../lib/upload';
import { colors, fontSize, fontWeight, radius, spacing } from '../constants/theme';
import {
  CURRENCY_CODE,
  MOBILE_MONEY_RECEIVING,
  PAYMENT_PRODUCTS,
  isContactOnly,
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
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existing, setExisting] = useState<ExistingStatus>({ kind: 'none' });
  const [launchModeActive, setLaunchModeActive] = useState(false);
  const [claimingFree, setClaimingFree] = useState(false);

  const product = PAYMENT_PRODUCTS[purpose];
  const contactOnly = isContactOnly(purpose, profile?.role);
  // Same underlying purpose (agent_subscription), different framing when an
  // Agency account is the one looking at it -- agent_verification's
  // contact-only flow keeps its existing copy.
  const isAgencyContact = purpose === 'agent_subscription' && contactOnly;
  const contactCopy = isAgencyContact
    ? {
        priceLabel: 'Contact us for agency pricing',
        sectionTitle: 'Tell us about your agency',
        helperText:
          "Tell us roughly how many properties or agents you're managing — an admin will follow up with agency pricing and next steps.",
        buttonLabel: 'Request Agency Quote',
        pendingText: 'Your request has been submitted — an admin will follow up with agency pricing.',
        confirmationTitle: 'Request submitted',
        confirmationBody: 'Your request has been submitted — an admin will follow up with agency pricing.',
        notePlaceholder: "e.g. We manage 12 rental properties across Freetown with a team of 4 agents...",
      }
    : {
        priceLabel: 'Contact admin for pricing',
        sectionTitle: 'Tell us about yourself',
        helperText:
          "Optional — a bit about your business or how long you've been operating helps the admin review your " +
          'request. Once approved, an admin will contact you separately to collect the fee before verification is ' +
          'granted.',
        buttonLabel: 'Request Verification',
        pendingText: 'Your request has been submitted — an admin will review and contact you.',
        confirmationTitle: 'Request submitted',
        confirmationBody: 'Your request has been submitted — an admin will review and contact you.',
        notePlaceholder: "e.g. I've been renting out properties in Freetown for 3 years...",
      };

  const loadLaunchMode = useCallback(async () => {
    const { data } = await supabase.from('app_settings').select('launch_mode_active').single();
    setLaunchModeActive(data?.launch_mode_active ?? false);
  }, []);

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
      loadLaunchMode();
    }, [checkExisting, loadLaunchMode])
  );

  async function pickScreenshot() {
    if (!session) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      appAlert('Photo access needed', 'Please allow photo library access to attach a payment screenshot.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    setUploadingScreenshot(true);
    try {
      const url = await uploadPaymentScreenshot(result.assets[0].uri, session.user.id);
      setScreenshotUrl(url);
    } catch (err) {
      appAlert('Could not upload screenshot', friendlyErrorMessage(err));
    } finally {
      setUploadingScreenshot(false);
    }
  }

  async function handleSubmit() {
    if (!session || !product || submitting) return;
    if (!reference.trim()) {
      appAlert('Enter the reference code', 'You should have received this by SMS after sending the payment.');
      return;
    }
    if (!screenshotUrl) {
      appAlert('Attach a screenshot', 'Upload a screenshot of the payment confirmation before submitting.');
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
      screenshot_url: screenshotUrl,
    });
    setSubmitting(false);

    if (error) {
      appAlert('Could not submit', friendlyErrorMessage(error));
      return;
    }

    setReference('');
    setScreenshotUrl(null);
    setExisting({ kind: 'pending' });
    await refreshProfile();
    appAlert(
      'Submitted for review',
      "We'll verify the payment and activate it shortly. You can check back here for the status."
    );
  }

  async function handleContactRequest() {
    if (!session || !product || submitting) return;

    setSubmitting(true);
    const { error } = await supabase.from('payments').insert({
      user_id: session.user.id,
      purpose,
      amount: product.amount,
      notes: note.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      appAlert('Could not submit', friendlyErrorMessage(error));
      return;
    }

    setNote('');
    setExisting({ kind: 'pending' });
    appAlert(contactCopy.confirmationTitle, contactCopy.confirmationBody);
  }

  async function handleClaimFree() {
    if (!session || !product || claimingFree) return;
    if (purpose === 'listing_boost' && !listingId) return;

    setClaimingFree(true);
    const { error } = await supabase.rpc('claim_launch_promo', {
      p_purpose: purpose,
      p_listing_id: purpose === 'listing_boost' ? listingId : null,
    });
    setClaimingFree(false);

    if (error) {
      appAlert('Could not activate', friendlyErrorMessage(error));
      // The launch offer may have just ended, or this got claimed from
      // another tab/device — re-check so the screen reflects reality
      // instead of staying stuck on a stale "free" state.
      await checkExisting();
      await loadLaunchMode();
      return;
    }

    await refreshProfile();
    await checkExisting();
    appAlert('Activated!', "This is now active on your account — no payment needed during the launch period.");
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
          <Text style={styles.statusText}>{contactOnly ? contactCopy.pendingText : "We've received your submission and will confirm the payment shortly."}</Text>
        </View>
      ) : contactOnly ? (
        <>
          <View style={styles.priceCard}>
            <Text style={styles.priceAmount}>{contactCopy.priceLabel}</Text>
            <Text style={styles.priceDuration}>{product.durationLabel}</Text>
            <Text style={styles.priceDescription}>{product.description}</Text>
          </View>

          <Text style={styles.sectionTitle}>{contactCopy.sectionTitle}</Text>
          <Text style={styles.helperText}>{contactCopy.helperText}</Text>
          <TextInput
            style={[styles.input, styles.noteInput]}
            placeholder={contactCopy.notePlaceholder}
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
          />

          <Pressable style={styles.submitButton} disabled={submitting} onPress={handleContactRequest}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>{contactCopy.buttonLabel}</Text>}
          </Pressable>
          <Text style={styles.disclaimer}>
            An admin reviews requests manually — this is not an automated payment. You won't be charged anything by
            submitting this request.
          </Text>
        </>
      ) : launchModeActive ? (
        <>
          <View style={styles.priceCard}>
            <View style={styles.freeLaunchBadge}>
              <Text style={styles.freeLaunchBadgeText}>FREE DURING LAUNCH</Text>
            </View>
            <Text style={styles.priceStrikethrough}>
              {CURRENCY_CODE} {product.amount.toLocaleString('en-US')}
            </Text>
            <Text style={styles.priceAmount}>{CURRENCY_CODE} 0</Text>
            <Text style={styles.priceDuration}>{product.durationLabel}</Text>
            <Text style={styles.priceDescription}>{product.description}</Text>
          </View>

          <Text style={styles.helperText}>
            No mobile money payment needed right now — this purchase is free while launch mode is on. A record
            is still kept so nothing changes for you once real pricing starts.
          </Text>

          <Pressable style={styles.submitButton} disabled={claimingFree} onPress={handleClaimFree}>
            {claimingFree ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Claim for Free</Text>
            )}
          </Pressable>
        </>
      ) : (
        <>
          <View style={styles.priceCard}>
            <Text style={styles.priceAmount}>
              {CURRENCY_CODE} {product.amount.toLocaleString('en-US')}
            </Text>
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
            <Text style={styles.receivingLabel}>
              Send {CURRENCY_CODE} {product.amount.toLocaleString('en-US')} to
            </Text>
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

          <Text style={styles.sectionTitle}>3. Upload payment screenshot</Text>
          <Text style={styles.helperText}>A screenshot of the payment confirmation from your mobile money app.</Text>
          <Pressable
            style={styles.screenshotBox}
            onPress={pickScreenshot}
            disabled={uploadingScreenshot}
            accessibilityRole="button"
            accessibilityLabel={screenshotUrl ? 'Change payment screenshot' : 'Upload payment screenshot'}
          >
            {uploadingScreenshot ? (
              <ActivityIndicator color={colors.accent} />
            ) : screenshotUrl ? (
              <>
                <Image source={{ uri: screenshotUrl }} style={styles.screenshotThumb} contentFit="cover" />
                <View style={styles.screenshotOverlay}>
                  <Ionicons name="camera-outline" size={16} color="#fff" />
                  <Text style={styles.screenshotOverlayText}>Change</Text>
                </View>
              </>
            ) : (
              <>
                <Ionicons name="image-outline" size={26} color={colors.textMuted} />
                <Text style={styles.screenshotBoxText}>Tap to upload screenshot</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.submitButton, (!reference.trim() || !screenshotUrl) && styles.submitButtonDisabled]}
            disabled={!reference.trim() || !screenshotUrl || submitting}
            onPress={handleSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={[styles.submitButtonText, (!reference.trim() || !screenshotUrl) && styles.submitButtonTextDisabled]}
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
  priceStrikethrough: { fontSize: fontSize.sm, color: colors.textMuted, textDecorationLine: 'line-through', marginTop: 2 },
  freeLaunchBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.success,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: spacing.sm,
  },
  freeLaunchBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: '#fff', letterSpacing: 0.4 },
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
  noteInput: { minHeight: 100, textAlignVertical: 'top' },
  screenshotBox: {
    height: 140,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  screenshotBoxText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.semibold },
  screenshotThumb: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  screenshotOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  screenshotOverlayText: { color: '#fff', fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  submitButton: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  submitButtonDisabled: { backgroundColor: colors.border },
  submitButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold },
  submitButtonTextDisabled: { color: colors.textMuted },
  disclaimer: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md, lineHeight: 18 },
});
