import { Image, type ImageStyle } from 'expo-image';
import type { StyleProp } from 'react-native';

// Renders the real brand asset (assets/brand/*.png, exported from the
// official logo file — see assets/brand/source/) rather than an
// approximated vector redraw. A previous version of this component drew
// the wordmark from react-native-svg primitives by hand; that approach is
// retired now that we have the canonical artwork; there's no longer a
// fallback path since these are local bundled assets (require()'d, not
// fetched over the network), so there's no realistic runtime case where
// the real PNG fails to load but a hand-drawn stand-in would still work.
const WORDMARK_COLOR = require('../assets/brand/logo-wordmark.png');
const WORDMARK_WHITE = require('../assets/brand/logo-wordmark-white.png');
const MARK_COLOR = require('../assets/brand/mark-black.png');
const MARK_WHITE = require('../assets/brand/mark-white.png');

// Native aspect ratios of the source crops -- used so callers can pass a
// single `size` (matching the old SVG-based API) and get a correctly
// proportioned image rather than a stretched one.
const WORDMARK_RATIO = 341 / 1069; // height / width
const MARK_RATIO = 214 / 212;

type LogoProps = {
  /** Rendered width; height follows the asset's real aspect ratio. */
  size?: number;
  variant?: 'color' | 'white';
  /** false renders just the glass mark, no wordmark text. */
  showWordmark?: boolean;
  style?: StyleProp<ImageStyle>;
};

export function Logo({ size = 120, variant = 'color', showWordmark = true, style }: LogoProps) {
  const isWhite = variant === 'white';
  const source = showWordmark
    ? isWhite
      ? WORDMARK_WHITE
      : WORDMARK_COLOR
    : isWhite
      ? MARK_WHITE
      : MARK_COLOR;
  const ratio = showWordmark ? WORDMARK_RATIO : MARK_RATIO;

  return (
    <Image
      source={source}
      style={[{ width: size, height: size * ratio }, style]}
      contentFit="contain"
      accessible
      accessibilityLabel="Easyfen"
    />
  );
}
