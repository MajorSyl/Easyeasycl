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

export async function toggleListingFlag(
  table: 'listings' | 'hotels' | 'services',
  id: string,
  field: 'is_verified' | 'is_premium' | 'is_active',
  value: boolean
) {
  const supabase = await createClient();
  await requireAdmin(supabase);
  if (!TABLES.includes(table) || !FLAG_FIELDS.includes(field)) throw new Error('Invalid request');
  await supabase.from(table).update({ [field]: value }).eq('id', id);
  revalidatePath('/content');
}

export async function dismissReport(reportId: string) {
  const supabase = await createClient();
  await requireAdmin(supabase);
  await supabase.from('reports').delete().eq('id', reportId);
  revalidatePath('/reports');
}

export async function hideReportedItem(
  table: 'listings' | 'hotels' | 'services',
  itemId: string,
  reportId: string
) {
  const supabase = await createClient();
  await requireAdmin(supabase);
  if (!TABLES.includes(table)) throw new Error('Invalid table');
  await supabase.from(table).update({ is_active: false }).eq('id', itemId);
  await supabase.from('reports').delete().eq('id', reportId);
  revalidatePath('/reports');
  revalidatePath('/content');
}
