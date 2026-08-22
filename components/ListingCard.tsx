import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Badge } from './Badge';
import { FavoriteButton } from './FavoriteButton';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { categoryBadgeLabel, formatListingAge, formatPrice, initialsFor } from '../lib/format';
import type { Listing } from '../lib/types';

export const ListingCard = memo(function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Pressable style={styles.card} onPress={() => router.push(`/listing/${listing.id}`)}>
      <View style={styles.imageWrap}>
        {listing.photos[0] ? (
          <Image source={{ uri: listing.photos[0] }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="image-outline" size={28} color={colors.textMuted} />
          </View>
        )}

        <View style={styles.topRow}>
          <View style={styles.badgeRow}>
            <Badge label={categoryBadgeLabel(listing.category)} variant="dark" />
            {listing.is_premium && <Badge label="PREMIUM" variant="premium" />}
          </View>
          <FavoriteButton itemType="listing" itemId={listing.id} />
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.statPill}>
            <Ionicons name="eye-outline" size={12} color="#fff" />
            <Text style={styles.statText}>{listing.view_count}</Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="camera-outline" size={12} color="#fff" />
            <Text style={styles.statText}>{listing.photos.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {listing.title}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          <Text style={styles.location} numberOfLines={1}>
            {listing.location}
          </Text>
        </View>
        {listing.last_confirmed_at && (
          <Text style={styles.age} numberOfLines={1}>
            {formatListingAge(listing.last_confirmed_at)}
          </Text>
        )}

        <View style={styles.footerRow}>
          <View>
            <Text style={styles.priceLabel}>PRICE</Text>
            <Text style={styles.price}>{formatPrice(listing.price, listing.currency, listing.price_unit)}</Text>
          </View>
          <View style={styles.agent}>
            <Text style={styles.agentLabel}>AGENT</Text>
            <View style={styles.agentRow}>
              <Text style={styles.agentName} numberOfLines={1}>
                {listing.owner?.full_name ?? 'Unknown'}
              </Text>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initialsFor(listing.owner?.full_name ?? null)}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  imageWrap: { aspectRatio: 1.3, backgroundColor: colors.border },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  topRow: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeRow: { flexDirection: 'row', gap: 6 },
  bottomRow: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    gap: 6,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  body: { padding: spacing.md },
  title: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  location: { fontSize: fontSize.xs, color: colors.textMuted, flexShrink: 1 },
  age: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.sm,
  },
  priceLabel: { fontSize: 9, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.4 },
  price: { fontSize: fontSize.sm, fontWeight: '700', color: colors.accent },
  agent: { alignItems: 'flex-end', maxWidth: 90 },
  agentLabel: { fontSize: 9, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.4 },
  agentRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  agentName: { fontSize: 10, color: colors.textSecondary, maxWidth: 60 },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 10, fontWeight: '700', color: colors.accent },
});
