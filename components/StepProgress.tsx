import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/theme';
import { type } from '../constants/typography';

// Reflects real form state (see add.tsx's `currentStep`), not a page
// pager -- the form is still one continuous scroll, so this tells a user
// where they stand rather than gating navigation between steps.
export function StepProgress({ steps, currentIndex }: { steps: string[]; currentIndex: number }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.dotsRow}>
        {steps.map((step, i) => {
          const done = i < currentIndex;
          const reached = i <= currentIndex;
          return (
            <View key={step} style={styles.dotAndLine}>
              <View style={[styles.dot, reached && styles.dotReached]}>
                {done ? (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                ) : (
                  <Text style={[styles.dotText, reached && styles.dotTextReached]}>{i + 1}</Text>
                )}
              </View>
              {i < steps.length - 1 && <View style={[styles.line, i < currentIndex && styles.lineActive]} />}
            </View>
          );
        })}
      </View>
      <View style={styles.labelsRow}>
        {steps.map((step, i) => (
          <Text
            key={step}
            style={[styles.label, i <= currentIndex && styles.labelActive]}
            numberOfLines={1}
          >
            {step}
          </Text>
        ))}
      </View>
    </View>
  );
}

const DOT_SIZE = 22;

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  dotsRow: { flexDirection: 'row', alignItems: 'center' },
  dotAndLine: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotReached: { backgroundColor: colors.accent, borderColor: colors.accent },
  dotText: { ...type.labelStrong, fontSize: 11, color: colors.textMuted },
  dotTextReached: { color: '#fff' },
  line: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 2 },
  lineActive: { backgroundColor: colors.accent },
  labelsRow: { flexDirection: 'row', marginTop: 4 },
  label: { ...type.label, flex: 1, textAlign: 'center', color: colors.textMuted },
  labelActive: { color: colors.textPrimary },
});
