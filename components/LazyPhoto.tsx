import { useState } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { Image, type ImageContentFit, type ImageStyle } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../lib/settings';
import { colors, fontSize, fontWeight } from '../constants/theme';

// Respects the data-lite setting: when it's on, a photo doesn't download
// at all until the user taps it. There's no separate lower-resolution
// asset generated server-side, so this isn't "loads a compressed image by
// default" in the literal sense — it's the stronger, always-correct
// version of the same idea: no bytes are spent on a photo you haven't
// asked to see.
export function LazyPhoto({
  uri,
  style,
  contentFit = 'cover',
  compact = false,
  alwaysLoad = false,
  accessibilityLabel,
}: {
  uri: string;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  compact?: boolean;
  alwaysLoad?: boolean;
  accessibilityLabel?: string;
}) {
  const { dataLiteMode } = useSettings();
  const [tapped, setTapped] = useState(false);

  if (dataLiteMode && !alwaysLoad && !tapped) {
    return (
      <Pressable
        style={[styles.placeholder, style as StyleProp<ViewStyle>]}
        onPress={() => setTapped(true)}
        accessibilityRole="button"
        accessibilityLabel="Load photo"
        accessibilityHint="Data-saver mode is on — this photo hasn't been downloaded yet"
      >
        <Ionicons name="cloud-download-outline" size={compact ? 18 : 26} color={colors.textMuted} />
        {!compact && <Text style={styles.label}>Tap to load photo</Text>}
      </Pressable>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit={contentFit}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.border,
  },
  label: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted },
});
