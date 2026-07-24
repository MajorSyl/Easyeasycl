import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { dismissReport, hideReportedItem } from '../actions';

type TableName = 'listings' | 'hotels' | 'services';

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const isAdmin = session.user.app_metadata?.is_admin === true ||
    (await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()).data?.is_admin === true;
  if (!isAdmin) redirect('/login');

  const { data: reports } = await supabase
    .from('reports')
    .select('id, item_type, item_id, reason, created_at, reporter:profiles!reporter_id(full_name)')
    .order('created_at', { ascending: false });

  return (
    <>
      <div className="topbar">
        <h1>Reports <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>({reports?.length ?? 0})</span></h1>
      </div>
      <div className="content">
        <div className="card">
          <div className="overflow-x">
            <table>
              <thead>
                <tr>
                  <th>Reporter</th>
                  <th>Type</th>
                  <th>Item ID</th>
                  <th>Reason</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(reports ?? []).map((r) => (
                  <tr key={r.id}>
                    <td>{(r.reporter as any)?.full_name ?? 'Unknown'}</td>
                    <td><span className="badge badge-amber">{r.item_type}</span></td>
                    <td className="muted" style={{ fontSize: 11 }}>{r.item_id.slice(0, 12)}…</td>
                    <td className="truncate muted">{r.reason ?? '—'}</td>
                    <td className="muted">{new Date(r.created_at).toLocaleDateString('en-GB')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {r.item_type !== 'user' && (
                          <form action={async (fd: FormData) => {
                            'use server';
                            await hideReportedItem(
                              fd.get('table') as TableName,
                              fd.get('itemId') as string,
                              fd.get('reportId') as string
                            );
                          }}>
                            <input type="hidden" name="table" value={r.item_type as TableName} />
                            <input type="hidden" name="itemId" value={r.item_id} />
                            <input type="hidden" name="reportId" value={r.id} />
                            <button type="submit" className="btn btn-danger btn-sm">Hide item</button>
                          </form>
                        )}
                        <form action={async (fd: FormData) => {
                          'use server';
                          await dismissReport(fd.get('reportId') as string);
                        }}>
                          <input type="hidden" name="reportId" value={r.id} />
                          <button type="submit" className="btn btn-ghost btn-sm">Dismiss</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!reports?.length && <div className="empty">No reports. All clear ✓</div>}
          </div>
        </div>
      </div>
    </>
  );
}
