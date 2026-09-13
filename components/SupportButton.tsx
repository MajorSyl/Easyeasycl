import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, shadow, spacing } from '../constants/theme';
import { useFabClearance } from '../lib/use-bottom-gap';

// A direct, one-tap shortcut to a human (the Contact Support form) --
// deliberately separate from HelpWidget's self-serve FAQ decision tree, and
// never merged into it. Someone who already knows the FAQ won't answer their
// question shouldn't have to detour through it first to reach a person.
// Sits in the standard bottom-right FAB slot; HelpWidget stacks above it
// (see its STACK_OFFSET) so the two never overlap.
export function SupportButton() {
  const fabBottom = useFabClearance() + spacing.lg;

  return (
    <Pressable
      style={[styles.fab, { bottom: fabBottom }]}
      onPress={() => router.push('/contact-support')}
      accessibilityRole="button"
      accessibilityLabel="Contact Support"
    >
      <Ionicons name="headset" size={24} color="#fff" />
    </Pressable>
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
});
