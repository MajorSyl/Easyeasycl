import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Badge } from './Badge';
import { FavoriteButton } from './FavoriteButton';
import { NoPhotoPlaceholder } from './NoPhotoPlaceholder';
import { LazyPhoto } from './LazyPhoto';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '../constants/theme';
import { categoryBadgeLabel, formatListingAge, formatPrice } from '../lib/format';
import type { Listing } from '../lib/types';

// Wide horizontal card (image left, details right) used for the
// "Recommended" vertical list — distinct from ListingCard's square grid
// layout, which stays as-is everywhere it's already used.
export const PropertyCard = memo(function PropertyCard({ listing }: { listing: Listing }) {
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/listing/${listing.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${formatPrice(listing.price, listing.currency, listing.price_unit)}, ${listing.location}`}
    >
      <View style={styles.imageWrap}>
        {listing.photos[0] ? (
          <LazyPhoto
            uri={listing.photos[0]}
            style={styles.image}
            contentFit="cover"
            accessibilityLabel={`Photo of ${listing.title}`}
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <NoPhotoPlaceholder compact />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.badgeRow}>
          <Badge label={categoryBadgeLabel(listing.category)} variant="dark" />
          {listing.is_premium && <Badge label="PREMIUM" variant="premium" />}
        </View>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {listing.title}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          <Text style={styles.location} numberOfLines={1}>
            {listing.location}
          </Text>
        </View>
        <View style={styles.footerRow}>
          <Text style={styles.price} numberOfLines={1}>
            {formatPrice(listing.price, listing.currency, listing.price_unit)}
          </Text>
          {listing.last_confirmed_at && (
            <Text style={styles.age} numberOfLines={1}>
              {formatListingAge(listing.last_confirmed_at)}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.favoriteWrap}>
        <FavoriteButton itemType="listing" itemId={listing.id} />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadow.card,
  },
  imageWrap: { width: 110, backgroundColor: colors.border },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, padding: spacing.md, justifyContent: 'center', gap: 4 },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  title: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  location: { fontSize: fontSize.xs, color: colors.textMuted, flexShrink: 1 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  price: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.accent },
  age: { fontSize: 10, color: colors.textMuted },
  favoriteWrap: { position: 'absolute', top: spacing.sm, right: spacing.sm },
});
