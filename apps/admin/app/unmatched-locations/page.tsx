import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { dismissUnmatchedLocation, reviewUnmatchedLocation } from '../actions';

export default async function UnmatchedLocationsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const isAdmin = session.user.app_metadata?.is_admin === true ||
    (await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()).data?.is_admin === true;
  if (!isAdmin) redirect('/login');

  const { data: rows } = await supabase
    .from('unmatched_locations')
    .select('id, location_text, reviewed, created_at, listing:listings(id, title)')
    .order('reviewed', { ascending: true })
    .order('created_at', { ascending: false });

  const pendingCount = (rows ?? []).filter((r) => !r.reviewed).length;

  return (
    <>
      <div className="topbar">
        <h1>
          Unmatched Locations{' '}
          <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>({pendingCount} pending)</span>
        </h1>
      </div>
      <div className="content">
        <p className="muted" style={{ marginBottom: 16, maxWidth: 640 }}>
          Listings where the agent's typed Location text didn't match any known city/town in the app's Sierra Leone
          lookup list. The listing still saved fine with District/City left blank -- add the area to{' '}
          <code>constants/locations.ts</code> so future listings from there auto-resolve, then mark reviewed.
        </p>
        <div className="card">
          <div className="overflow-x">
            <table>
              <thead>
                <tr>
                  <th>Listing</th>
                  <th>Typed Location</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((r) => (
                  <tr key={r.id}>
                    <td className="truncate">
                      {r.listing ? (r.listing as any).title : <span className="muted">Listing deleted</span>}
                    </td>
                    <td>{r.location_text}</td>
                    <td>
                      {r.reviewed ? (
                        <span className="badge badge-green">Reviewed</span>
                      ) : (
                        <span className="badge badge-amber">Pending</span>
                      )}
                    </td>
                    <td className="muted">{new Date(r.created_at).toLocaleDateString('en-GB')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {!r.reviewed && (
                          <form action={async () => {
                            'use server';
                            await reviewUnmatchedLocation(r.id);
                          }}>
                            <button type="submit" className="btn btn-ghost btn-sm">Mark reviewed</button>
                          </form>
                        )}
                        <form action={async () => {
                          'use server';
                          await dismissUnmatchedLocation(r.id);
                        }}>
                          <button type="submit" className="btn btn-danger btn-sm">Dismiss</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows?.length && <div className="empty">No unmatched locations. All areas resolve ✓</div>}
          </div>
        </div>
      </div>
    </>
  );
}
