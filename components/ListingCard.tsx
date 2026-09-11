import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Badge } from './Badge';
import { FavoriteButton } from './FavoriteButton';
import { NoPhotoPlaceholder } from './NoPhotoPlaceholder';
import { LazyPhoto } from './LazyPhoto';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { type } from '../constants/typography';
import { daysSince, formatPrice } from '../lib/format';
import type { Listing } from '../lib/types';

const NEW_WITHIN_DAYS = 7;

// The one card design used everywhere a listing appears -- horizontal
// "New Listings"/"Recommended" rows, the Search results list, neighborhood
// grids, favorites, an agent's profile. Airbnb's listing-card pattern:
// a full-bleed rounded photo (no card border/shadow around the whole
// thing -- the image itself is the only "chrome"), a heart overlaid
// top-right, one status badge top-left, then price -> title -> location
// stacked below directly on the page background. Our blue stands in for
// Airbnb's pink/red on the badge and the favorited heart; everything else
// (spacing, corner radius, hierarchy) mirrors it closely.
export const ListingCard = memo(function ListingCard({ listing }: { listing: Listing }) {
  const badge = listing.is_premium
    ? { label: 'Featured', variant: 'premium' as const }
    : listing.is_verified
      ? { label: 'Verified', variant: 'brand' as const }
      : daysSince(listing.created_at) <= NEW_WITHIN_DAYS
        ? { label: 'New', variant: 'brand' as const }
        : null;

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
            <NoPhotoPlaceholder />
          </View>
        )}

        {badge && (
          <View style={styles.badgeSlot}>
            <Badge label={badge.label} variant={badge.variant} />
          </View>
        )}
        <View style={styles.favoriteSlot}>
          <FavoriteButton itemType="listing" itemId={listing.id} />
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.price}>{formatPrice(listing.price, listing.currency, listing.price_unit)}</Text>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {listing.title}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          <Text style={styles.location} numberOfLines={1}>
            {listing.location}
          </Text>
        </View>

        {/* Omitted entirely (not a "0 views" placeholder) until a listing
            actually has views -- an empty stats row reads worse than no
            row at all. */}
        {listing.view_count > 0 && (
          <View style={styles.statsRow}>
            <Ionicons name="eye-outline" size={12} color={colors.textMuted} />
            <Text style={styles.statsText}>{listing.view_count.toLocaleString()} views</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { flex: 1 },
  imageWrap: {
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  badgeSlot: { position: 'absolute', top: spacing.sm, left: spacing.sm },
  favoriteSlot: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  body: { paddingTop: spacing.sm },
  // Plain dark ink, not colors.accent -- Airbnb's price is the boldest
  // thing on the card by weight/size alone, not by color; blue stays
  // reserved for the badge, the heart, and actionable elements.
  price: { ...type.priceMedium, color: colors.textPrimary },
  // Regular weight, secondary ink -- deliberately quieter than the price
  // above it, matching Airbnb's hierarchy (bold price, plain title line).
  title: { ...type.body, fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  location: { ...type.secondary, fontSize: fontSize.xs, color: colors.textMuted, flexShrink: 1 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  statsText: { ...type.secondary, fontSize: fontSize.xs, color: colors.textMuted },
});
