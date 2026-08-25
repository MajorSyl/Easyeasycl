import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { clearProfileFlag, setVerificationTier, updateProfileRole, setUserSuspended } from '../actions';

const ROLES = ['user', 'landlord', 'agent', 'agency'];

const VERIFICATION_LABELS: Record<string, string> = {
  none: 'None',
  phone_verified: 'Phone Verified',
  agent_verified: 'Agent Verified',
  id_verified: 'ID Verified',
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const { q, role } = await searchParams;

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const isAdmin = session.user.app_metadata?.is_admin === true ||
    (await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()).data?.is_admin === true;
  if (!isAdmin) redirect('/login');

  let query = supabase
    .from('profiles')
    .select('id, full_name, role, business_name, is_admin, created_at, verification_tier, phone_verification_requested_at, suspended_at, suspended_reason')
    .order('created_at', { ascending: false });

  if (q?.trim()) {
    const term = q.trim();
    query = query.or(`full_name.ilike.%${term}%,business_name.ilike.%${term}%`);
  }
  if (role && ROLES.includes(role)) {
    query = query.eq('role', role);
  }

  const { data: users } = await query;

  const userIds = (users ?? []).map((u) => u.id);
  const { data: phones } = await supabase.rpc('get_profile_phones', { profile_ids: userIds });
  const phoneById = new Map<string, string | null>(
    (phones ?? []).map((p: { id: string; phone: string | null }) => [p.id, p.phone])
  );

  const { data: flags } = await supabase.rpc('admin_get_flagged_status', { profile_ids: userIds });
  const flaggedAtById = new Map(
    (flags ?? [])
      .filter((f: { id: string; flagged_for_review_at: string | null }) => f.flagged_for_review_at)
      .map((f: { id: string; flagged_for_review_at: string | null }) => [f.id, f.flagged_for_review_at])
  );

  const filterHref = (r?: string) => {
    const qp = new URLSearchParams();
    if (q) qp.set('q', q);
    if (r) qp.set('role', r);
    const qs = qp.toString();
    return qs ? `/users?${qs}` : '/users';
  };

  return (
    <>
      <div className="topbar">
        <h1>Users <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>({users?.length ?? 0})</span></h1>
      </div>
      <div className="content">
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
            <form action="/users" method="get" style={{ display: 'flex', gap: 6 }}>
              {role && <input type="hidden" name="role" value={role} />}
              <input
                type="text"
                name="q"
                defaultValue={q ?? ''}
                placeholder="Search by name or business..."
                className="form-select"
                style={{ width: 220, padding: '6px 10px' }}
              />
              <button type="submit" className="btn btn-ghost btn-sm">Search</button>
            </form>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Link href={filterHref(undefined)} className={`badge ${!role ? 'badge-blue' : 'badge-gray'}`} style={{ textDecoration: 'none' }}>
                All roles
              </Link>
              {ROLES.map((r) => (
                <Link key={r} href={filterHref(r)} className={`badge ${role === r ? 'badge-blue' : 'badge-gray'}`} style={{ textDecoration: 'none' }}>
                  {r}
                </Link>
              ))}
            </div>
          </div>
          <div className="overflow-x">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Business</th>
                  <th>Phone</th>
                  <th>Joined</th>
                  <th>Admin</th>
                  <th>Reported</th>
                  <th>Verification</th>
                  <th>Status</th>
                  <th>Change role</th>
                </tr>
              </thead>
              <tbody>
                {(users ?? []).map((u) => (
                  <tr key={u.id}>
                    <td>
                      <Link href={`/users/${u.id}`} style={{ fontWeight: 600, color: '#101828', textDecoration: 'none' }}>
                        {u.full_name ?? '—'}
                      </Link>
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
                      {u.suspended_at ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                          <span className="badge badge-red">Suspended</span>
                          <span className="muted" style={{ fontSize: 11 }}>
                            {new Date(u.suspended_at).toLocaleDateString('en-GB')}
                          </span>
                          <form action={async () => { 'use server'; await setUserSuspended(u.id, false); }}>
                            <button type="submit" className="btn btn-sm" style={{ background: '#16a34a', color: '#fff', border: 'none' }}>
                              Unsuspend
                            </button>
                          </form>
                        </div>
                      ) : (
                        <form
                          action={async (fd: FormData) => {
                            'use server';
                            await setUserSuspended(u.id, true, (fd.get('reason') as string) || null);
                          }}
                          style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}
                        >
                          <input
                            type="text"
                            name="reason"
                            placeholder="Reason (optional)"
                            className="form-select"
                            style={{ width: 140 }}
                          />
                          <button type="submit" className="btn btn-danger btn-sm">Suspend</button>
                        </form>
                      )}
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
            {!users?.length && <div className="empty">No users match.</div>}
          </div>
        </div>
      </div>
    </>
  );
}

function roleBadge(role: string) {
  if (role === 'agent') return 'badge-blue';
  if (role === 'landlord') return 'badge-amber';
  if (role === 'agency') return 'badge-green';
  return 'badge-gray';
}
