// Turns raw Supabase/Postgres error text into something a non-technical user
// can act on. Falls back to a generic, still-actionable message rather than
// ever surfacing SQL or API internals.
export function friendlyErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const text = raw.toLowerCase();

  if (!raw) return "Something went wrong. Please try again.";
  if (text.includes('rate_limited')) {
    return "You're doing that too fast. Please wait a few minutes and try again.";
  }
  if (text.includes('duplicate_listing')) {
    return "You've already posted an identical listing recently.";
  }
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
  if (text.includes('launch mode is not active')) {
    return 'This free launch offer just ended. Refresh the page and continue with mobile money payment.';
  }
  if (text.includes('already boosted')) {
    return 'This listing already has an active boost.';
  }
  if (text.includes('subscription already active')) {
    return 'Your agent subscription is already active.';
  }
  if (text.includes('already verified')) {
    return 'Your account is already verified.';
  }
  if (text.includes('already pending review')) {
    return "You already have a payment pending review for this — no need to submit again.";
  }

  return "Something went wrong. Please try again.";
}
