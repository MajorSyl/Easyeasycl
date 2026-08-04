import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { friendlyErrorMessage } from '../../lib/errors';
import { colors, fontSize, spacing } from '../../constants/theme';
import { ListingCard } from '../../components/ListingCard';
import { HotelCard } from '../../components/HotelCard';
import { ServiceCard } from '../../components/ServiceCard';
import { getOrCreateConversation } from '../../lib/conversations';
import { initialsFor, roleLabel } from '../../lib/format';
import type { Profile } from '../../lib/auth-context';
import type { Hotel, Listing, Service } from '../../lib/types';

type ProfileItem =
  | { kind: 'listing'; id: string; data: Listing }
  | { kind: 'hotel'; id: string; data: Hotel }
  | { kind: 'service'; id: string; data: Service };

export default function PublicProfileScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, onlineUserIds } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const ownerJoin = '*, owner:profiles(full_name, avatar_url, role)';
      const [profileRes, listings, hotels, services] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role, business_name, created_at')
          .eq('id', id)
          .single(),
        supabase.from('listings').select(ownerJoin).eq('owner_id', id).order('created_at', { ascending: false }),
        supabase.from('hotels').select(ownerJoin).eq('owner_id', id).order('created_at', { ascending: false }),
        supabase.from('services').select(ownerJoin).eq('owner_id', id).order('created_at', { ascending: false }),
      ]);
      if (cancelled) return;
      setProfile(profileRes.data as Profile | null);
      setItems([
        ...((listings.data as Listing[]) ?? []).map((d) => ({ kind: 'listing' as const, id: d.id, data: d })),
        ...((hotels.data as Hotel[]) ?? []).map((d) => ({ kind: 'hotel' as const, id: d.id, data: d })),
        ...((services.data as Service[]) ?? []).map((d) => ({ kind: 'service' as const, id: d.id, data: d })),
      ]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleMessage() {
    if (!profile) return;
    if (!session) {
      router.push('/auth');
      return;
    }
    if (session.user.id === profile.id) return;
    try {
      const conversationId = await getOrCreateConversation(session.user.id, profile.id, null);
      router.push(`/messages/${conversationId}`);
    } catch {
      // chat can also be started from a listing
    }
  }

  async function handleHire(service: Service) {
    if (!session) {
      router.push('/auth');
      return;
    }
    try {
      const conversationId = await getOrCreateConversation(session.user.id, service.owner_id, null);
      router.push(`/messages/${conversationId}`);
    } catch {
      // service detail page offers Hire again
    }
  }

  async function submitReport(reason: string) {
    if (!session || !profile) return;
    const { error } = await supabase
      .from('reports')
      .insert({ reporter_id: session.user.id, item_type: 'user', item_id: profile.id, reason });
    if (error) {
      Alert.alert('Could not submit report', friendlyErrorMessage(error));
    } else {
      Alert.alert('Report submitted', "Thank you — our team will review this.");
    }
  }

  function handleReport() {
    Alert.alert('Report this user', 'Why are you reporting this user?', [
      { text: 'Spam or scam', onPress: () => submitReport('Spam or scam') },
      { text: 'Inappropriate content', onPress: () => submitReport('Inappropriate content') },
      { text: 'Harassment', onPress: () => submitReport('Harassment') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function handleBlock() {
    if (!session || !profile) return;
    Alert.alert('Block this user?', 'You will no longer be able to message each other.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('blocks')
            .insert({ blocker_id: session.user.id, blocked_id: profile.id });
          if (error) {
            Alert.alert('Could not block user', friendlyErrorMessage(error));
          } else {
            Alert.alert('User blocked');
          }
        },
      },
    ]);
  }

  function handleMoreOptions() {
    if (!session) {
      router.push('/auth');
      return;
    }
    Alert.alert('More options', undefined, [
      { text: 'Report user', onPress: handleReport },
      { text: 'Block user', style: 'destructive', onPress: handleBlock },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.mutedText}>This profile is no longer available.</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const isOnline = onlineUserIds.has(profile.id);

  return (
    <FlatList
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.listContent}
      data={items}
      keyExtractor={(item) => `${item.kind}-${item.id}`}
      ListHeaderComponent={
        <>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </Pressable>
            {session?.user.id !== profile.id && (
              <Pressable onPress={handleMoreOptions} hitSlop={8}>
                <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
              </Pressable>
            )}
          </View>

          <View style={styles.hero}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initialsFor(profile.full_name)}</Text>
              </View>
              {isOnline && <View style={styles.onlineDot} />}
            </View>
            <Text style={styles.name}>{profile.full_name ?? 'Easyfen User'}</Text>
            {roleLabel(profile.role) && <Text style={styles.role}>{roleLabel(profile.role)}</Text>}
            {profile.business_name && <Text style={styles.business}>{profile.business_name}</Text>}

            {session?.user.id !== profile.id && (
              <Pressable style={styles.messageButton} onPress={handleMessage}>
                <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                <Text style={styles.messageButtonText}>Message</Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.sectionTitle}>
            Listings ({items.length})
          </Text>
        </>
      }
      renderItem={({ item }) => {
        if (item.kind === 'listing') return <ListingCard listing={item.data} />;
        if (item.kind === 'hotel') return <HotelCard hotel={item.data} />;
        return <ServiceCard service={item.data} onHire={() => handleHire(item.data)} />;
      }}
      ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      ListEmptyComponent={<Text style={styles.mutedText}>No active listings yet.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  mutedText: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.lg },
  backLink: { fontSize: fontSize.md, color: colors.accent, fontWeight: '600' },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  hero: { alignItems: 'center', marginBottom: spacing.lg },
  avatarWrap: { position: 'relative', marginBottom: spacing.md },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.accent },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.online,
    borderWidth: 2,
    borderColor: colors.background,
  },
  name: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
  role: { fontSize: 11, fontWeight: '700', color: colors.accent, letterSpacing: 0.4, marginTop: 2 },
  business: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  messageButtonText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '700' },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
});
