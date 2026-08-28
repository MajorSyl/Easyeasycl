// Shared avatar helpers -- initials from a name, and a deterministic color
// picked from a small palette so the same person/listing always gets the
// same color across renders without needing to store one anywhere.
const PALETTE = ['#3E6FBF', '#7C5CFC', '#0EA5A5', '#C99A00', '#E4483F', '#0891B2'];

export function initialsOf(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}
