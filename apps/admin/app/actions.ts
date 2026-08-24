'use server';
import { createClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/require-admin';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  const isAdmin =
    data.user.app_metadata?.is_admin === true ||
    (await supabase.from('profiles').select('is_admin').eq('id', data.user.id).single()).data?.is_admin === true;

  if (!isAdmin) {
    await supabase.auth.signOut();
    return { error: 'This account does not have admin access.' };
  }

  redirect('/');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

const ROLES = ['user', 'agent', 'service_provider', 'hotel_owner'];
const FLAG_FIELDS = ['is_verified', 'is_premium', 'is_active'];
const TABLES = ['listings', 'hotels', 'services'];

export async function updateProfileRole(userId: string, role: string) {
  const supabase = await createClient();
  await requireAdmin(supabase);
  if (!ROLES.includes(role)) throw new Error('Invalid role');
  await supabase.from('profiles').update({ role }).eq('id', userId);
  revalidatePath('/users');
}

const VERIFICATION_TIERS = ['none', 'phone_verified', 'agent_verified', 'id_verified'];

export async function setVerificationTier(userId: string, tier: string) {
  const supabase = await createClient();
  await requireAdmin(supabase);
  if (!VERIFICATION_TIERS.includes(tier)) throw new Error('Invalid verification tier');
  const { error } = await supabase.rpc('admin_set_verification_tier', { target_user_id: userId, tier });
  if (error) throw error;
  revalidatePath('/users');
}

export async function clearProfileFlag(userId: string) {
  const supabase = await createClient();
  await requireAdmin(supabase);
  const { error } = await supabase.rpc('admin_clear_profile_flag', { target_user_id: userId });
  if (error) throw error;
  revalidatePath('/users');
}

export async function toggleListingFlag(
  table: 'listings' | 'hotels' | 'services',
  id: string,
  field: 'is_verified' | 'is_premium' | 'is_active',
  value: boolean
) {
  const supabase = await createClient();
  await requireAdmin(supabase);
  if (!TABLES.includes(table) || !FLAG_FIELDS.includes(field)) throw new Error('Invalid request');
  if (table === 'listings') {
    // listings.is_verified/is_premium/is_active are no longer directly
    // client-writable (an owner could otherwise self-verify or undo a
    // report-triggered suspension) — route through the admin-gated RPC.
    const { error } = await supabase.rpc('admin_set_listing_flags', { item_id: id, [field]: value });
    if (error) throw error;
  } else {
    await supabase.from(table).update({ [field]: value }).eq('id', id);
  }
  revalidatePath('/content');
}

export async function setListingModerationStatus(id: string, status: 'approved' | 'rejected') {
  const supabase = await createClient();
  await requireAdmin(supabase);
  if (status !== 'approved' && status !== 'rejected') throw new Error('Invalid status');
  const { error } = await supabase.rpc('admin_set_listing_flags', { item_id: id, moderation_status: status });
  if (error) throw error;
  revalidatePath('/content');
}

export async function setRequireListingApproval(value: boolean) {
  const supabase = await createClient();
  await requireAdmin(supabase);
  const { error } = await supabase.from('app_settings').update({ require_listing_approval: value }).eq('id', true);
  if (error) throw error;
  revalidatePath('/settings');
  revalidatePath('/content');
}

export async function dismissReport(reportId: string) {
  const supabase = await createClient();
  await requireAdmin(supabase);
  await supabase.from('reports').delete().eq('id', reportId);
  revalidatePath('/reports');
}

export async function reviewPayment(paymentId: string, decision: 'approve' | 'reject', reason?: string) {
  const supabase = await createClient();
  await requireAdmin(supabase);
  if (decision !== 'approve' && decision !== 'reject') throw new Error('Invalid decision');
  const { error } = await supabase.rpc('admin_review_payment', {
    payment_id: paymentId,
    decision,
    reason: reason || null,
  });
  if (error) throw error;
  revalidatePath('/payments');
  revalidatePath('/content');
  revalidatePath('/users');
}

export async function hideReportedItem(
  table: 'listings' | 'hotels' | 'services',
  itemId: string,
  reportId: string
) {
  const supabase = await createClient();
  await requireAdmin(supabase);
  if (!TABLES.includes(table)) throw new Error('Invalid table');
  if (table === 'listings') {
    const { error } = await supabase.rpc('admin_set_listing_flags', { item_id: itemId, is_active: false });
    if (error) throw error;
  } else {
    await supabase.from(table).update({ is_active: false }).eq('id', itemId);
  }
  await supabase.from('reports').delete().eq('id', reportId);
  revalidatePath('/reports');
  revalidatePath('/content');
}
