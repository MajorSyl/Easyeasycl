import { View } from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';

// Official Easyfen brand colors — keep in sync with assets/brand/*.svg if the
// logo ever changes.
const BLUE = '#3E6FBF';
const GOLD = '#B8912E';
const GLASS_DARK = '#1A1A1A';

// The magnifying-glass mark, standing in for the "a" in "easyfen" in the
// wordmark, and used alone (on a rounded square) as the app-icon-style mark.
// Coordinates mirror assets/brand's render script — keep both in sync.
function GlassStroke({ stroke, strokeWidth }: { stroke: string; strokeWidth: number }) {
  return (
    <>
      <Circle cx={205} cy={145} r={68} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      <Line x1={253} y1={193} x2={308} y2={248} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
    </>
  );
}

type LogoProps = {
  /** Rendered width; height follows the wordmark's aspect ratio (or is square for icon-only). */
  size?: number;
  variant?: 'color' | 'white';
  /** false renders just the glass mark on a rounded square (app-icon style), no wordmark text. */
  showWordmark?: boolean;
};

export function Logo({ size = 120, variant = 'color', showWordmark = true }: LogoProps) {
  const isWhite = variant === 'white';

  if (!showWordmark) {
    const bg = isWhite ? 'transparent' : BLUE;
    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 0 1024 1024">
          {!isWhite && <Rect width={1024} height={1024} rx={224} fill={bg} />}
          <Circle cx={440} cy={440} r={230} fill="none" stroke="#FFFFFF" strokeWidth={95} />
          <Line x1={608} y1={608} x2={800} y2={800} stroke="#FFFFFF" strokeWidth={95} strokeLinecap="round" />
        </Svg>
      </View>
    );
  }

  const blueCol = isWhite ? '#FFFFFF' : BLUE;
  const goldCol = isWhite ? '#FFFFFF' : GOLD;
  const glassCol = isWhite ? '#FFFFFF' : GLASS_DARK;
  const height = size * 0.3; // matches the 1000x300 wordmark viewBox ratio

  return (
    <View style={{ width: size, height }}>
      <Svg width={size} height={height} viewBox="0 0 1000 300">
        <SvgText x={0} y={215} fontSize={200} fontWeight="700" fill={blueCol}>
          e
        </SvgText>
        <GlassStroke stroke={glassCol} strokeWidth={30} />
        <SvgText x={335} y={215} fontSize={200} fontWeight="700" fill={blueCol}>
          sy
        </SvgText>
        <SvgText x={585} y={215} fontSize={200} fontWeight="700" fill={goldCol}>
          fen
        </SvgText>
      </Svg>
    </View>
  );
}
