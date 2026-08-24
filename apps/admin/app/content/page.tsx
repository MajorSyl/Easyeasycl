import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { toggleListingFlag, setListingModerationStatus } from '../actions';

type TableName = 'listings' | 'hotels' | 'services';

export default async function ContentPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const isAdmin = session.user.app_metadata?.is_admin === true ||
    (await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()).data?.is_admin === true;
  if (!isAdmin) redirect('/login');

  const [{ data: listings }, { data: hotels }, { data: services }] = await Promise.all([
    supabase.from('listings').select('id, title, category, location, is_verified, is_premium, is_active, moderation_status, created_at, owner:profiles(full_name)').order('created_at', { ascending: false }),
    supabase.from('hotels').select('id, name, location, is_verified, is_premium, is_active, created_at, owner:profiles(full_name)').order('created_at', { ascending: false }),
    supabase.from('services').select('id, business_name, category, location, is_verified, is_premium, is_active, created_at, owner:profiles(full_name)').order('created_at', { ascending: false }),
  ]);

  const pendingListings = (listings ?? []).filter((l) => l.moderation_status === 'pending');

  function ToggleForm({ table, id, field, value, label }: { table: TableName; id: string; field: 'is_verified' | 'is_premium' | 'is_active'; value: boolean; label: string }) {
    return (
      <form
        action={async (fd: FormData) => {
          'use server';
          await toggleListingFlag(
            fd.get('table') as TableName,
            fd.get('id') as string,
            fd.get('field') as 'is_verified' | 'is_premium' | 'is_active',
            fd.get('value') === 'true'
          );
        }}
        style={{ display: 'inline' }}
      >
        <input type="hidden" name="table" value={table} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="field" value={field} />
        <input type="hidden" name="value" value={String(!value)} />
        <button
          type="submit"
          className={`badge ${value ? 'badge-green' : 'badge-gray'}`}
          style={{ border: 'none', cursor: 'pointer' }}
          title={`Click to toggle ${label}`}
        >
          {label}: {value ? 'ON' : 'OFF'}
        </button>
      </form>
    );
  }

  return (
    <>
      <div className="topbar"><h1>Content</h1></div>
      <div className="content">

        {pendingListings.length > 0 && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Pending listings ({pendingListings.length})</span>
            </div>
            <div className="overflow-x">
              <table>
                <thead>
                  <tr><th>Title</th><th>Category</th><th>Location</th><th>Owner</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {pendingListings.map((l) => (
                    <tr key={l.id}>
                      <td className="truncate" style={{ fontWeight: 600 }}>{l.title}</td>
                      <td><span className="badge badge-gray">{l.category}</span></td>
                      <td className="muted truncate">{l.location}</td>
                      <td className="muted">{(l.owner as any)?.full_name ?? '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <form action={async () => { 'use server'; await setListingModerationStatus(l.id, 'approved'); }}>
                            <button type="submit" className="btn btn-sm" style={{ background: '#16a34a', color: '#fff', border: 'none' }}>
                              Approve
                            </button>
                          </form>
                          <form action={async () => { 'use server'; await setListingModerationStatus(l.id, 'rejected'); }}>
                            <button type="submit" className="btn btn-danger btn-sm">Reject</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <span className="card-title">Properties ({listings?.length ?? 0})</span>
          </div>
          <div className="overflow-x">
            <table>
              <thead>
                <tr><th>Title</th><th>Category</th><th>Location</th><th>Owner</th><th>Moderation</th><th>Verified</th><th>Premium</th><th>Active</th></tr>
              </thead>
              <tbody>
                {(listings ?? []).map((l) => (
                  <tr key={l.id}>
                    <td className="truncate" style={{ fontWeight: 600 }}>{l.title}</td>
                    <td><span className="badge badge-gray">{l.category}</span></td>
                    <td className="muted truncate">{l.location}</td>
                    <td className="muted">{(l.owner as any)?.full_name ?? '—'}</td>
                    <td>
                      {l.moderation_status === 'pending' ? (
                        <span className="badge badge-amber">Pending</span>
                      ) : l.moderation_status === 'rejected' ? (
                        <span className="badge badge-gray">Rejected</span>
                      ) : (
                        <span className="badge badge-green">Approved</span>
                      )}
                    </td>
                    <td><ToggleForm table="listings" id={l.id} field="is_verified" value={l.is_verified} label="Verified" /></td>
                    <td><ToggleForm table="listings" id={l.id} field="is_premium" value={l.is_premium} label="Premium" /></td>
                    <td><ToggleForm table="listings" id={l.id} field="is_active" value={l.is_active} label="Active" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!listings?.length && <div className="empty">No listings yet.</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Hotels ({hotels?.length ?? 0})</span>
          </div>
          <div className="overflow-x">
            <table>
              <thead>
                <tr><th>Name</th><th>Location</th><th>Owner</th><th>Verified</th><th>Premium</th><th>Active</th></tr>
              </thead>
              <tbody>
                {(hotels ?? []).map((h) => (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 600 }}>{h.name}</td>
                    <td className="muted truncate">{h.location}</td>
                    <td className="muted">{(h.owner as any)?.full_name ?? '—'}</td>
                    <td><ToggleForm table="hotels" id={h.id} field="is_verified" value={h.is_verified} label="Verified" /></td>
                    <td><ToggleForm table="hotels" id={h.id} field="is_premium" value={h.is_premium} label="Premium" /></td>
                    <td><ToggleForm table="hotels" id={h.id} field="is_active" value={h.is_active} label="Active" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!hotels?.length && <div className="empty">No hotels yet.</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Services ({services?.length ?? 0})</span>
          </div>
          <div className="overflow-x">
            <table>
              <thead>
                <tr><th>Business</th><th>Category</th><th>Location</th><th>Owner</th><th>Verified</th><th>Premium</th><th>Active</th></tr>
              </thead>
              <tbody>
                {(services ?? []).map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.business_name}</td>
                    <td><span className="badge badge-gray">{s.category}</span></td>
                    <td className="muted truncate">{s.location}</td>
                    <td className="muted">{(s.owner as any)?.full_name ?? '—'}</td>
                    <td><ToggleForm table="services" id={s.id} field="is_verified" value={s.is_verified} label="Verified" /></td>
                    <td><ToggleForm table="services" id={s.id} field="is_premium" value={s.is_premium} label="Premium" /></td>
                    <td><ToggleForm table="services" id={s.id} field="is_active" value={s.is_active} label="Active" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!services?.length && <div className="empty">No services yet.</div>}
          </div>
        </div>

      </div>
    </>
  );
}
