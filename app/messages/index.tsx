import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { colors, fontSize, fontWeight, radius, spacing } from '../../constants/theme';
import { formatMessageTimestamp, initialsFor, roleLabel } from '../../lib/format';
import type { OwnerSummary } from '../../lib/types';

type ConversationRow = {
  id: string;
  participant_one: string;
  participant_two: string;
  last_message_at: string;
  one: OwnerSummary & { id: string };
  two: OwnerSummary & { id: string };
};

type ConversationItem = {
  id: string;
  other: OwnerSummary & { id: string };
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
};

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const { session, onlineUserIds } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!session) {
      setConversations([]);
      setLoading(false);
      return;
    }
    const uid = session.user.id;

    const { data: convRows, error: convError } = await supabase
      .from('conversations')
      .select(
        'id, participant_one, participant_two, last_message_at, one:profiles!conversations_participant_one_fkey(id, full_name, avatar_url, role), two:profiles!conversations_participant_two_fkey(id, full_name, avatar_url, role)'
      )
      .or(`participant_one.eq.${uid},participant_two.eq.${uid}`)
      .order('last_message_at', { ascending: false });

    if (convError) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    setLoadError(false);

    const rows = (convRows as unknown as ConversationRow[]) ?? [];
    const ids = rows.map((r) => r.id);

    let latestByConversation = new Map<string, string>();
    let unreadByConversation = new Map<string, number>();

    if (ids.length > 0) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('conversation_id, body, sender_id, read_at, created_at')
        .in('conversation_id', ids)
        .order('created_at', { ascending: false })
        .limit(200);

      for (const msg of msgs ?? []) {
        if (!latestByConversation.has(msg.conversation_id)) {
          latestByConversation.set(msg.conversation_id, msg.body);
        }
        if (msg.sender_id !== uid && !msg.read_at) {
          unreadByConversation.set(msg.conversation_id, (unreadByConversation.get(msg.conversation_id) ?? 0) + 1);
        }
      }
    }

    const items: ConversationItem[] = rows.map((row) => ({
      id: row.id,
      other: row.participant_one === uid ? row.two : row.one,
      lastMessage: latestByConversation.get(row.id) ?? null,
      lastMessageAt: row.last_message_at,
      unreadCount: unreadByConversation.get(row.id) ?? 0,
    }));

    setConversations(items);
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = search.trim()
    ? conversations.filter((c) => (c.other.full_name ?? '').toLowerCase().includes(search.trim().toLowerCase()))
    : conversations;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Ionicons name="chatbubble-outline" size={18} color={colors.accent} />
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerAvatar}>
          <Ionicons name="person" size={16} color={colors.accent} />
        </View>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/messages/${item.id}`)}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initialsFor(item.other.full_name)}</Text>
              </View>
              {onlineUserIds.has(item.other.id) && <View style={styles.onlineDot} />}
            </View>

            <View style={styles.rowBody}>
              <View style={styles.rowTop}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.other.full_name ?? 'Easyfen User'}
                </Text>
                <Text style={styles.timestamp}>{formatMessageTimestamp(item.lastMessageAt)}</Text>
              </View>
              {roleLabel(item.other.role) && <Text style={styles.roleLabel}>{roleLabel(item.other.role)}</Text>}
              <Text style={styles.preview} numberOfLines={1}>
                {item.lastMessage ?? 'Say hello 👋'}
              </Text>
            </View>

            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyStateTitle}>{loadError ? "Couldn't load messages" : 'No conversations yet'}</Text>
            <Text style={styles.emptyStateText}>
              {loadError
                ? 'Check your connection and try again.'
                : 'Message an agent from a listing to start chatting.'}
            </Text>
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
  headerTitle: { flex: 1, fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.accent },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.online,
    borderWidth: 2,
    borderColor: colors.card,
  },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  timestamp: { fontSize: fontSize.xs, color: colors.textMuted },
  roleLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.accent, letterSpacing: 0.4, marginTop: 1 },
  preview: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: { color: '#fff', fontSize: 11, fontWeight: fontWeight.bold },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { paddingTop: spacing.xxl, alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyStateTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  emptyStateText: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center' },
});
