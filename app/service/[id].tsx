import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { getOrCreateConversation } from '../../lib/conversations';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { FavoriteButton } from '../../components/FavoriteButton';
import { formatPrice, initialsFor } from '../../lib/format';
import type { Service } from '../../lib/types';

export default function ServiceDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    supabase
      .from('services')
      .select('*, owner:profiles(full_name, avatar_url, role)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!cancelled) {
          setService(data as Service | null);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleHire() {
    if (!service) return;
    if (!session) {
      router.push('/auth');
      return;
    }
    if (session.user.id === service.owner_id) {
      Alert.alert('This is your service', 'You cannot hire yourself.');
      return;
    }
    if (starting) return;
    setStarting(true);
    try {
      const conversationId = await getOrCreateConversation(session.user.id, service.owner_id, null);
      router.push(`/messages/${conversationId}`);
    } catch (err) {
      Alert.alert('Could not start conversation', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!service) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.notFound}>This service is no longer available.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 100 }}>
        <View style={styles.header}>
          <Pressable style={styles.roundButton} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </Pressable>
          <FavoriteButton itemType="service" itemId={service.id} />
        </View>

        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsFor(service.business_name)}</Text>
          </View>
          <View style={styles.heroTitleRow}>
            <Text style={styles.title}>{service.business_name}</Text>
            {service.is_verified && <Ionicons name="checkmark-circle" size={18} color={colors.online} />}
          </View>
          <Text style={styles.category}>{service.category}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="star" size={14} color={colors.star} />
            <Text style={styles.metaText}>
              {service.rating.toFixed(1)} ({service.rating_count})
            </Text>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} style={styles.metaGap} />
            <Text style={styles.metaText}>{service.location}</Text>
          </View>

          <Text style={styles.rate}>{formatPrice(service.rate, service.currency, service.rate_unit)}</Text>
        </View>

        <View style={styles.body}>
          {service.description && (
            <>
              <Text style={styles.sectionTitle}>About this service</Text>
              <Text style={styles.description}>{service.description}</Text>
            </>
          )}

          <Text style={styles.sectionTitle}>Provider</Text>
          <View style={styles.providerRow}>
            <View style={styles.providerAvatar}>
              <Text style={styles.providerAvatarText}>{initialsFor(service.owner?.full_name ?? null)}</Text>
            </View>
            <View style={styles.providerBody}>
              <Text style={styles.providerName}>{service.owner?.full_name ?? 'Easyfen User'}</Text>
              <Text style={styles.providerRole}>SERVICE PROVIDER</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable style={styles.hireButton} onPress={handleHire} disabled={starting}>
          {starting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="briefcase-outline" size={18} color="#fff" />
              <Text style={styles.hireButtonText}>Hire</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.sm },
  backLink: { fontSize: fontSize.md, color: colors.accent, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  roundButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  hero: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.accent },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
  category: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  metaGap: { marginLeft: spacing.md },
  metaText: { fontSize: fontSize.sm, color: colors.textSecondary },
  rate: { fontSize: fontSize.xl, fontWeight: '700', color: colors.accent, marginTop: spacing.md },
  body: { padding: spacing.lg },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm },
  description: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 21 },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  providerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerAvatarText: { fontSize: fontSize.md, fontWeight: '700', color: colors.accent },
  providerBody: { flex: 1 },
  providerName: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  providerRole: { fontSize: 10, fontWeight: '700', color: colors.accent, letterSpacing: 0.4 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  hireButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  hireButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
});
