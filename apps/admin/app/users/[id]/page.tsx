import { createClient } from '@/lib/supabase-server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { setUserSuspended, setVerificationTier } from '../../actions';
import { formatListingPrice } from '@/lib/format';

const VERIFICATION_LABELS: Record<string, string> = {
  none: 'None',
  phone_verified: 'Phone Verified',
  agent_verified: 'Agent Verified',
  id_verified: 'ID Verified',
};

const PURPOSE_LABELS: Record<string, string> = {
  listing_boost: 'Listing Boost',
  agent_subscription: 'Agent Subscription',
  agent_verification: 'Verified Agent',
};

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const isAdmin = session.user.app_metadata?.is_admin === true ||
    (await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()).data?.is_admin === true;
  if (!isAdmin) redirect('/login');

  const { data: user } = await supabase
    .from('profiles')
    .select('id, full_name, role, business_name, is_admin, created_at, verification_tier, phone_verification_requested_at, suspended_at, suspended_reason, flagged_for_review_at')
    .eq('id', id)
    .single();

  if (!user) notFound();

  const { data: phones } = await supabase.rpc('get_profile_phones', { profile_ids: [id] });
  const phone = phones?.[0]?.phone ?? null;

  const [{ data: listings }, { data: payments }] = await Promise.all([
    supabase
      .from('listings')
      .select('id, title, price, currency, is_active, is_premium, moderation_status, availability_status, created_at')
      .eq('owner_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('payments')
      .select('id, purpose, amount, currency, status, submitted_at')
      .eq('user_id', id)
      .order('submitted_at', { ascending: false }),
  ]);

  return (
    <>
      <div className="topbar">
        <h1>
          <Link href="/users" className="muted" style={{ textDecoration: 'none', fontSize: 14 }}>← Users</Link>
          <br />
          {user.full_name ?? 'Unnamed user'}
        </h1>
      </div>
      <div className="content">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Profile</span>
            {user.suspended_at ? <span className="badge badge-red">Suspended</span> : <span className="badge badge-green">Active</span>}
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
            <Row label="Role" value={<span className={`badge ${roleBadge(user.role)}`}>{user.role}</span>} />
            <Row label="Business name" value={user.business_name ?? '—'} />
            <Row label="Phone" value={phone ?? '—'} />
            <Row label="Joined" value={new Date(user.created_at).toLocaleDateString('en-GB')} />
            <Row label="Admin" value={user.is_admin ? 'Yes' : 'No'} />
            <Row
              label="Verification"
              value={
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`badge ${user.verification_tier === 'none' ? 'badge-gray' : 'badge-green'}`}>
                    {VERIFICATION_LABELS[user.verification_tier] ?? user.verification_tier}
                  </span>
                  {user.verification_tier === 'none' && user.phone_verification_requested_at && (
                    <form action={async () => { 'use server'; await setVerificationTier(user.id, 'phone_verified'); }}>
                      <button type="submit" className="btn btn-sm" style={{ background: '#16a34a', color: '#fff', border: 'none' }}>
                        Verify Phone
                      </button>
                    </form>
                  )}
                </div>
              }
            />
            <Row label="Flagged for review" value={user.flagged_for_review_at ? new Date(user.flagged_for_review_at).toLocaleDateString('en-GB') : 'No'} />

            <div style={{ borderTop: '1px solid #ECEEF1', marginTop: 8, paddingTop: 14 }}>
              {user.suspended_at ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                  <span className="muted" style={{ fontSize: 12 }}>
                    Suspended {new Date(user.suspended_at).toLocaleDateString('en-GB')}
                    {user.suspended_reason ? ` — ${user.suspended_reason}` : ''}
                  </span>
                  <form action={async () => { 'use server'; await setUserSuspended(user.id, false); }}>
                    <button type="submit" className="btn btn-sm" style={{ background: '#16a34a', color: '#fff', border: 'none' }}>
                      Unsuspend account
                    </button>
                  </form>
                </div>
              ) : (
                <form
                  action={async (fd: FormData) => {
                    'use server';
                    await setUserSuspended(user.id, true, (fd.get('reason') as string) || null);
                  }}
                  style={{ display: 'flex', gap: 8, alignItems: 'center' }}
                >
                  <input
                    type="text"
                    name="reason"
                    placeholder="Reason for suspension (optional)"
                    className="form-select"
                    style={{ width: 260, padding: '6px 10px' }}
                  />
                  <button type="submit" className="btn btn-danger btn-sm">Suspend account</button>
                </form>
              )}
              <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
                Suspending blocks the account from logging in (they can't get a new session) and deactivates all of their
                currently active listings. It does not delete anything.
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Listings ({listings?.length ?? 0})</span>
          </div>
          <div className="overflow-x">
            <table>
              <thead>
                <tr><th>Title</th><th>Price</th><th>Moderation</th><th>Availability</th><th>Active</th><th>Posted</th></tr>
              </thead>
              <tbody>
                {(listings ?? []).map((l) => (
                  <tr key={l.id}>
                    <td className="truncate" style={{ fontWeight: 600 }}>{l.title}{l.is_premium && ' ⭐'}</td>
                    <td className="muted">{formatListingPrice(l.price, l.currency)}</td>
                    <td>
                      {l.moderation_status === 'pending' ? (
                        <span className="badge badge-amber">Pending</span>
                      ) : l.moderation_status === 'rejected' ? (
                        <span className="badge badge-gray">Rejected</span>
                      ) : (
                        <span className="badge badge-green">Approved</span>
                      )}
                    </td>
                    <td>
                      {l.availability_status === 'available' ? (
                        <span className="muted">—</span>
                      ) : (
                        <span className="badge badge-gray">{l.availability_status}</span>
                      )}
                    </td>
                    <td>{l.is_active ? <span className="badge badge-green">ON</span> : <span className="badge badge-gray">OFF</span>}</td>
                    <td className="muted">{new Date(l.created_at).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!listings?.length && <div className="empty">No listings.</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Payment history ({payments?.length ?? 0})</span>
          </div>
          <div className="overflow-x">
            <table>
              <thead>
                <tr><th>Purpose</th><th>Amount</th><th>Status</th><th>Submitted</th></tr>
              </thead>
              <tbody>
                {(payments ?? []).map((p) => (
                  <tr key={p.id}>
                    <td><span className="badge badge-blue">{PURPOSE_LABELS[p.purpose] ?? p.purpose}</span></td>
                    <td style={{ fontWeight: 600 }}>{p.currency} {Number(p.amount).toLocaleString('en-US')}</td>
                    <td>
                      {p.status === 'pending' ? (
                        <span className="badge badge-amber">Pending</span>
                      ) : p.status === 'approved' ? (
                        <span className="badge badge-green">Approved</span>
                      ) : (
                        <span className="badge badge-gray">Rejected</span>
                      )}
                    </td>
                    <td className="muted">{new Date(p.submitted_at).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!payments?.length && <div className="empty">No payments.</div>}
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span className="muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function roleBadge(role: string) {
  if (role === 'agent') return 'badge-blue';
  if (role === 'landlord') return 'badge-amber';
  if (role === 'agency') return 'badge-green';
  return 'badge-gray';
}
