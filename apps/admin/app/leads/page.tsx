import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { createLead } from '../actions';
import { LEAD_STATUSES } from '@/lib/lead-statuses';
import Link from 'next/link';

const STATUS_LABELS: Record<string, string> = {
  not_contacted: 'Not Contacted',
  contacted: 'Contacted',
  interested: 'Interested',
  onboarded: 'Onboarded',
  not_interested: 'Not Interested',
};

const STATUS_BADGE: Record<string, string> = {
  not_contacted: 'badge-gray',
  contacted: 'badge-blue',
  interested: 'badge-amber',
  onboarded: 'badge-green',
  not_interested: 'badge-red',
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sort?: string }>;
}) {
  const { status, sort } = await searchParams;

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const isAdmin = session.user.app_metadata?.is_admin === true ||
    (await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()).data?.is_admin === true;
  if (!isAdmin) redirect('/login');

  const sortByCreated = sort === 'newest';

  let query = supabase
    .from('agent_leads')
    .select('id, name, phone, business_name, status, notes, last_contacted_date, created_at');
  if (status && (LEAD_STATUSES as readonly string[]).includes(status)) {
    query = query.eq('status', status);
  }
  query = sortByCreated
    ? query.order('created_at', { ascending: false })
    : query.order('last_contacted_date', { ascending: false, nullsFirst: false });

  const { data: leads } = await query;

  const filterHref = (s?: string) => {
    const qp = new URLSearchParams();
    if (s) qp.set('status', s);
    if (sort) qp.set('sort', sort);
    const qs = qp.toString();
    return qs ? `/leads?${qs}` : '/leads';
  };
  const sortHref = (s: string) => {
    const qp = new URLSearchParams();
    if (status) qp.set('status', status);
    if (s !== 'last_contacted') qp.set('sort', s);
    const qs = qp.toString();
    return qs ? `/leads?${qs}` : '/leads';
  };

  return (
    <>
      <div className="topbar">
        <h1>Agent Leads <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>({leads?.length ?? 0})</span></h1>
      </div>
      <div className="content">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Add a lead</span>
          </div>
          <form
            action={async (fd: FormData) => {
              'use server';
              await createLead(fd);
            }}
            style={{ padding: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}
          >
            <label style={{ fontSize: 12, fontWeight: 600, color: '#344054' }}>
              Name
              <input name="name" required className="form-input" style={{ marginTop: 4, width: 200 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#344054' }}>
              Phone / WhatsApp
              <input name="phone" required className="form-input" style={{ marginTop: 4, width: 180 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#344054' }}>
              Business name (optional)
              <input name="business_name" className="form-input" style={{ marginTop: 4, width: 200 }} />
            </label>
            <button type="submit" className="btn btn-sm" style={{ background: '#1d4ed8', color: '#fff', border: 'none' }}>
              Add lead
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Link href={filterHref(undefined)} className={`badge ${!status ? 'badge-blue' : 'badge-gray'}`} style={{ textDecoration: 'none' }}>
                All
              </Link>
              {LEAD_STATUSES.map((s) => (
                <Link
                  key={s}
                  href={filterHref(s)}
                  className={`badge ${status === s ? STATUS_BADGE[s] : 'badge-gray'}`}
                  style={{ textDecoration: 'none' }}
                >
                  {STATUS_LABELS[s]}
                </Link>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, fontSize: 12 }}>
              <span className="muted">Sort:</span>
              <Link href={sortHref('last_contacted')} style={{ fontWeight: sortByCreated ? 400 : 700, color: sortByCreated ? '#667085' : '#1d4ed8' }}>
                Last contacted
              </Link>
              <span className="muted">·</span>
              <Link href={sortHref('newest')} style={{ fontWeight: sortByCreated ? 700 : 400, color: sortByCreated ? '#1d4ed8' : '#667085' }}>
                Newest added
              </Link>
            </div>
          </div>
          <div className="overflow-x">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Business</th>
                  <th>Status</th>
                  <th>Last contacted</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {(leads ?? []).map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <Link href={`/leads/${lead.id}`} style={{ fontWeight: 600, color: '#101828', textDecoration: 'none' }}>
                        {lead.name}
                      </Link>
                    </td>
                    <td className="muted">{lead.phone}</td>
                    <td className="muted truncate">{lead.business_name ?? '—'}</td>
                    <td><span className={`badge ${STATUS_BADGE[lead.status]}`}>{STATUS_LABELS[lead.status] ?? lead.status}</span></td>
                    <td className="muted">
                      {lead.last_contacted_date ? new Date(lead.last_contacted_date).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="muted">{new Date(lead.created_at).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!leads?.length && <div className="empty">No leads yet.</div>}
          </div>
        </div>
      </div>
    </>
  );
}
