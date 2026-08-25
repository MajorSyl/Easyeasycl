import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors } from '../constants/theme';

// In-house, flat/vector illustrations for the first-run flow (splash +
// onboarding carousel) — no stock art or illustration library, everything
// here is built from react-native-svg primitives using the app's existing
// theme tokens, the same approach components/Logo.tsx already uses.

type IllustrationProps = { width?: number; height?: number };

// A layered-hills-behind-a-skyline silhouette, evoking Freetown's hills and
// coastline without depicting a literal, identifiable place — kept
// abstract enough to render crisply at any size. Used both as the splash
// background (wide, low-key) and standalone on the last onboarding screen.
export function SkylineIllustration({ width = 400, height = 260 }: IllustrationProps) {
  const w = width;
  const h = height;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Defs>
        <LinearGradient id="skySky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.accentSoft} stopOpacity={1} />
          <Stop offset="1" stopColor={colors.background} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill="url(#skySky)" />
      {/* Sun/moon accent */}
      <Circle cx={w * 0.78} cy={h * 0.28} r={h * 0.1} fill={colors.gold} opacity={0.35} />
      {/* Back hill */}
      <Path
        d={`M0 ${h * 0.62} Q ${w * 0.22} ${h * 0.42} ${w * 0.5} ${h * 0.58} T ${w} ${h * 0.5} V ${h} H 0 Z`}
        fill={colors.accentSoft}
        opacity={0.7}
      />
      {/* Front hill */}
      <Path
        d={`M0 ${h * 0.78} Q ${w * 0.3} ${h * 0.6} ${w * 0.62} ${h * 0.74} T ${w} ${h * 0.68} V ${h} H 0 Z`}
        fill={colors.accent}
        opacity={0.18}
      />
      {/* Simple skyline blocks along the base */}
      {[0.08, 0.16, 0.23, 0.34, 0.42, 0.5].map((x, i) => {
        const blockH = h * (0.06 + (i % 3) * 0.03);
        return (
          <Rect
            key={x}
            x={w * x}
            y={h * 0.86 - blockH}
            width={w * 0.045}
            height={blockH}
            fill={colors.textPrimary}
            opacity={0.14}
          />
        );
      })}
      {/* Coastline */}
      <Path
        d={`M0 ${h * 0.9} Q ${w * 0.25} ${h * 0.86} ${w * 0.5} ${h * 0.91} T ${w} ${h * 0.88}`}
        fill="none"
        stroke={colors.accent}
        strokeWidth={2}
        opacity={0.3}
      />
    </Svg>
  );
}

// A simple, iconic silhouette standing in for the Cotton Tree — a wide
// rounded canopy on a single trunk, rendered flat in brand tones rather
// than attempting a literal botanical illustration.
export function CottonTreeIllustration({ width = 220, height = 220 }: IllustrationProps) {
  const w = width;
  const h = height;
  const cx = w / 2;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Circle cx={cx} cy={h * 0.62} r={h * 0.34} fill={colors.accentSoft} />
      <Circle cx={cx - w * 0.16} cy={h * 0.5} r={h * 0.26} fill={colors.accent} opacity={0.85} />
      <Circle cx={cx + w * 0.18} cy={h * 0.48} r={h * 0.24} fill={colors.accent} opacity={0.7} />
      <Circle cx={cx} cy={h * 0.36} r={h * 0.22} fill={colors.gold} opacity={0.55} />
      {/* Trunk + root flare, the Cotton Tree's most recognizable feature */}
      <Path
        d={`M ${cx - w * 0.05} ${h * 0.6} L ${cx - w * 0.09} ${h * 0.94} L ${cx - w * 0.02} ${h * 0.94} L ${cx - w * 0.01} ${h * 0.66} L ${cx + w * 0.01} ${h * 0.66} L ${cx + w * 0.02} ${h * 0.94} L ${cx + w * 0.09} ${h * 0.94} L ${cx + w * 0.05} ${h * 0.6} Z`}
        fill={colors.textPrimary}
        opacity={0.55}
      />
    </Svg>
  );
}

// A wave + palm motif nodding at Lumley Beach / Number 2 River without
// depicting either literally.
export function WaveBeachIllustration({ width = 220, height = 220 }: IllustrationProps) {
  const w = width;
  const h = height;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {/* Palm: curved trunk + a few frond arcs */}
      <Path
        d={`M ${w * 0.72} ${h * 0.9} Q ${w * 0.66} ${h * 0.62} ${w * 0.74} ${h * 0.4}`}
        fill="none"
        stroke={colors.textPrimary}
        strokeWidth={w * 0.02}
        strokeLinecap="round"
        opacity={0.55}
      />
      {[[-1, 0.15], [-0.6, -0.1], [0, -0.22], [0.6, -0.1], [1, 0.15]].map(([dx, dy], i) => (
        <Path
          key={i}
          d={`M ${w * 0.74} ${h * 0.4} Q ${w * (0.74 + dx * 0.22)} ${h * (0.4 + dy - 0.1)} ${w * (0.74 + dx * 0.38)} ${h * (0.4 + dy)}`}
          fill="none"
          stroke={colors.accent}
          strokeWidth={w * 0.018}
          strokeLinecap="round"
          opacity={0.65}
        />
      ))}
      {/* Waves */}
      {[0.68, 0.78, 0.88].map((y, i) => (
        <Path
          key={y}
          d={`M0 ${h * y} Q ${w * 0.12} ${h * (y - 0.03)} ${w * 0.25} ${h * y} T ${w * 0.5} ${h * y} T ${w * 0.75} ${h * y} T ${w} ${h * y}`}
          fill="none"
          stroke={colors.accent}
          strokeWidth={2.5}
          opacity={0.3 + i * 0.15}
        />
      ))}
    </Svg>
  );
}

// Two overlapping speech bubbles for the "message directly" screen.
export function ChatIllustration({ width = 220, height = 220 }: IllustrationProps) {
  const w = width;
  const h = height;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Path
        d={`M ${w * 0.18} ${h * 0.32} h ${w * 0.5} a ${w * 0.06} ${w * 0.06} 0 0 1 ${w * 0.06} ${w * 0.06} v ${h * 0.28} a ${w * 0.06} ${w * 0.06} 0 0 1 -${w * 0.06} ${w * 0.06} H ${w * 0.32} l -${w * 0.09} ${h * 0.09} v -${h * 0.09} h -${w * 0.05} a ${w * 0.06} ${w * 0.06} 0 0 1 -${w * 0.06} -${w * 0.06} v -${h * 0.28} a ${w * 0.06} ${w * 0.06} 0 0 1 ${w * 0.06} -${w * 0.06} Z`}
        fill={colors.accentSoft}
      />
      <Path
        d={`M ${w * 0.42} ${h * 0.46} h ${w * 0.4} a ${w * 0.055} ${w * 0.055} 0 0 1 ${w * 0.055} ${w * 0.055} v ${h * 0.22} a ${w * 0.055} ${w * 0.055} 0 0 1 -${w * 0.055} ${w * 0.055} H ${w * 0.58} l -${w * 0.08} ${h * 0.08} v -${h * 0.08} h -${w * 0.06} a ${w * 0.055} ${w * 0.055} 0 0 1 -${w * 0.055} -${w * 0.055} v -${h * 0.22} a ${w * 0.055} ${w * 0.055} 0 0 1 ${w * 0.055} -${w * 0.055} Z`}
        fill={colors.accent}
      />
      <Circle cx={w * 0.56} cy={h * 0.6} r={w * 0.018} fill="#fff" />
      <Circle cx={w * 0.66} cy={h * 0.6} r={w * 0.018} fill="#fff" />
      <Circle cx={w * 0.76} cy={h * 0.6} r={w * 0.018} fill="#fff" />
    </Svg>
  );
}

// Small rounded-rect card the illustrations sit on inside onboarding, so a
// bare SVG never floats directly on the page background.
export function IllustrationCard({ children, size = 220 }: { children: React.ReactNode; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}
