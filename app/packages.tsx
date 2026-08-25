import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { requestAgentVerification } from '../lib/contact';
import { colors, fontSize, fontWeight, radius, spacing } from '../constants/theme';
import { CURRENCY_CODE, PAYMENT_PRODUCTS, type PaymentPurpose } from '../constants/payments';

// Fixed display order — cheapest single-item action first, then the
// account-wide subscription, then the one-time verification review.
const PRODUCT_ORDER: PaymentPurpose[] = ['listing_boost', 'agent_subscription', 'agent_verification'];

type LaunchMode = { active: boolean; note: string } | null;

export default function PackagesScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [launchMode, setLaunchMode] = useState<LaunchMode>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('launch_mode_active, launch_mode_note')
      .single();
    setLaunchMode(data ? { active: data.launch_mode_active, note: data.launch_mode_note } : { active: false, note: '' });
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Plans & Pricing</Text>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <>
          {launchMode?.active && launchMode.note ? (
            <View style={styles.launchBanner}>
              <Text style={styles.launchBannerText}>🎉 {launchMode.note}</Text>
            </View>
          ) : null}

          {PRODUCT_ORDER.map((key) => (
            <ProductCard key={key} purposeKey={key} free={!!launchMode?.active} fullName={profile?.full_name} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

function ProductCard({
  purposeKey,
  free,
  fullName,
}: {
  purposeKey: PaymentPurpose;
  free: boolean;
  fullName: string | null | undefined;
}) {
  const product = PAYMENT_PRODUCTS[purposeKey];

  function handlePress() {
    if (product.contactOnly) {
      requestAgentVerification(fullName);
      return;
    }
    if (purposeKey === 'listing_boost') {
      // A boost applies to one specific listing, so it can't be purchased
      // in the abstract from here — send the agent to pick which listing.
      router.push('/profile');
      return;
    }
    router.push(`/pay?purpose=${purposeKey}`);
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>{product.label}</Text>
        {free && !product.contactOnly ? (
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>FREE</Text>
          </View>
        ) : null}
      </View>
      {product.contactOnly ? (
        <View style={styles.priceRow}>
          <Text style={styles.priceAmount}>Contact for pricing</Text>
        </View>
      ) : (
        <View style={styles.priceRow}>
          {free && (
            <Text style={styles.priceStrikethrough}>
              {CURRENCY_CODE} {product.amount.toLocaleString('en-US')}
            </Text>
          )}
          <Text style={styles.priceAmount}>
            {free ? `${CURRENCY_CODE} 0` : `${CURRENCY_CODE} ${product.amount.toLocaleString('en-US')}`}
          </Text>
          <Text style={styles.priceDuration}>/ {product.durationLabel}</Text>
        </View>
      )}
      <Text style={styles.cardDescription}>{product.description}</Text>
      <Pressable style={styles.cardButton} onPress={handlePress}>
        <Text style={styles.cardButtonText}>
          {product.contactOnly
            ? 'Request Verification'
            : purposeKey === 'listing_boost'
              ? 'Choose a listing to boost'
              : free
                ? 'Claim for free'
                : 'Get started'}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.accent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  loadingState: { paddingTop: spacing.xxl, alignItems: 'center' },
  launchBanner: {
    backgroundColor: colors.goldSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  launchBannerText: { fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: fontWeight.semibold, lineHeight: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  freeBadge: { backgroundColor: colors.success, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  freeBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: '#fff', letterSpacing: 0.4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: spacing.sm },
  priceStrikethrough: { fontSize: fontSize.sm, color: colors.textMuted, textDecorationLine: 'line-through' },
  priceAmount: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.accent },
  priceDuration: { fontSize: fontSize.xs, color: colors.textMuted },
  cardDescription: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 20 },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  cardButtonText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.accent },
});
