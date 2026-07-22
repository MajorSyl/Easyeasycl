import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { formatMessageTimestamp, initialsFor } from '../lib/format';

type Notification = {
  conversationId: string;
  senderName: string | null;
  count: number;
  lastMessage: string;
  lastAt: string;
};

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
    if (ids.length === 0) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const { data: unread } = await supabase
      .from('messages')
      .select('conversation_id, body, created_at, sender:profiles(full_name)')
      .in('conversation_id', ids)
      .neq('sender_id', uid)
      .is('read_at', null)
      .order('created_at', { ascending: false });

    const grouped = new Map<string, Notification>();
    for (const msg of (unread as any[]) ?? []) {
      const existing = grouped.get(msg.conversation_id);
      if (existing) {
        existing.count += 1;
      } else {
        grouped.set(msg.conversation_id, {
          conversationId: msg.conversation_id,
          senderName: msg.sender?.full_name ?? null,
          count: 1,
          lastMessage: msg.body,
          lastAt: msg.created_at,
        });
      }
    }

    setNotifications([...grouped.values()]);
    setLoading(false);
  }, [session]);

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
          keyExtractor={(item) => item.conversationId}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
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
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyStateTitle}>You're all caught up</Text>
              <Text style={styles.emptyStateText}>New messages and listing responses will show up here.</Text>
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
  headerTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
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
  avatarText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.accent },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  rowPreview: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  timestamp: { fontSize: fontSize.xs, color: colors.textMuted },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyStateTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  emptyStateText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
});
