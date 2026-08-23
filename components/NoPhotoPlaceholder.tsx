import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight } from '../constants/theme';

// A deliberately labeled "no photo" state — an icon alone can read as a
// broken/loading image rather than an intentional placeholder, especially
// at a glance in a scrolling feed. Used everywhere a listing/hotel photo
// might be missing (card grids, the detail hero) so the empty state is
// unambiguous across the whole app.
export function NoPhotoPlaceholder({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.container}>
      <Ionicons name="image-outline" size={compact ? 22 : 32} color={colors.textMuted} />
      {!compact && <Text style={styles.label}>No Photo</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  label: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted },
});
