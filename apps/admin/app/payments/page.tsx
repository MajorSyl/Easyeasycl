import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { reviewPayment } from '../actions';
import { VerificationRequestRow } from './VerificationRequestRow';

const PURPOSE_LABELS: Record<string, string> = {
  listing_boost: 'Listing Boost',
  agent_subscription: 'Agent Subscription',
  agent_verification: 'Verified Agent',
};

export default async function PaymentsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const isAdmin = session.user.app_metadata?.is_admin === true ||
    (await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()).data?.is_admin === true;
  if (!isAdmin) redirect('/login');

  const { data: payments } = await supabase
    .from('payments')
    .select('id, purpose, related_listing_id, amount, currency, momo_provider, momo_reference, screenshot_url, notes, status, submitted_at, user:profiles!user_id(full_name)')
    .order('submitted_at', { ascending: false })
    .limit(200);

  // Verification requests never go through the mobile money submission
  // flow and always need the payment-received/terms-met checklist before
  // they can be approved, so pending ones get their own section instead of
  // sitting in the generic one-click Pending review table below. Once
  // reviewed either way, they fold back into the normal Recently reviewed
  // table alongside boost/subscription payments.
  const verificationPending = (payments ?? []).filter((p) => p.purpose === 'agent_verification' && p.status === 'pending');
  const pending = (payments ?? []).filter((p) => p.status === 'pending' && p.purpose !== 'agent_verification');
  const reviewed = (payments ?? []).filter((p) => p.status !== 'pending');

  const listingIds = pending.map((p) => p.related_listing_id).filter(Boolean) as string[];
  const { data: listings } = listingIds.length
    ? await supabase.from('listings').select('id, title').in('id', listingIds)
    : { data: [] };
  const listingTitleById = new Map((listings ?? []).map((l) => [l.id, l.title]));

  function PaymentRow({ p, actionable }: { p: NonNullable<typeof payments>[number]; actionable: boolean }) {
    return (
      <tr key={p.id}>
        <td>
          <div style={{ fontWeight: 600 }}>{(p.user as any)?.full_name ?? 'Unknown'}</div>
          <div className="muted" style={{ fontSize: 11 }}>{new Date(p.submitted_at).toLocaleString('en-GB')}</div>
        </td>
        <td><span className="badge badge-blue">{PURPOSE_LABELS[p.purpose] ?? p.purpose}</span></td>
        <td className="muted truncate">
          {p.related_listing_id ? listingTitleById.get(p.related_listing_id) ?? p.related_listing_id.slice(0, 8) : '—'}
        </td>
        <td style={{ fontWeight: 600 }}>{p.currency} {Number(p.amount).toLocaleString('en-US')}</td>
        <td className="muted">
          {p.momo_provider === 'orange_money' ? 'Orange Money' : p.momo_provider === 'africell_money' ? 'Afrimoney' : '—'}
        </td>
        <td className="muted" style={{ fontFamily: 'monospace' }}>{p.momo_reference ?? '—'}</td>
        <td>
          {p.screenshot_url ? (
            <a href={p.screenshot_url} target="_blank" rel="noopener noreferrer">
              <img
                src={p.screenshot_url}
                alt="Payment screenshot"
                style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #E4E7EC' }}
              />
            </a>
          ) : (
            <span className="muted" style={{ fontSize: 11 }}>None</span>
          )}
        </td>
        <td className="muted truncate">{p.notes ?? '—'}</td>
        <td>
          {p.status === 'pending' ? (
            <span className="badge badge-amber">Pending</span>
          ) : p.status === 'approved' ? (
            <span className="badge badge-green">Approved</span>
          ) : (
            <span className="badge badge-gray">Rejected</span>
          )}
        </td>
        {actionable && (
          <td>
            <div style={{ display: 'flex', gap: 6 }}>
              <form action={async () => { 'use server'; await reviewPayment(p.id, 'approve'); }}>
                <button type="submit" className="btn btn-sm" style={{ background: '#16a34a', color: '#fff', border: 'none' }}>
                  Approve
                </button>
              </form>
              <form
                action={async (fd: FormData) => {
                  'use server';
                  await reviewPayment(p.id, 'reject', (fd.get('reason') as string) || 'Reference could not be verified');
                }}
                style={{ display: 'inline-flex', gap: 6 }}
              >
                <input
                  type="text"
                  name="reason"
                  placeholder="Rejection reason"
                  className="form-select"
                  style={{ width: 140 }}
                />
                <button type="submit" className="btn btn-danger btn-sm">Reject</button>
              </form>
            </div>
          </td>
        )}
      </tr>
    );
  }

  return (
    <>
      <div className="topbar">
        <h1>
          Payments{' '}
          <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>
            ({pending.length + verificationPending.length} pending)
          </span>
        </h1>
      </div>
      <div className="content">
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              Verification Requests <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>({verificationPending.length} pending)</span>
            </span>
          </div>
          <div className="overflow-x">
            <table>
              <thead>
                <tr>
                  <th>Requested by</th>
                  <th>Amount</th>
                  <th>Notes</th>
                  <th>Checklist</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {verificationPending.map((p) => (
                  <VerificationRequestRow key={p.id} payment={p} />
                ))}
              </tbody>
            </table>
            {!verificationPending.length && <div className="empty">No pending verification requests.</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Pending review</span>
          </div>
          <div className="overflow-x">
            <table>
              <thead>
                <tr>
                  <th>Payer</th>
                  <th>Purpose</th>
                  <th>Listing</th>
                  <th>Amount</th>
                  <th>Provider</th>
                  <th>Reference</th>
                  <th>Screenshot</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <PaymentRow key={p.id} p={p} actionable />
                ))}
              </tbody>
            </table>
            {!pending.length && <div className="empty">No pending payments.</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Recently reviewed</span>
          </div>
          <div className="overflow-x">
            <table>
              <thead>
                <tr>
                  <th>Payer</th>
                  <th>Purpose</th>
                  <th>Listing</th>
                  <th>Amount</th>
                  <th>Provider</th>
                  <th>Reference</th>
                  <th>Screenshot</th>
                  <th>Notes</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reviewed.slice(0, 50).map((p) => (
                  <PaymentRow key={p.id} p={p} actionable={false} />
                ))}
              </tbody>
            </table>
            {!reviewed.length && <div className="empty">Nothing reviewed yet.</div>}
          </div>
        </div>
      </div>
    </>
  );
}
