import { StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon, Rect } from 'react-native-svg';
import { colors } from '../constants/theme';

// Same coordinate space as assets/brand/mark-color.svg — keep the two in sync
// if the glyph shape ever changes.
function EMark({ size, fill }: { size: number; fill: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Rect x={210} y={140} width={150} height={744} rx={50} fill={fill} />
      <Polygon points="210,140 820,140 630,364 210,364" fill={fill} />
      <Rect x={210} y={440} width={430} height={140} fill={fill} />
      <Rect x={210} y={680} width={650} height={204} fill={fill} />
    </Svg>
  );
}

type LogoProps = {
  size?: number;
  variant?: 'color' | 'white';
  showWordmark?: boolean;
};

export function Logo({ size = 28, variant = 'color', showWordmark = true }: LogoProps) {
  const isWhite = variant === 'white';
  const textColor = isWhite ? '#FFFFFF' : colors.accent;

  return (
    <View style={styles.row}>
      {isWhite ? (
        <EMark size={size} fill="#FFFFFF" />
      ) : (
        <View style={[styles.markBg, { width: size, height: size, borderRadius: size * 0.22 }]}>
          <EMark size={size * 0.72} fill="#FFFFFF" />
        </View>
      )}
      {showWordmark && (
        <Text style={[styles.wordmark, { fontSize: size * 0.62, color: textColor }]}>Easyfen</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markBg: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
