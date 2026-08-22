import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { clearProfileFlag, setVerificationTier, updateProfileRole } from '../actions';

const ROLES = ['user', 'agent', 'service_provider', 'hotel_owner'];

const VERIFICATION_LABELS: Record<string, string> = {
  none: 'None',
  phone_verified: 'Phone Verified',
  agent_verified: 'Agent Verified',
  id_verified: 'ID Verified',
};

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const isAdmin = session.user.app_metadata?.is_admin === true ||
    (await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()).data?.is_admin === true;
  if (!isAdmin) redirect('/login');

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, role, business_name, is_admin, created_at, verification_tier, phone_verification_requested_at')
    .order('created_at', { ascending: false });

  const userIds = (users ?? []).map((u) => u.id);
  const { data: phones } = await supabase.rpc('get_profile_phones', { profile_ids: userIds });
  const phoneById = new Map((phones ?? []).map((p: { id: string; phone: string | null }) => [p.id, p.phone]));

  const { data: flags } = await supabase.rpc('admin_get_flagged_status', { profile_ids: userIds });
  const flaggedAtById = new Map(
    (flags ?? [])
      .filter((f: { id: string; flagged_for_review_at: string | null }) => f.flagged_for_review_at)
      .map((f: { id: string; flagged_for_review_at: string | null }) => [f.id, f.flagged_for_review_at])
  );

  return (
    <>
      <div className="topbar">
        <h1>Users <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>({users?.length ?? 0})</span></h1>
      </div>
      <div className="content">
        <div className="card">
          <div className="overflow-x">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Business</th>
                  <th>Phone</th>
                  <th>Joined</th>
                  <th>Flags</th>
                  <th>Reported</th>
                  <th>Verification</th>
                  <th>Change role</th>
                </tr>
              </thead>
              <tbody>
                {(users ?? []).map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.full_name ?? '—'}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{u.id.slice(0, 8)}…</div>
                    </td>
                    <td>
                      <span className={`badge ${roleBadge(u.role)}`}>{u.role}</span>
                    </td>
                    <td className="truncate muted">{u.business_name ?? '—'}</td>
                    <td className="muted">{phoneById.get(u.id) ?? '—'}</td>
                    <td className="muted">{new Date(u.created_at).toLocaleDateString('en-GB')}</td>
                    <td>{u.is_admin ? <span className="badge badge-blue">Admin</span> : '—'}</td>
                    <td>
                      {flaggedAtById.has(u.id) ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                          <span className="badge badge-amber">Flagged</span>
                          <span className="muted" style={{ fontSize: 11 }}>
                            {new Date(flaggedAtById.get(u.id) as string).toLocaleDateString('en-GB')}
                          </span>
                          <form action={async () => { 'use server'; await clearProfileFlag(u.id); }}>
                            <button type="submit" className="btn btn-ghost btn-sm">Clear</button>
                          </form>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                        <span className={`badge ${u.verification_tier === 'none' ? 'badge-gray' : 'badge-green'}`}>
                          {VERIFICATION_LABELS[u.verification_tier] ?? u.verification_tier}
                        </span>
                        {u.verification_tier === 'none' && u.phone_verification_requested_at && (
                          <>
                            <span className="muted" style={{ fontSize: 11 }}>
                              Requested {new Date(u.phone_verification_requested_at).toLocaleDateString('en-GB')}
                            </span>
                            <form action={async () => { 'use server'; await setVerificationTier(u.id, 'phone_verified'); }}>
                              <button type="submit" className="btn btn-sm" style={{ background: '#16a34a', color: '#fff', border: 'none' }}>
                                Verify Phone
                              </button>
                            </form>
                          </>
                        )}
                        {u.verification_tier === 'phone_verified' && (
                          <form action={async () => { 'use server'; await setVerificationTier(u.id, 'none'); }}>
                            <button type="submit" className="btn btn-ghost btn-sm">Revoke</button>
                          </form>
                        )}
                      </div>
                    </td>
                    <td>
                      <form
                        action={async (fd: FormData) => {
                          'use server';
                          await updateProfileRole(
                            fd.get('userId') as string,
                            fd.get('role') as string
                          );
                        }}
                        style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}
                      >
                        <input type="hidden" name="userId" value={u.id} />
                        <select name="role" defaultValue={u.role} className="form-select">
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button type="submit" className="btn btn-ghost btn-sm">Save</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!users?.length && <div className="empty">No users yet.</div>}
          </div>
        </div>
      </div>
    </>
  );
}

function roleBadge(role: string) {
  if (role === 'agent') return 'badge-blue';
  if (role === 'service_provider') return 'badge-amber';
  if (role === 'hotel_owner') return 'badge-green';
  return 'badge-gray';
}
