import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { friendlyErrorMessage } from '../lib/errors';
import { appAlert } from '../lib/alert';
import { colors, fontSize, fontWeight, radius, spacing } from '../constants/theme';
import { type } from '../constants/typography';

export default function ContactSupportScreen() {
  const insets = useSafeAreaInsets();
  const { session, profile } = useAuth();
  // Set when arriving from the FAQ panel's "Still need help?" -- which FAQ
  // question the person was reading, so the message doesn't land with no
  // context at all. Read once at mount: this screen doesn't need to react
  // to the param changing later, and useState's lazy initializer form
  // avoids re-computing these on every render.
  const { topic } = useLocalSearchParams<{ topic?: string }>();
  const [subject, setSubject] = useState(() => topic ?? '');
  const [message, setMessage] = useState(() => (topic ? `Re: "${topic}"\n\n` : ''));
  const [requestCall, setRequestCall] = useState(false);
  const [callbackPhone, setCallbackPhone] = useState(profile?.phone ?? '');
  const [sending, setSending] = useState(false);

  const senderName = profile?.full_name?.trim() || session?.user.email?.split('@')[0] || 'Easyfen user';
  const senderEmail = session?.user.email ?? '';

  const canSend = subject.trim().length > 0 && message.trim().length > 0 && (!requestCall || callbackPhone.trim().length > 0) && !sending;

  async function handleSend() {
    if (!session || !canSend) return;
    setSending(true);
    const { error } = await supabase.from('support_requests').insert({
      user_id: session.user.id,
      name: senderName,
      email: senderEmail,
      phone: requestCall ? callbackPhone.trim() : profile?.phone ?? null,
      subject: subject.trim(),
      message: message.trim(),
      request_call: requestCall,
    });
    setSending(false);
    if (error) {
      appAlert('Could not send your message', friendlyErrorMessage(error));
      return;
    }
    appAlert('Message sent', "Our team has received your message and will get back to you soon.", [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  if (!session) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.loggedOutTitle}>Log in to contact support</Text>
        <Text style={styles.loggedOutSubtitle}>You'll need an Easyfen account so our team can reply to you.</Text>
        <Pressable style={styles.loginButton} onPress={() => router.push('/auth')}>
          <Text style={styles.loginButtonText}>Log In / Sign Up</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Contact Support</Text>
      </View>

      <View style={styles.introIconWrap}>
        <Ionicons name="headset" size={28} color={colors.accent} />
      </View>
      <Text style={styles.introTitle}>Talk to a real person</Text>
      <Text style={styles.introBody}>
        Send us a message and a member of our team will reply directly -- no decision tree, no bot.
      </Text>

      <View style={styles.senderCard}>
        <Text style={styles.senderLabel}>Sending as</Text>
        <Text style={styles.senderName}>{senderName}</Text>
        <Text style={styles.senderEmail}>{senderEmail}</Text>
      </View>

      <Text style={styles.fieldLabel}>Subject</Text>
      <TextInput
        style={styles.input}
        value={subject}
        onChangeText={setSubject}
        placeholder="What's this about?"
        placeholderTextColor={colors.textMuted}
        maxLength={120}
      />

      <Text style={styles.fieldLabel}>Message</Text>
      <TextInput
        style={[styles.input, styles.messageInput]}
        value={message}
        onChangeText={setMessage}
        placeholder="Tell us what's going on..."
        placeholderTextColor={colors.textMuted}
        multiline
        textAlignVertical="top"
        maxLength={2000}
      />

      <Pressable
        style={styles.callRow}
        onPress={() => setRequestCall((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: requestCall }}
      >
        <Ionicons
          name={requestCall ? 'checkbox' : 'square-outline'}
          size={22}
          color={requestCall ? colors.accent : colors.textMuted}
        />
        <View style={styles.callRowText}>
          <Text style={styles.callRowTitle}>Request a call instead</Text>
          <Text style={styles.callRowSubtitle}>We'll phone you rather than reply in writing.</Text>
        </View>
      </Pressable>

      {requestCall && (
        <>
          <Text style={styles.fieldLabel}>Phone number to call</Text>
          <TextInput
            style={styles.input}
            value={callbackPhone}
            onChangeText={setCallbackPhone}
            placeholder="e.g. 076 123456"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
          />
        </>
      )}

      <Pressable
        style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
        disabled={!canSend}
        onPress={handleSend}
        accessibilityRole="button"
        accessibilityLabel="Send message to support"
        accessibilityState={{ disabled: !canSend }}
      >
        {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendButtonText}>Send to Support</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  headerTitle: { ...type.screenTitle, color: colors.textPrimary },
  introIconWrap: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  introTitle: { ...type.sectionTitle, fontSize: fontSize.lg, color: colors.textPrimary, textAlign: 'center' },
  introBody: {
    ...type.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  senderCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  senderLabel: { ...type.label, color: colors.textMuted, marginBottom: 2 },
  senderName: { ...type.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary },
  senderEmail: { ...type.secondary, color: colors.textSecondary },
  fieldLabel: { ...type.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  messageInput: { minHeight: 120 },
  callRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.lg },
  callRowText: { flex: 1 },
  callRowTitle: { ...type.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary },
  callRowSubtitle: { ...type.secondary, color: colors.textMuted, marginTop: 2 },
  sendButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: colors.border },
  sendButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold },
  loggedOutTitle: { ...type.sectionTitle, fontSize: fontSize.lg, color: colors.textPrimary, textAlign: 'center' },
  loggedOutSubtitle: {
    ...type.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    maxWidth: 300,
  },
  loginButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  loginButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
