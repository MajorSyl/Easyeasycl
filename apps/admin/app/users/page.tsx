import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { updateProfileRole } from '../actions';

const ROLES = ['user', 'agent', 'service_provider', 'hotel_owner'];

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const isAdmin = session.user.app_metadata?.is_admin === true ||
    (await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()).data?.is_admin === true;
  if (!isAdmin) redirect('/login');

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, business_name, is_admin, created_at')
    .order('created_at', { ascending: false });

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
                    <td className="muted">{u.phone ?? '—'}</td>
                    <td className="muted">{new Date(u.created_at).toLocaleDateString('en-GB')}</td>
                    <td>{u.is_admin ? <span className="badge badge-blue">Admin</span> : '—'}</td>
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
