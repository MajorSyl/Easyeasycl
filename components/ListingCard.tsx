import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Badge } from './Badge';
import { FavoriteButton } from './FavoriteButton';
import { NoPhotoPlaceholder } from './NoPhotoPlaceholder';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '../constants/theme';
import { categoryBadgeLabel, formatListingAge, formatPrice, initialsFor } from '../lib/format';
import type { Listing } from '../lib/types';

export const ListingCard = memo(function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/listing/${listing.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${formatPrice(listing.price, listing.currency, listing.price_unit)}, ${listing.location}`}
    >
      <View style={styles.imageWrap}>
        {listing.photos[0] ? (
          <Image
            source={{ uri: listing.photos[0] }}
            style={styles.image}
            contentFit="cover"
            accessible
            accessibilityLabel={`Photo of ${listing.title}`}
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <NoPhotoPlaceholder />
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
          <View style={styles.statPill} accessibilityLabel={`${listing.view_count} views`}>
            <Ionicons name="eye-outline" size={12} color="#fff" />
            <Text style={styles.statText}>{listing.view_count}</Text>
          </View>
          <View
            style={styles.statPill}
            accessibilityLabel={`${listing.photos.length} photo${listing.photos.length === 1 ? '' : 's'}`}
          >
            <Ionicons name="camera-outline" size={12} color="#fff" />
            <Text style={styles.statText}>{listing.photos.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.price}>{formatPrice(listing.price, listing.currency, listing.price_unit)}</Text>
        <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
          {listing.title}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          <Text style={styles.location} numberOfLines={1}>
            {listing.location}
          </Text>
        </View>

        <View style={styles.footerRow}>
          {listing.last_confirmed_at ? (
            <Text style={styles.age} numberOfLines={1}>
              {formatListingAge(listing.last_confirmed_at)}
            </Text>
          ) : (
            <View />
          )}
          <Pressable
            style={styles.agentRow}
            onPress={() => router.push(`/user/${listing.owner_id}`)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`View ${listing.owner?.full_name ?? 'agent'}'s profile`}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsFor(listing.owner?.full_name ?? null)}</Text>
            </View>
            <Text style={styles.agentName} numberOfLines={1}>
              {listing.owner?.full_name ?? 'Unknown'}
            </Text>
          </Pressable>
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
    ...shadow.card,
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
  statText: { color: '#fff', fontSize: 10, fontWeight: fontWeight.semibold },
  body: { padding: spacing.md },
  price: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.accent },
  title: {
    fontSize: fontSize.sm,
    lineHeight: 18,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  location: { fontSize: fontSize.xs, color: colors.textMuted, flexShrink: 1 },
  age: { fontSize: fontSize.xs, color: colors.textMuted, flexShrink: 1 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  agentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, marginVertical: -6 },
  agentName: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.textSecondary, maxWidth: 70 },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.accent },
});
