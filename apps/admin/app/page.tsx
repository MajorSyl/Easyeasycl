import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

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
    { count: totalListings },
    { count: totalHotels },
    { count: totalServices },
    { count: totalMessages },
    { count: totalReports },
    { count: pendingPayments },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabase.from('listings').select('*', { count: 'exact', head: true }),
    supabase.from('hotels').select('*', { count: 'exact', head: true }),
    supabase.from('services').select('*', { count: 'exact', head: true }),
    supabase.from('messages').select('*', { count: 'exact', head: true }),
    supabase.from('reports').select('*', { count: 'exact', head: true }),
    supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  const totalContent = (totalListings ?? 0) + (totalHotels ?? 0) + (totalServices ?? 0);

  const stats = [
    { label: 'Total Users', value: (totalUsers ?? 0).toLocaleString(), sub: `+${newUsers ?? 0} this week` },
    { label: 'Properties / Hotels / Services', value: totalContent.toLocaleString(), sub: `${totalListings ?? 0} · ${totalHotels ?? 0} · ${totalServices ?? 0}` },
    { label: 'Messages Sent', value: (totalMessages ?? 0).toLocaleString(), sub: 'all time' },
    { label: 'Open Reports', value: (totalReports ?? 0).toLocaleString(), sub: (totalReports ?? 0) > 0 ? '⚠️ needs review' : 'all clear ✓' },
    { label: 'Pending Payments', value: (pendingPayments ?? 0).toLocaleString(), sub: (pendingPayments ?? 0) > 0 ? '⚠️ needs review' : 'all clear ✓' },
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
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Getting started</span></div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 13, color: '#667085', lineHeight: 1.6 }}>
              <strong>Users</strong> — view all registered accounts, change roles, and see who signed up this week.
            </p>
            <p style={{ fontSize: 13, color: '#667085', lineHeight: 1.6 }}>
              <strong>Content</strong> — toggle <em>Verified</em> and <em>Premium</em> badges on any listing, hotel or service. Use <em>Active: OFF</em> to hide spam without deleting.
            </p>
            <p style={{ fontSize: 13, color: '#667085', lineHeight: 1.6 }}>
              <strong>Reports</strong> — review user-submitted reports. One click to hide the offending item or dismiss the report.
            </p>
            <p style={{ fontSize: 13, color: '#667085', lineHeight: 1.6 }}>
              <strong>Payments</strong> — there is no live payment gateway. Every boost/subscription/verification
              purchase is a mobile money reference code a user submits; check it actually arrived in your Orange
              Money / Africell Money account before clicking Approve — approving activates the purchase immediately
              and there is no automated refund if you get it wrong.
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
