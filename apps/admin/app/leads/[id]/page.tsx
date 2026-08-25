import { createClient } from '@/lib/supabase-server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { updateLead } from '../../actions';
import { LEAD_STATUSES } from '@/lib/lead-statuses';

const STATUS_LABELS: Record<string, string> = {
  not_contacted: 'Not Contacted',
  contacted: 'Contacted',
  interested: 'Interested',
  onboarded: 'Onboarded',
  not_interested: 'Not Interested',
};

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const isAdmin = session.user.app_metadata?.is_admin === true ||
    (await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()).data?.is_admin === true;
  if (!isAdmin) redirect('/login');

  const { data: lead } = await supabase
    .from('agent_leads')
    .select('id, name, phone, business_name, status, notes, last_contacted_date, created_at')
    .eq('id', id)
    .single();

  if (!lead) notFound();

  return (
    <>
      <div className="topbar">
        <h1>
          <Link href="/leads" className="muted" style={{ textDecoration: 'none', fontSize: 14 }}>← Agent Leads</Link>
          <br />
          {lead.name}
        </h1>
      </div>
      <div className="content">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Lead details</span>
            <span className="muted" style={{ fontSize: 12 }}>Added {new Date(lead.created_at).toLocaleDateString('en-GB')}</span>
          </div>
          <form
            action={async (fd: FormData) => {
              'use server';
              await updateLead(lead.id, fd);
            }}
            style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}
          >
            <label style={{ fontSize: 12, fontWeight: 600, color: '#344054' }}>
              Name
              <input name="name" defaultValue={lead.name} required className="form-input" style={{ marginTop: 4, width: '100%' }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#344054' }}>
              Phone / WhatsApp
              <input name="phone" defaultValue={lead.phone} required className="form-input" style={{ marginTop: 4, width: '100%' }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#344054' }}>
              Business name (optional)
              <input name="business_name" defaultValue={lead.business_name ?? ''} className="form-input" style={{ marginTop: 4, width: '100%' }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#344054' }}>
              Status
              <select name="status" defaultValue={lead.status} className="form-select" style={{ marginTop: 4, width: '100%', padding: 10 }}>
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#344054' }}>
              Last contacted
              <input
                type="date"
                name="last_contacted_date"
                defaultValue={lead.last_contacted_date ?? ''}
                className="form-input"
                style={{ marginTop: 4, width: '100%' }}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#344054' }}>
              Notes
              <textarea
                name="notes"
                defaultValue={lead.notes ?? ''}
                rows={5}
                style={{ width: '100%', marginTop: 4, padding: 8, fontSize: 13, border: '1px solid #d0d5dd', borderRadius: 6, fontFamily: 'inherit' }}
              />
            </label>
            <button type="submit" className="btn btn-sm" style={{ alignSelf: 'flex-start', background: '#1d4ed8', color: '#fff', border: 'none' }}>
              Save changes
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
