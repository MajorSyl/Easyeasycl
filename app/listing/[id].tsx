import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { friendlyErrorMessage } from '../../lib/errors';
import { useAuth } from '../../lib/auth-context';
import { useBottomGap } from '../../lib/use-bottom-gap';
import { getOrCreateConversation } from '../../lib/conversations';
import { colors, fontSize, fontWeight, radius, spacing } from '../../constants/theme';
import { Badge } from '../../components/Badge';
import { FavoriteButton } from '../../components/FavoriteButton';
import { categoryBadgeLabel, formatListingAge, formatPrice, initialsFor } from '../../lib/format';
import type { Listing } from '../../lib/types';

const windowWidth = Dimensions.get('window').width;

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
      .select('*, owner:profiles(full_name, avatar_url, role)')
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
    await Share.share({
      message: `${listing.title}\n${formatPrice(listing.price, listing.currency, listing.price_unit)} · ${listing.location}\n\nFound on Easyfen`,
    });
  }

  async function submitReport(reason: string) {
    if (!listing || !session) return;
    const { error } = await supabase
      .from('reports')
      .insert({ reporter_id: session.user.id, item_type: 'listing', item_id: listing.id, reason });
    if (error) {
      Alert.alert('Could not submit report', friendlyErrorMessage(error));
      return;
    }
    Alert.alert('Listing reported', 'This listing has been suspended pending review. Thank you for the report.', [
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
    Alert.alert('Report this listing', 'Why are you reporting this listing?', [
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
      Alert.alert('This is your listing', 'You cannot message yourself.');
      return;
    }
    if (starting) return;
    setStarting(true);
    try {
      const conversationId = await getOrCreateConversation(session.user.id, listing.owner_id, listing.id);
      router.push(`/messages/${conversationId}`);
    } catch (err) {
      Alert.alert('Could not start conversation', friendlyErrorMessage(err));
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View>
          {listing.photos.length > 0 ? (
            <>
              <FlatList
                data={listing.photos}
                keyExtractor={(url) => url}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) =>
                  setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / windowWidth))
                }
                renderItem={({ item }) => (
                  <Image source={{ uri: item }} style={styles.photo} contentFit="cover" />
                )}
              />
              {listing.photos.length > 1 && (
                <View style={styles.photoDots}>
                  {listing.photos.map((url, i) => (
                    <View key={url} style={[styles.dot, i === photoIndex && styles.dotActive]} />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Ionicons name="image-outline" size={40} color={colors.textMuted} />
            </View>
          )}

          <View style={[styles.photoTopBar, { top: insets.top + spacing.sm }]}>
            <Pressable style={styles.roundButton} onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </Pressable>
            <View style={styles.topBarRight}>
              {session?.user.id !== listing.owner_id && (
                <Pressable style={styles.roundButton} onPress={handleReport} hitSlop={8}>
                  <Ionicons name="flag-outline" size={18} color={colors.textPrimary} />
                </Pressable>
              )}
              <Pressable style={styles.roundButton} onPress={handleShare} hitSlop={8}>
                <Ionicons name="share-outline" size={18} color={colors.textPrimary} />
              </Pressable>
              <FavoriteButton itemType="listing" itemId={listing.id} />
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.badgeRow}>
            <Badge label={categoryBadgeLabel(listing.category)} variant="dark" />
            {listing.is_premium && <Badge label="PREMIUM" variant="premium" />}
            {listing.is_verified && (
              <View style={styles.verifiedRow}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{listing.title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={styles.location}>{listing.location}</Text>
          </View>
          {listing.last_confirmed_at && (
            <Text style={styles.listingAge}>{formatListingAge(listing.last_confirmed_at)}</Text>
          )}

          <Text style={styles.price}>{formatPrice(listing.price, listing.currency, listing.price_unit)}</Text>

          <View style={styles.statsRow}>
            {listing.bedrooms != null && (
              <View style={styles.statItem}>
                <Ionicons name="bed-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.statText}>
                  {listing.bedrooms} bedroom{listing.bedrooms === 1 ? '' : 's'}
                </Text>
              </View>
            )}
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.statText}>{listing.view_count} views</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="camera-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.statText}>
                {listing.photos.length} photo{listing.photos.length === 1 ? '' : 's'}
              </Text>
            </View>
          </View>

          {listing.description && (
            <>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{listing.description}</Text>
            </>
          )}

          <Text style={styles.sectionTitle}>Agent</Text>
          <Pressable style={styles.agentRow} onPress={() => router.push(`/user/${listing.owner_id}`)}>
            <View style={styles.agentAvatar}>
              <Text style={styles.agentAvatarText}>{initialsFor(listing.owner?.full_name ?? null)}</Text>
            </View>
            <View style={styles.agentBody}>
              <Text style={styles.agentName}>{listing.owner?.full_name ?? 'Easyfen User'}</Text>
              {listing.owner?.role === 'agent' && <Text style={styles.agentRole}>AGENT</Text>}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomGap + spacing.md }]}>
        <Pressable style={styles.messageButton} onPress={messageAgent} disabled={starting}>
          {starting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="chatbubble-outline" size={18} color="#fff" />
              <Text style={styles.messageButtonText}>Message Agent</Text>
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
  backLink: { fontSize: fontSize.md, color: colors.accent, fontWeight: fontWeight.semibold },
  photo: { width: windowWidth, height: windowWidth * 0.75, backgroundColor: colors.border },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  photoDots: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff' },
  photoTopBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
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
  body: { padding: spacing.lg },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  verifiedText: { fontSize: fontSize.xs, color: colors.success, fontWeight: fontWeight.semibold },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginTop: spacing.sm },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  location: { fontSize: fontSize.sm, color: colors.textMuted },
  listingAge: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },
  price: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.accent, marginTop: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: fontSize.sm, color: colors.textSecondary },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm },
  description: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22 },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  agentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentAvatarText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.accent },
  agentBody: { flex: 1 },
  agentName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  agentRole: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.accent, letterSpacing: 0.4 },
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
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  messageButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
