import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FavoriteButton } from './FavoriteButton';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { formatPrice, initialsFor } from '../lib/format';
import type { Service } from '../lib/types';

export const ServiceCard = memo(function ServiceCard({ service, onHire }: { service: Service; onHire: () => void }) {
  return (
    <Pressable style={styles.card} onPress={() => router.push(`/service/${service.id}`)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initialsFor(service.business_name)}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {service.business_name}
          </Text>
          <FavoriteButton itemType="service" itemId={service.id} />
        </View>
        <Text style={styles.category} numberOfLines={1}>
          {service.category}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons name="star" size={12} color={colors.star} />
          <Text style={styles.metaText}>
            {service.rating.toFixed(1)} ({service.rating_count})
          </Text>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} style={styles.metaIcon} />
          <Text style={styles.metaText} numberOfLines={1}>
            {service.location}
          </Text>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.rate}>{formatPrice(service.rate, service.currency, service.rate_unit)}</Text>
          <Pressable style={styles.hireButton} onPress={onHire}>
            <Text style={styles.hireButtonText}>Hire</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.lg, fontWeight: '700', color: colors.accent },
  body: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  category: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, gap: 3 },
  metaText: { fontSize: fontSize.xs, color: colors.textMuted },
  metaIcon: { marginLeft: spacing.sm },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  rate: { fontSize: fontSize.sm, fontWeight: '700', color: colors.accent },
  hireButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  hireButtonText: { color: '#fff', fontSize: fontSize.xs, fontWeight: '700' },
});
