// Turns raw Supabase/Postgres error text into something a non-technical user
// can act on. Falls back to a generic, still-actionable message rather than
// ever surfacing SQL or API internals.
export function friendlyErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const text = raw.toLowerCase();

  if (!raw) return "Something went wrong. Please try again.";
  if (text.includes('network') || text.includes('fetch failed') || text.includes('failed to fetch')) {
    return "Couldn't connect. Check your internet connection and try again.";
  }
  if (text.includes('invalid login credentials')) {
    return 'That email and password combination is incorrect.';
  }
  if (text.includes('already registered') || text.includes('user already exists')) {
    return 'An account with that email already exists — try logging in instead.';
  }
  if (text.includes('email not confirmed')) {
    return 'Please confirm your email before logging in.';
  }
  if (text.includes('password') && text.includes('least')) {
    return 'Please use a longer password (at least 6 characters).';
  }
  if (text.includes('row-level security') || text.includes('permission denied')) {
    return "You don't have permission to do that.";
  }
  if (text.includes('duplicate key') || text.includes('already exists')) {
    return 'That already exists.';
  }
  if (text.includes('violates') && text.includes('constraint')) {
    return 'Some of the information provided isn\'t valid. Please check and try again.';
  }

  return "Something went wrong. Please try again.";
}
