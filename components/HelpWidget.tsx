import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, radius, shadow, spacing } from '../constants/theme';
import { type } from '../constants/typography';
import { useBottomGap, TAB_BAR_CONTENT_HEIGHT } from '../lib/use-bottom-gap';
import { FAQ_ENTRIES, type FaqEntry } from '../constants/faq';

// Routes that render the bottom tab bar -- the floating button needs extra
// clearance above it there, and less everywhere else.
const TAB_ROUTES = new Set(['/', '/search', '/add', '/profile']);

// Decision-tree Help widget: tappable pre-written questions, never a free
// text box and never a network call -- see constants/faq.ts for the actual
// content, which is the only file that needs touching to add a question.
export function HelpWidget() {
  const pathname = usePathname();
  const bottomGap = useBottomGap();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<FaqEntry | null>(null);

  const fabBottom = bottomGap + (TAB_ROUTES.has(pathname) ? TAB_BAR_CONTENT_HEIGHT : 0) + spacing.lg;

  function openWidget() {
    setSelected(null);
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  return (
    <>
      <Pressable
        style={[styles.fab, { bottom: fabBottom }]}
        onPress={openWidget}
        accessibilityRole="button"
        accessibilityLabel="Help"
      >
        <Ionicons name="help-buoy-outline" size={24} color="#fff" />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close help">
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name="help-buoy-outline" size={18} color={colors.accent} />
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
    maxHeight: '75%',
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
});
