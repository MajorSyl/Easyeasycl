import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { resolveSupportRequest, reopenSupportRequest } from '../actions';

export default async function SupportRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const isAdmin = session.user.app_metadata?.is_admin === true ||
    (await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()).data?.is_admin === true;
  if (!isAdmin) redirect('/login');

  let query = supabase
    .from('support_requests')
    .select('id, name, email, phone, subject, message, request_call, status, created_at');
  if (status === 'open' || status === 'resolved') {
    query = query.eq('status', status);
  }
  const { data: requests } = await query
    .order('status', { ascending: true })
    .order('created_at', { ascending: false });

  const openCount = (requests ?? []).filter((r) => r.status === 'open').length;

  const filterHref = (s?: string) => (s ? `/support-requests?status=${s}` : '/support-requests');

  return (
    <>
      <div className="topbar">
        <h1>Support Requests <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>({openCount} open)</span></h1>
      </div>
      <div className="content">
        <p className="muted" style={{ marginBottom: 16, maxWidth: 640 }}>
          Messages sent from the app's Contact Support button. "Request a call" means the sender wants a phone call
          back at the number shown, rather than a written reply.
        </p>
        <div className="card">
          <div className="card-header" style={{ gap: 6 }}>
            <a href={filterHref(undefined)} className={`badge ${!status ? 'badge-blue' : 'badge-gray'}`} style={{ textDecoration: 'none' }}>
              All
            </a>
            <a href={filterHref('open')} className={`badge ${status === 'open' ? 'badge-blue' : 'badge-gray'}`} style={{ textDecoration: 'none' }}>
              Open
            </a>
            <a href={filterHref('resolved')} className={`badge ${status === 'resolved' ? 'badge-blue' : 'badge-gray'}`} style={{ textDecoration: 'none' }}>
              Resolved
            </a>
          </div>
          <div className="overflow-x">
            <table>
              <thead>
                <tr>
                  <th>From</th>
                  <th>Subject</th>
                  <th>Message</th>
                  <th>Call?</th>
                  <th>Status</th>
                  <th>Received</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(requests ?? []).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#101828' }}>{r.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{r.email}</div>
                    </td>
                    <td className="truncate" style={{ maxWidth: 160 }}>{r.subject}</td>
                    <td className="truncate" style={{ maxWidth: 280 }}>{r.message}</td>
                    <td className="muted">{r.request_call ? (r.phone || 'yes') : '—'}</td>
                    <td>
                      {r.status === 'resolved' ? (
                        <span className="badge badge-green">Resolved</span>
                      ) : (
                        <span className="badge badge-amber">Open</span>
                      )}
                    </td>
                    <td className="muted">{new Date(r.created_at).toLocaleDateString('en-GB')}</td>
                    <td>
                      {r.status === 'resolved' ? (
                        <form action={async () => {
                          'use server';
                          await reopenSupportRequest(r.id);
                        }}>
                          <button type="submit" className="btn btn-ghost btn-sm">Reopen</button>
                        </form>
                      ) : (
                        <form action={async () => {
                          'use server';
                          await resolveSupportRequest(r.id);
                        }}>
                          <button type="submit" className="btn btn-sm" style={{ background: '#1d4ed8', color: '#fff', border: 'none' }}>
                            Mark resolved
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!requests?.length && <div className="empty">No support requests yet.</div>}
          </div>
        </div>
      </div>
    </>
  );
}
