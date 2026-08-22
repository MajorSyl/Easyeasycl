import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { colors, fontSize, fontWeight, radius, spacing } from '../constants/theme';
import { formatMessageTimestamp, initialsFor } from '../lib/format';

type MessageNotification = {
  kind: 'message';
  key: string;
  conversationId: string;
  senderName: string | null;
  count: number;
  lastMessage: string;
  lastAt: string;
};

type SavedSearchNotification = {
  kind: 'saved_search_match';
  key: string;
  matchId: string;
  listingId: string;
  listingTitle: string;
  searchLabel: string;
  lastAt: string;
};

type Notification = MessageNotification | SavedSearchNotification;

function savedSearchLabel(search: { query: string | null; max_price: number | null } | null) {
  if (!search) return 'your saved search';
  const parts: string[] = [];
  if (search.query) parts.push(`"${search.query}"`);
  if (search.max_price != null) parts.push(`under NLE ${Math.round(search.max_price).toLocaleString('en-US')}`);
  return parts.length ? parts.join(' · ') : 'your saved search';
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    const uid = session.user.id;

    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .or(`participant_one.eq.${uid},participant_two.eq.${uid}`);
    const ids = (conversations ?? []).map((c) => c.id);

    const messageNotifications: MessageNotification[] = [];
    if (ids.length > 0) {
      const { data: unread } = await supabase
        .from('messages')
        .select('conversation_id, body, created_at, sender:profiles(full_name)')
        .in('conversation_id', ids)
        .neq('sender_id', uid)
        .is('read_at', null)
        .order('created_at', { ascending: false });

      const grouped = new Map<string, MessageNotification>();
      for (const msg of (unread as any[]) ?? []) {
        const existing = grouped.get(msg.conversation_id);
        if (existing) {
          existing.count += 1;
        } else {
          grouped.set(msg.conversation_id, {
            kind: 'message',
            key: `message-${msg.conversation_id}`,
            conversationId: msg.conversation_id,
            senderName: msg.sender?.full_name ?? null,
            count: 1,
            lastMessage: msg.body,
            lastAt: msg.created_at,
          });
        }
      }
      messageNotifications.push(...grouped.values());
    }

    const { data: matches } = await supabase
      .from('saved_search_matches')
      .select('id, created_at, listing:listings(id, title), saved_search:saved_searches(query, max_price)')
      .eq('user_id', uid)
      .is('read_at', null)
      .order('created_at', { ascending: false });

    const matchNotifications: SavedSearchNotification[] = ((matches as any[]) ?? [])
      .filter((m) => m.listing)
      .map((m) => ({
        kind: 'saved_search_match' as const,
        key: `match-${m.id}`,
        matchId: m.id,
        listingId: m.listing.id,
        listingTitle: m.listing.title,
        searchLabel: savedSearchLabel(m.saved_search),
        lastAt: m.created_at,
      }));

    const combined = [...messageNotifications, ...matchNotifications].sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
    );

    setNotifications(combined);
    setLoading(false);
  }, [session]);

  async function openMatch(item: SavedSearchNotification) {
    setNotifications((prev) => prev.filter((n) => n.key !== item.key));
    await supabase.from('saved_search_matches').update({ read_at: new Date().toISOString() }).eq('id', item.matchId);
    router.push(`/listing/${item.listingId}`);
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Ionicons name="notifications-outline" size={18} color={colors.accent} />
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) =>
            item.kind === 'message' ? (
              <Pressable style={styles.row} onPress={() => router.push(`/messages/${item.conversationId}`)}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initialsFor(item.senderName)}</Text>
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>
                    {item.senderName ?? 'Easyfen User'} sent you {item.count === 1 ? 'a message' : `${item.count} messages`}
                  </Text>
                  <Text style={styles.rowPreview} numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                </View>
                <Text style={styles.timestamp}>{formatMessageTimestamp(item.lastAt)}</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.row} onPress={() => openMatch(item)}>
                <View style={styles.avatar}>
                  <Ionicons name="bookmark" size={16} color={colors.accent} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    New listing matches {item.searchLabel}
                  </Text>
                  <Text style={styles.rowPreview} numberOfLines={1}>
                    {item.listingTitle}
                  </Text>
                </View>
                <Text style={styles.timestamp}>{formatMessageTimestamp(item.lastAt)}</Text>
              </Pressable>
            )
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyStateTitle}>You're all caught up</Text>
              <Text style={styles.emptyStateText}>New messages and saved search matches will show up here.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.accent },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  rowPreview: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  timestamp: { fontSize: fontSize.xs, color: colors.textMuted },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyStateTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  emptyStateText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
});
