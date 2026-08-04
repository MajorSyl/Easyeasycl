import type { SupabaseClient } from '@supabase/supabase-js';

// Every admin page already redirects non-admins server-side before
// rendering, but the server actions in actions.ts are independently
// invokable endpoints (Next.js exposes each 'use server' function as its
// own POST target) — they must not rely solely on the RLS policy being
// correct. This is the explicit second gate.
export async function requireAdmin(supabase: SupabaseClient): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const isAdmin =
    session.user.app_metadata?.is_admin === true ||
    (await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()).data?.is_admin === true;

  if (!isAdmin) throw new Error('Not authorized');
  return session.user.id;
}
