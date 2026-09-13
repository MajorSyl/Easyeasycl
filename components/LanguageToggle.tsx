import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight, radius } from '../constants/theme';
import type { SearchLanguage } from './VoiceSearchButton';

export function LanguageToggle({
  value,
  onChange,
}: {
  value: SearchLanguage;
  onChange: (lang: SearchLanguage) => void;
}) {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      <Pressable
        style={[styles.pill, value === 'en' && styles.pillActive]}
        onPress={() => onChange('en')}
        accessibilityRole="tab"
        accessibilityState={{ selected: value === 'en' }}
      >
        <Text style={[styles.pillText, value === 'en' && styles.pillTextActive]}>English</Text>
      </Pressable>
      <Pressable
        style={[styles.pill, value === 'kri' && styles.pillActive]}
        onPress={() => onChange('kri')}
        accessibilityRole="tab"
        accessibilityState={{ selected: value === 'kri' }}
      >
        <Text style={[styles.pillText, value === 'kri' && styles.pillTextActive]}>Krio</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    padding: 2,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill },
  pillActive: { backgroundColor: colors.accent },
  pillText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted },
  pillTextActive: { color: '#fff' },
});
