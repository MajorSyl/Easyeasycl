import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { MilestoneBar } from '@/components/MilestoneBar';

export default async function OverviewPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const isAdmin = session.user.app_metadata?.is_admin === true ||
    (await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()).data?.is_admin === true;
  if (!isAdmin) redirect('/login');

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { count: newUsers },
    { count: activeListings },
    { count: pendingModerationListings },
    { count: suspendedListings },
    { data: activeOwners },
    { count: totalMessages },
    { count: totalReports },
    { count: pendingPayments },
    { count: pendingVerifications },
    { data: appSettings },
    { count: totalLeads },
    { count: onboardedLeads },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('moderation_status', 'approved'),
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('is_active', false).eq('moderation_status', 'approved'),
    supabase.from('listings').select('owner_id').eq('is_active', true).eq('moderation_status', 'approved'),
    supabase.from('messages').select('*', { count: 'exact', head: true }),
    supabase.from('reports').select('*', { count: 'exact', head: true }),
    supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending').neq('purpose', 'agent_verification'),
    supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('purpose', 'agent_verification'),
    supabase.from('app_settings').select('launch_mode_active, launch_mode_listings_target, launch_mode_agents_target').single(),
    supabase.from('agent_leads').select('*', { count: 'exact', head: true }),
    supabase.from('agent_leads').select('*', { count: 'exact', head: true }).eq('status', 'onboarded'),
  ]);

  const activeAgents = new Set((activeOwners ?? []).map((l) => l.owner_id)).size;
  const listingsTarget = appSettings?.launch_mode_listings_target ?? 150;
  const agentsTarget = appSettings?.launch_mode_agents_target ?? 40;
  const listingsPct = Math.min(100, Math.round(((activeListings ?? 0) / listingsTarget) * 100));
  const agentsPct = Math.min(100, Math.round((activeAgents / agentsTarget) * 100));

  const stats = [
    { label: 'Total Users', value: (totalUsers ?? 0).toLocaleString(), sub: `+${newUsers ?? 0} this week` },
    {
      label: 'Listings',
      value: (activeListings ?? 0).toLocaleString(),
      sub: `${pendingModerationListings ?? 0} pending · ${suspendedListings ?? 0} suspended`,
    },
    { label: 'Messages Sent', value: (totalMessages ?? 0).toLocaleString(), sub: 'all time' },
    { label: 'Open Reports', value: (totalReports ?? 0).toLocaleString(), sub: (totalReports ?? 0) > 0 ? '⚠️ needs review' : 'all clear ✓' },
    {
      label: 'Pending Payments',
      value: (pendingPayments ?? 0).toLocaleString(),
      sub: (pendingPayments ?? 0) > 0 ? '⚠️ needs review' : 'all clear ✓',
      href: '/payments',
    },
    {
      label: 'Pending Verifications',
      value: (pendingVerifications ?? 0).toLocaleString(),
      sub: (pendingVerifications ?? 0) > 0 ? '⚠️ needs review' : 'all clear ✓',
      href: '/payments',
    },
  ];

  return (
    <>
      <div className="topbar">
        <h1>Overview</h1>
        <span className="muted" style={{ fontSize: 13 }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>
      <div className="content">
        <div className="stats-grid">
          {stats.map((s) => {
            const card = (
              <div className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            );
            return s.href ? (
              <Link key={s.label} href={s.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                {card}
              </Link>
            ) : (
              <div key={s.label}>{card}</div>
            );
          })}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Launch mode progress</span>
            <Link href="/settings" style={{ fontSize: 12, color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>
              Edit targets →
            </Link>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 12, color: '#667085' }}>
              Launch mode is currently <strong>{appSettings?.launch_mode_active ? 'ON' : 'OFF'}</strong>.
            </p>
            <MilestoneBar label="Active listings" current={activeListings ?? 0} target={listingsTarget} pct={listingsPct} />
            <MilestoneBar label="Distinct owners with an active listing" current={activeAgents} target={agentsTarget} pct={agentsPct} />
            <div style={{ borderTop: '1px solid #ECEEF1', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#344054' }}>
                Agent leads onboarded: {onboardedLeads ?? 0} / {totalLeads ?? 0}
              </span>
              <Link href="/leads" style={{ fontSize: 12, color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>
                View leads →
              </Link>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Getting started</span></div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 13, color: '#667085', lineHeight: 1.6 }}>
              <strong>Users</strong> — search, filter by role, view a user's listings and payment history, and suspend an account if needed.
            </p>
            <p style={{ fontSize: 13, color: '#667085', lineHeight: 1.6 }}>
              <strong>Content</strong> — toggle <em>Verified</em> and <em>Premium</em> badges on any listing. Use <em>Active: OFF</em> to hide spam without deleting.
            </p>
            <p style={{ fontSize: 13, color: '#667085', lineHeight: 1.6 }}>
              <strong>Reports</strong> — review user-submitted reports. One click to hide the offending item or dismiss the report.
            </p>
            <p style={{ fontSize: 13, color: '#667085', lineHeight: 1.6 }}>
              <strong>Payments</strong> — there is no live payment gateway. Every boost/subscription purchase is a mobile money
              reference code plus a screenshot a user submits; check the screenshot and confirm the money actually arrived in
              your Orange Money / Afrimoney account before clicking Approve — approving activates the purchase immediately and
              there is no automated refund if you get it wrong. Verified Agent requests are separate — the agent hasn't paid
              yet at that point, so approving there is a "yes, follow up and collect payment" decision, not a payment
              confirmation.
            </p>
            <p style={{ fontSize: 13, color: '#101828', marginTop: 8 }}>
              <strong>⚙️ To set your account as admin:</strong> Supabase Dashboard → Table Editor → profiles → find your row → set <code style={{ background: '#F3F4F6', padding: '1px 4px', borderRadius: 4 }}>is_admin = true</code>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
