import { readCache, writeCache } from './offline-cache';

const RECENTLY_VIEWED_KEY = 'easyfen_recently_viewed_v1';
// Enough to fill a couple of scrolls of Home's row without the list (and
// the read/write payload) growing unbounded over a long install.
const MAX_ENTRIES = 20;

// Device-local viewing history, not server-tracked -- there's no per-user
// view log in the database (view_count on a listing is a shared aggregate,
// not who viewed it), so this is the only signal available for a "Recently
// Viewed" row. Most-recent-first; re-viewing a listing moves it back to the
// front rather than leaving a stale duplicate further down the list.
export async function recordListingViewed(listingId: string): Promise<void> {
  const existing = (await readCache<string[]>(RECENTLY_VIEWED_KEY)) ?? [];
  const next = [listingId, ...existing.filter((id) => id !== listingId)].slice(0, MAX_ENTRIES);
  await writeCache(RECENTLY_VIEWED_KEY, next);
}

export async function getRecentlyViewedIds(): Promise<string[]> {
  return (await readCache<string[]>(RECENTLY_VIEWED_KEY)) ?? [];
}
