import { View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

// Official Easyfen brand colors — keep in sync with assets/brand/*.svg if the
// logo ever changes.
const BLUE = '#3E6FBF';
const GOLD = '#B8912E';
const GLASS_DARK = '#1A1A1A';

// The magnifying-glass mark: lens + a short 45deg handle + a subtle inset
// shine arc for dimensionality. Stands in for the "a" in "easyfen" in the
// wordmark, and alone (on a rounded square) as the app-icon-style mark.
// Geometry mirrors assets/brand's render script — keep both in sync.
function GlassMark({
  stroke,
  cx,
  cy,
  r,
  strokeWidth,
  shineOpacity = 0.5,
}: {
  stroke: string;
  cx: number;
  cy: number;
  r: number;
  strokeWidth: number;
  shineOpacity?: number;
}) {
  const angle = Math.PI / 4;
  const hx1 = cx + r * Math.cos(angle);
  const hy1 = cy + r * Math.sin(angle);
  const handleLen = r * 0.62;
  const hx2 = hx1 + handleLen * Math.cos(angle);
  const hy2 = hy1 + handleLen * Math.sin(angle);

  const shineR = r * 0.62;
  const a1 = (200 * Math.PI) / 180;
  const a2 = (270 * Math.PI) / 180;
  const sx1 = cx + shineR * Math.cos(a1);
  const sy1 = cy + shineR * Math.sin(a1);
  const sx2 = cx + shineR * Math.cos(a2);
  const sy2 = cy + shineR * Math.sin(a2);

  return (
    <>
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      <Path
        d={`M ${sx1} ${sy1} A ${shineR} ${shineR} 0 0 1 ${sx2} ${sy2}`}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth * 0.42}
        strokeLinecap="round"
        opacity={shineOpacity}
      />
      <Line x1={hx1} y1={hy1} x2={hx2} y2={hy2} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
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
    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 0 1024 1024">
          {!isWhite && <Rect width={1024} height={1024} rx={224} fill={BLUE} />}
          <GlassMark stroke="#FFFFFF" cx={440} cy={430} r={215} strokeWidth={78} />
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
        <GlassMark stroke={glassCol} cx={205} cy={145} r={68} strokeWidth={30} shineOpacity={0.55} />
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
