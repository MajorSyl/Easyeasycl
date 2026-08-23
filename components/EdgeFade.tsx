import { View } from 'react-native';
import { colors } from '../constants/theme';

const STEPS = 10;

// Approximates a fade-to-background gradient along a horizontal scroll's
// trailing edge (no expo-linear-gradient dependency) using stacked,
// increasingly opaque strips — a lightweight "there's more to scroll" cue
// so a horizontal list doesn't read as an abruptly clipped layout bug.
export function EdgeFade({ width = 32, backgroundColor = colors.background }: { width?: number; backgroundColor?: string }) {
  const stripWidth = width / STEPS;
  return (
    <View
      style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width, flexDirection: 'row' }}
      pointerEvents="none"
    >
      {Array.from({ length: STEPS }).map((_, i) => (
        <View key={i} style={{ width: stripWidth, height: '100%', backgroundColor, opacity: (i + 1) / STEPS }} />
      ))}
    </View>
  );
}
