import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
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
import { friendlyErrorMessage } from '../../lib/errors';
import { useAuth } from '../../lib/auth-context';
import { appAlert } from '../../lib/alert';
import { shareText } from '../../lib/share';
import { useBottomGap } from '../../lib/use-bottom-gap';
import { getOrCreateConversation } from '../../lib/conversations';
import { colors, fontSize, radius, shadow, spacing } from '../../constants/theme';
import { fontFamily, type } from '../../constants/typography';
import { FavoriteButton } from '../../components/FavoriteButton';
import { NoPhotoPlaceholder } from '../../components/NoPhotoPlaceholder';
import { LazyPhoto } from '../../components/LazyPhoto';
import {
  agentTenureLabel,
  categoryLabel,
  formatListingAge,
  formatListingPlace,
  formatPrice,
  initialsFor,
  roleLabel,
  verificationBadgeLabel,
} from '../../lib/format';
import type { Listing, RateUnit } from '../../lib/types';

const windowWidth = Dimensions.get('window').width;
// Edge-to-edge, not the old margined/rounded hero card -- Airbnb's detail
// carousel runs the full width of the screen, with the content below it
// overlapping it in a rounded-top sheet (see `sheet` below).
const heroHeight = windowWidth * 0.85;

const priceUnitLabel: Record<Exclude<RateUnit, null>, string> = {
  hour: 'per hour',
  day: 'per day',
  month: 'per month',
  night: 'per night',
};

export default function ListingDetailScreen() {
  const insets = useSafeAreaInsets();
  const bottomGap = useBottomGap();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [starting, setStarting] = useState(false);
  const viewCounted = useRef(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    supabase
      .from('listings')
      .select('*, owner:profiles(full_name, avatar_url, role, created_at, verification_tier)')
      .eq('id', id)
      .eq('is_active', true)
      .single()
      .then(({ data }) => {
        if (!cancelled) {
          setListing(data as Listing | null);
          setLoading(false);
        }
      });
    if (!viewCounted.current) {
      viewCounted.current = true;
      supabase.rpc('increment_listing_views', { listing_id: id }).then();
    }
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleShare() {
    if (!listing) return;
    await shareText(
      `${listing.title}\n${formatPrice(listing.price, listing.currency, listing.price_unit)} · ${formatListingPlace(listing)}\n\nFound on Easyfen`
    );
  }

  async function submitReport(reason: string) {
    if (!listing || !session) return;
    const { error } = await supabase
      .from('reports')
      .insert({ reporter_id: session.user.id, item_type: 'listing', item_id: listing.id, reason });
    if (error) {
      appAlert('Could not submit report', friendlyErrorMessage(error));
      return;
    }
    appAlert('Listing reported', 'This listing has been suspended pending review. Thank you for the report.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  function handleReport() {
    if (!listing) return;
    if (!session) {
      router.push('/auth');
      return;
    }
    if (session.user.id === listing.owner_id) return;
    appAlert('Report this listing', 'Why are you reporting this listing?', [
      { text: 'Spam or scam', onPress: () => submitReport('Spam or scam') },
      { text: 'Misleading information', onPress: () => submitReport('Misleading information') },
      { text: 'Inappropriate content', onPress: () => submitReport('Inappropriate content') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function messageAgent() {
    if (!listing) return;
    if (!session) {
      router.push('/auth');
      return;
    }
    if (session.user.id === listing.owner_id) {
      appAlert('This is your listing', 'You cannot message yourself.');
      return;
    }
    if (starting) return;
    setStarting(true);
    try {
      const conversationId = await getOrCreateConversation(session.user.id, listing.owner_id, listing.id);
      router.push(`/messages/${conversationId}`);
    } catch (err) {
      appAlert('Could not start conversation', friendlyErrorMessage(err));
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

  if (!listing) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top, gap: spacing.sm }]}>
        <Ionicons name="home-outline" size={36} color={colors.textMuted} />
        <Text style={styles.notFound}>This listing is no longer available.</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const verifiedLabel = verificationBadgeLabel(listing.owner?.verification_tier, listing.owner?.role);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.heroWrap}>
          {listing.photos.length > 0 ? (
            <FlatList
              data={listing.photos}
              keyExtractor={(url) => url}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) =>
                setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / windowWidth))
              }
              renderItem={({ item, index }) => (
                <LazyPhoto
                  uri={item}
                  style={styles.photo}
                  contentFit="cover"
                  accessibilityLabel={`Photo ${index + 1} of ${listing.photos.length} of ${listing.title}`}
                />
              )}
            />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <NoPhotoPlaceholder />
            </View>
          )}

          {listing.photos.length > 1 && (
            <View style={styles.pageIndicator}>
              <Text style={styles.pageIndicatorText}>
                {photoIndex + 1}/{listing.photos.length}
              </Text>
            </View>
          )}

          <View style={[styles.photoTopBar, { paddingTop: insets.top + spacing.xs }]}>
            <Pressable
              style={styles.roundButton}
              onPress={() => router.back()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </Pressable>
            <View style={styles.topBarRight}>
              <Pressable
                style={styles.roundButton}
                onPress={handleShare}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Share this listing"
              >
                <Ionicons name="share-outline" size={18} color={colors.textPrimary} />
              </Pressable>
              <View style={styles.roundButton}>
                <FavoriteButton itemType="listing" itemId={listing.id} />
              </View>
            </View>
          </View>
        </View>

        {/* Rounded-top sheet overlapping the photo, like an Airbnb listing
            page's content card floating over its hero image. */}
        <View style={styles.sheet}>
          {(listing.is_premium || listing.is_verified) && (
            <View style={styles.badgeRow}>
              {listing.is_premium && (
                <View style={styles.premiumChip}>
                  <Ionicons name="star" size={11} color={colors.premiumText} />
                  <Text style={styles.premiumChipText}>Featured</Text>
                </View>
              )}
              {listing.is_verified && (
                <View style={styles.verifiedRow}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
          )}

          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.summaryLine}>
            {categoryLabel(listing.category)} · {formatListingPlace(listing)}
          </Text>
          {listing.bedrooms != null && (
            <Text style={styles.statsLine}>
              {listing.bedrooms} Bedroom{listing.bedrooms === 1 ? '' : 's'}
            </Text>
          )}
          {listing.last_confirmed_at && (
            <Text style={styles.listingAge}>{formatListingAge(listing.last_confirmed_at)}</Text>
          )}
          {/* Understated, not the visual focus -- a small trust signal near
              the other stats, not a headline number. Omitted entirely (not
              a "0 people viewed" placeholder) when there's nothing to show. */}
          {listing.view_count > 0 && (
            <View style={styles.viewCountRow}>
              <Ionicons name="eye-outline" size={13} color={colors.textMuted} />
              <Text style={styles.viewCountText}>
                {listing.view_count.toLocaleString()} {listing.view_count === 1 ? 'person' : 'people'} viewed this
                property
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <Pressable style={styles.agentRow} onPress={() => router.push(`/user/${listing.owner_id}`)}>
            <View style={styles.agentAvatar}>
              <Text style={styles.agentAvatarText}>{initialsFor(listing.owner?.full_name ?? null)}</Text>
            </View>
            <View style={styles.agentBody}>
              <Text style={styles.agentName}>{listing.owner?.full_name ?? 'Easyfen User'}</Text>
              <View style={styles.agentMetaRow}>
                {roleLabel(listing.owner?.role) && <Text style={styles.agentRole}>{roleLabel(listing.owner?.role)}</Text>}
                {verifiedLabel && (
                  <View style={styles.agentVerifiedRow}>
                    <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                    <Text style={styles.agentVerifiedText}>{verifiedLabel}</Text>
                  </View>
                )}
              </View>
              {listing.owner?.created_at && (
                <Text style={styles.agentTenure}>{agentTenureLabel(listing.owner.created_at)}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          {listing.description && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>About this property</Text>
              <Text style={styles.description}>{listing.description}</Text>
            </>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.locationCard}>
            <View style={styles.locationIcon}>
              <Ionicons name="location" size={16} color={colors.accent} />
            </View>
            <Text style={styles.locationCardText}>
              {formatListingPlace(listing)}
            </Text>
          </View>

          {session?.user.id !== listing.owner_id && (
            <Pressable onPress={handleReport} hitSlop={8} style={styles.reportLink}>
              <Text style={styles.reportLinkText}>Report this listing</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomGap + spacing.md }]}>
        <View style={styles.footerPrice}>
          <Text style={styles.footerPriceAmount} numberOfLines={1}>
            {formatPrice(listing.price, listing.currency, null)}
          </Text>
          <Text style={styles.footerPriceUnit} numberOfLines={1}>
            {listing.price_note || (listing.price_unit ? priceUnitLabel[listing.price_unit] : 'Asking price')}
          </Text>
        </View>
        <Pressable style={styles.messageButton} onPress={messageAgent} disabled={starting}>
          {starting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="chatbubble-outline" size={18} color="#fff" />
              <Text style={styles.messageButtonText}>
                Contact {listing.owner?.role === 'agency' ? 'Agency' : 'Agent'}
              </Text>
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
  notFound: { ...type.body, fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.sm },
  backLink: { ...type.button, fontSize: fontSize.md, color: colors.accent },
  heroWrap: { backgroundColor: colors.border },
  photo: { width: windowWidth, height: heroHeight, backgroundColor: colors.border },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  pageIndicator: {
    position: 'absolute',
    right: spacing.md,
    // Clears the rounded-top sheet below, which overlaps the last
    // `radius.xxl` px of the image -- a plain `bottom: spacing.md` sat
    // right underneath that curve and got visually clipped by it.
    bottom: radius.xxl + spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  pageIndicatorText: { ...type.label, color: '#fff' },
  photoTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  roundButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Rounded top corners overlapping the hero photo -- the negative margin
  // is what pulls it up over the image's bottom edge.
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    marginTop: -radius.xxl,
    padding: spacing.lg,
    ...shadow.raised,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  premiumChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.premiumBg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  premiumChipText: { ...type.labelStrong, color: colors.premiumText },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  verifiedText: { ...type.labelStrong, color: colors.success },
  // The page's headline -- Poppins, like every other title/section-header
  // role, not the Inter cardTitle role used in the listing grid.
  title: { ...type.screenTitle, fontSize: fontSize.xl, color: colors.textPrimary },
  summaryLine: { ...type.body, fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  statsLine: { ...type.body, fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  listingAge: { ...type.secondary, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },
  viewCountRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  viewCountText: { ...type.secondary, fontSize: fontSize.xs, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  sectionTitle: { ...type.screenTitle, fontSize: fontSize.md, color: colors.textPrimary, marginBottom: spacing.sm },
  agentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  agentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentAvatarText: { fontFamily: fontFamily.headlineSemibold, fontSize: fontSize.md, color: colors.accent },
  agentBody: { flex: 1, gap: 2 },
  agentName: { ...type.bodyMedium, fontSize: fontSize.md, color: colors.textPrimary },
  agentMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  agentRole: { ...type.labelStrong, color: colors.accent, letterSpacing: 0.4 },
  agentVerifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  agentVerifiedText: { ...type.label, color: colors.success },
  agentTenure: { ...type.secondary, fontSize: fontSize.xs, color: colors.textMuted },
  description: { ...type.body, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22 },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  locationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCardText: { ...type.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary, flex: 1 },
  reportLink: { alignItems: 'center', marginTop: spacing.xl },
  reportLinkText: { ...type.secondary, color: colors.textMuted, fontSize: fontSize.xs, textDecorationLine: 'underline' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerPrice: { flexShrink: 1 },
  // Plain dark ink, not colors.accent -- same "price isn't a link/button
  // color" discipline as the card price. The CTA button carries the blue.
  footerPriceAmount: { ...type.priceLarge, fontSize: fontSize.xl, color: colors.textPrimary },
  footerPriceUnit: { ...type.secondary, fontSize: fontSize.xs, color: colors.textMuted },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
  },
  messageButtonText: { ...type.button, fontSize: fontSize.md, color: '#fff' },
});
