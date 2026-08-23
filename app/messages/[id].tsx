import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { useKeyboardHeight } from '../../lib/use-keyboard-height';
import { friendlyErrorMessage } from '../../lib/errors';
import { sanitizeText } from '../../lib/sanitize';
import { colors, fontSize, fontWeight, radius, spacing } from '../../constants/theme';
import { initialsFor, roleLabel } from '../../lib/format';
import type { OwnerSummary } from '../../lib/types';

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export default function ChatThreadScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, onlineUserIds } = useAuth();
  const [otherUser, setOtherUser] = useState<(OwnerSummary & { id: string }) | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<TextInput>(null);
  const keyboardHeight = useKeyboardHeight();

  // Some Android skins (e.g. MIUI) report a zero bottom inset even though a
  // system navigation bar overlays the app, leaving the composer buried under
  // untappable system UI. Never trust a zero: assume a 3-button bar's height.
  const bottomGap = Platform.OS === 'android' ? Math.max(insets.bottom, 48) : insets.bottom;

  useEffect(() => {
    if (keyboardHeight > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [keyboardHeight]);

  const loadConversation = useCallback(async () => {
    if (!session || !id) return;
    const uid = session.user.id;

    const { data: conv } = await supabase
      .from('conversations')
      .select(
        'participant_one, participant_two, one:profiles!conversations_participant_one_fkey(id, full_name, avatar_url, role), two:profiles!conversations_participant_two_fkey(id, full_name, avatar_url, role)'
      )
      .eq('id', id)
      .single();

    if (conv) {
      const other = conv.participant_one === uid ? conv.two : conv.one;
      setOtherUser(other as unknown as OwnerSummary & { id: string });
    }

    const { data: msgs, error: msgsError } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, body, created_at, read_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (msgsError) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    setLoadError(false);
    setMessages((msgs as Message[]) ?? []);

    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', id)
      .neq('sender_id', uid)
      .is('read_at', null);
    setLoading(false);
  }, [session, id]);

  // Load once on mount; the realtime channel handles live updates after that.
  // Mark-as-read also runs here on initial load.
  useEffect(() => {
    loadConversation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, id]);

  useEffect(() => {
    if (!id || !session) return;
    const channel = supabase
      .channel(`messages-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
          if (incoming.sender_id !== session.user.id) {
            supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', incoming.id).then();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, session]);

  async function handleSend() {
    const body = sanitizeText(draft);
    if (!body || !session || !id || sending) return;
    setSending(true);
    setDraft('');
    const { error } = await supabase.from('messages').insert({
      conversation_id: id,
      sender_id: session.user.id,
      body,
    });
    setSending(false);
    if (error) {
      setDraft(body);
      Alert.alert('Message not sent', friendlyErrorMessage(error));
    }
  }

  if (!session) return null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          style={styles.headerProfile}
          onPress={() => otherUser && router.push(`/user/${otherUser.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`View ${otherUser?.full_name ?? 'this user'}'s profile`}
        >
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsFor(otherUser?.full_name ?? null)}</Text>
            </View>
            {otherUser && onlineUserIds.has(otherUser.id) && <View style={styles.onlineDot} />}
          </View>
          <View style={styles.headerBody}>
            <Text style={styles.headerName} numberOfLines={1}>
              {otherUser?.full_name ?? 'Easyfen User'}
            </Text>
            {roleLabel(otherUser?.role) && <Text style={styles.headerRole}>{roleLabel(otherUser?.role)}</Text>}
          </View>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const mine = item.sender_id === session.user.id;
          return (
            <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={mine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>{item.body}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {loadError && <Ionicons name="cloud-offline-outline" size={32} color={colors.textMuted} />}
            <Text style={styles.emptyStateText}>
              {loadError ? "Couldn't load this conversation. Check your connection and try again." : 'Say hello 👋'}
            </Text>
          </View>
        }
      />
      )}

      <View
        style={[
          styles.composer,
          { paddingBottom: keyboardHeight > 0 ? spacing.md : bottomGap + spacing.md, marginBottom: keyboardHeight },
        ]}
      >
        <Pressable style={styles.composerInputWrap} onPress={() => inputRef.current?.focus()}>
          <TextInput
            ref={inputRef}
            style={styles.composerInput}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            value={draft}
            onChangeText={setDraft}
            multiline
            accessibilityLabel="Message text"
          />
        </Pressable>
        <Pressable
          style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!draft.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !draft.trim() || sending }}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerProfile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.accent },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.online,
    borderWidth: 2,
    borderColor: colors.card,
  },
  headerBody: { flex: 1 },
  headerName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  headerRole: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.accent, letterSpacing: 0.4 },
  listContent: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleMine: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleTextMine: { color: '#fff', fontSize: fontSize.sm },
  bubbleTextTheirs: { color: colors.textPrimary, fontSize: fontSize.sm },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyStateText: { color: colors.textMuted, fontSize: fontSize.sm },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  composerInputWrap: { flex: 1 },
  composerInput: {
    maxHeight: 100,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: colors.textMuted },
});
