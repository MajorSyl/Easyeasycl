import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, fontSize, radius, shadow, spacing } from '../constants/theme';
import { type } from '../constants/typography';
import { useFabClearance } from '../lib/use-bottom-gap';
import { FAQ_ENTRIES, type FaqEntry } from '../constants/faq';

// The single support entry point, app-wide: one floating button opens one
// panel that leads with self-serve FAQ answers and always keeps a direct
// line to a human one tap away below them -- not two separate systems (a
// standalone FAQ widget plus a separate Contact Support shortcut) someone
// has to know to look for individually. See constants/faq.ts to add a
// question; nothing else here needs to change for that.
export function SupportButton() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<FaqEntry | null>(null);
  const fabBottom = useFabClearance() + spacing.lg;

  function openPanel() {
    setSelected(null);
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  // Carries whichever FAQ topic (if any) was on screen into the Contact
  // Support form, pre-filling its subject/message -- so a message that
  // starts "the FAQ didn't answer my question" arrives with the actual
  // question attached, not just a blank form.
  function contactSupport() {
    setOpen(false);
    router.push(
      selected
        ? { pathname: '/contact-support', params: { topic: selected.question } }
        : { pathname: '/contact-support' }
    );
  }

  return (
    <>
      <Pressable
        style={[styles.fab, { bottom: fabBottom }]}
        onPress={openPanel}
        accessibilityRole="button"
        accessibilityLabel="Support"
      >
        <Ionicons name="headset" size={24} color="#fff" />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close support">
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name="headset" size={18} color={colors.accent} />
              </View>
              <Text style={styles.headerTitle}>{selected ? 'Answer' : 'How can we help?'}</Text>
              <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
              {selected ? (
                <>
                  <View style={[styles.bubble, styles.bubbleUser]}>
                    <Text style={styles.bubbleUserText}>{selected.question}</Text>
                  </View>
                  <View style={[styles.bubble, styles.bubbleAnswer]}>
                    <Text style={styles.bubbleAnswerText}>{selected.answer}</Text>
                  </View>
                  <Pressable style={styles.backToQuestions} onPress={() => setSelected(null)}>
                    <Ionicons name="arrow-back" size={16} color={colors.accent} />
                    <Text style={styles.backToQuestionsText}>Ask something else</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.introText}>Pick a question to see the answer instantly.</Text>
                  {FAQ_ENTRIES.map((entry) => (
                    <Pressable key={entry.id} style={styles.question} onPress={() => setSelected(entry)}>
                      <Text style={styles.questionText}>{entry.question}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </Pressable>
                  ))}
                </>
              )}
            </ScrollView>

            <View style={styles.contactFooter}>
              <Text style={styles.contactFooterTitle}>Still need help?</Text>
              <Text style={styles.contactFooterSubtitle}>
                {selected
                  ? "If that didn't answer it, message our team directly."
                  : "Can't find your answer above? Message our team directly."}
              </Text>
              <Pressable style={styles.contactButton} onPress={contactSupport} accessibilityRole="button">
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#fff" />
                <Text style={styles.contactButtonText}>Contact Support</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.raised,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, ...type.cardTitle, fontSize: fontSize.md, color: colors.textPrimary },
  body: { paddingHorizontal: spacing.lg },
  bodyContent: { paddingVertical: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl },
  introText: { ...type.secondary, fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.xs },
  question: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  questionText: { flex: 1, ...type.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary },
  bubble: { borderRadius: radius.lg, padding: spacing.md, maxWidth: '90%' },
  bubbleUser: { backgroundColor: colors.accent, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleUserText: { ...type.body, fontSize: fontSize.sm, color: '#fff' },
  bubbleAnswer: { backgroundColor: colors.background, alignSelf: 'flex-start', borderBottomLeftRadius: 4, maxWidth: '100%' },
  bubbleAnswerText: { ...type.body, fontSize: fontSize.sm, color: colors.textPrimary, lineHeight: 20 },
  backToQuestions: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: spacing.md, padding: spacing.xs },
  backToQuestionsText: { ...type.button, fontSize: fontSize.sm, color: colors.accent },
  // Always visible below the scrolling FAQ content -- a dead end in the FAQ
  // list (or an answer that didn't help) should never require hunting for
  // a separate way to reach a person.
  contactFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    gap: 2,
  },
  contactFooterTitle: { ...type.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary },
  contactFooterSubtitle: { ...type.secondary, color: colors.textMuted, marginBottom: spacing.sm },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  contactButtonText: { ...type.button, fontSize: fontSize.sm, color: '#fff' },
});
