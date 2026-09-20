import { Ionicons } from '@expo/vector-icons';

const VERIFIED_BLUE = '#1D9BF0';

export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return <Ionicons name="checkmark-circle" size={size} color={VERIFIED_BLUE} />;
}
