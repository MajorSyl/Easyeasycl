import { StyleProp } from 'react-native';
import { Image, type ImageContentFit, type ImageStyle } from 'expo-image';

export function LazyPhoto({
  uri,
  style,
  contentFit = 'cover',
  accessibilityLabel,
}: {
  uri: string;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  accessibilityLabel?: string;
}) {
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
