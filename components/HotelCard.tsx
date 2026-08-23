import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Badge } from './Badge';
import { FavoriteButton } from './FavoriteButton';
import { NoPhotoPlaceholder } from './NoPhotoPlaceholder';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { formatPrice } from '../lib/format';
import type { Hotel } from '../lib/types';

export const HotelCard = memo(function HotelCard({ hotel }: { hotel: Hotel }) {
  return (
    <Pressable style={styles.card} onPress={() => router.push(`/hotel/${hotel.id}`)}>
      <View style={styles.imageWrap}>
        {hotel.photos[0] ? (
          <Image source={{ uri: hotel.photos[0] }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <NoPhotoPlaceholder />
          </View>
        )}

        <View style={styles.topRow}>
          <View style={styles.badgeRow}>
            <Badge label="HOTEL" variant="dark" />
            {hotel.is_premium && <Badge label="PREMIUM" variant="premium" />}
          </View>
          <FavoriteButton itemType="hotel" itemId={hotel.id} />
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.statPill}>
            <Ionicons name="eye-outline" size={12} color="#fff" />
            <Text style={styles.statText}>{hotel.view_count}</Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="camera-outline" size={12} color="#fff" />
            <Text style={styles.statText}>{hotel.photos.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
          {hotel.name}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          <Text style={styles.location} numberOfLines={1}>
            {hotel.location}
          </Text>
        </View>

        <View style={styles.footerRow}>
          <View>
            <Text style={styles.priceLabel}>PRICE</Text>
            <Text style={styles.price}>{formatPrice(hotel.rate, hotel.currency, hotel.rate_unit)}</Text>
          </View>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={colors.star} />
            <Text style={styles.ratingText}>
              {hotel.rating.toFixed(1)} ({hotel.rating_count})
            </Text>
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.sm,
  },
  priceLabel: { fontSize: 9, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.4 },
  price: { fontSize: fontSize.sm, fontWeight: '700', color: colors.accent },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '600' },
});
