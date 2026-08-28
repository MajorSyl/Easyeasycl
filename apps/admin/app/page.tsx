import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AreaChart } from '@/components/AreaChart';
import { PendingListingRow, type PendingListing } from '@/components/PendingListingRow';
import { PaymentQueueRow, type QueuedPayment } from '@/components/PaymentQueueRow';
import { IconHome, IconUsers, IconCard, IconUserCheck, IconSearch, IconBell, IconPin } from '@/components/icons';
import { matchNeighborhood } from '@/lib/neighborhoods';
import { initialsOf } from '@/lib/avatar';
import { relativeTime } from '@/lib/format';

const CATEGORY_LABELS: Record<string, string> = {
  for_rent: 'For Rent',
  for_sale: 'For Sale',
  land: 'Land',
  daily_hourly: 'Daily/Hourly',
};

function growthPct(current: number, baseline: number): number {
  if (baseline <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - baseline) / baseline) * 1000) / 10;
}

export default async function OverviewPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const isAdmin = session.user.app_metadata?.is_admin === true ||
    (await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()).data?.is_admin === true;
  if (!isAdmin) redirect('/login');

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    { data: profiles },
    { data: listingsRaw },
    { data: reportsRaw },
    { data: pendingPayments },
    { count: newPending7d },
    { count: resolved7d },
    { count: newVerification7d },
    { count: resolvedVerification7d },
    { count: totalListingsSubmitted },
  ] = await Promise.all([
    supabase.from('profiles').select('id, full_name, created_at'),
    supabase
      .from('listings')
      .select('id, title, category, location, price, currency, is_active, moderation_status, availability_status, photos, created_at, owner_id, owner:profiles(full_name, role)')
      .order('created_at', { ascending: false }),
    supabase.from('reports').select('item_id').eq('item_type', 'listing'),
    supabase
      .from('payments')
      .select('id, purpose, amount, currency, momo_provider, momo_reference, screenshot_url, notes, submitted_at, user:profiles!user_id(full_name)')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true }),
    supabase.from('payments').select('id', { count: 'exact', head: true }).neq('purpose', 'agent_verification').gte('submitted_at', weekAgo.toISOString()),
    supabase.from('payments').select('id', { count: 'exact', head: true }).neq('purpose', 'agent_verification').neq('status', 'pending').gte('reviewed_at', weekAgo.toISOString()),
    supabase.from('payments').select('id', { count: 'exact', head: true }).eq('purpose', 'agent_verification').gte('submitted_at', weekAgo.toISOString()),
    supabase.from('payments').select('id', { count: 'exact', head: true }).eq('purpose', 'agent_verification').neq('status', 'pending').gte('reviewed_at', weekAgo.toISOString()),
    supabase.from('listings').select('id', { count: 'exact', head: true }),
  ]);

  const allListings = listingsRaw ?? [];
  const allProfiles = profiles ?? [];
  const adminName = allProfiles.find((p) => p.id === session.user.id)?.full_name ?? null;
  const reportedListingIds = new Set((reportsRaw ?? []).map((r) => r.item_id));

  const activeApproved = allListings.filter((l) => l.is_active && l.moderation_status === 'approved' && l.availability_status === 'available');
  const pendingReview = allListings.filter((l) => l.moderation_status === 'pending');
  const rentedSold = allListings.filter((l) => l.availability_status === 'rented' || l.availability_status === 'sold');
  const reportedSuspended = allListings.filter((l) => !l.is_active && l.moderation_status === 'approved' && l.availability_status === 'available');

  const activeListingsBaseline = activeApproved.filter((l) => new Date(l.created_at) <= monthAgo).length;
  const usersBaseline = allProfiles.filter((p) => new Date(p.created_at) <= monthAgo).length;
  const listingsGrowth = growthPct(activeApproved.length, activeListingsBaseline);
  const usersGrowth = growthPct(allProfiles.length, usersBaseline);

  const pendingPaymentsNonVerification = (pendingPayments ?? []).filter((p) => p.purpose !== 'agent_verification');
  const pendingVerification = (pendingPayments ?? []).filter((p) => p.purpose === 'agent_verification');
  const paymentsDelta = (newPending7d ?? 0) - (resolved7d ?? 0);
  const verificationDelta = (newVerification7d ?? 0) - (resolvedVerification7d ?? 0);

  const notifCount = pendingReview.length + pendingPaymentsNonVerification.length + pendingVerification.length + reportedListingIds.size;

  const statCards = [
    {
      label: 'Active Listings',
      sub: 'properties live',
      value: activeApproved.length.toLocaleString(),
      icon: IconHome,
      accent: '#3E6FBF',
      bg: '#E7EEFA',
      trend: listingsGrowth,
      trendGood: 'up' as const,
      trendSuffix: '%',
    },
    {
      label: 'Registered Users',
      sub: 'across all roles',
      value: allProfiles.length.toLocaleString(),
      icon: IconUsers,
      accent: '#0EA5A5',
      bg: '#E3F6F6',
      trend: usersGrowth,
      trendGood: 'up' as const,
      trendSuffix: '%',
    },
    {
      label: 'Pending Payments',
      sub: 'awaiting review',
      value: pendingPaymentsNonVerification.length.toLocaleString(),
      icon: IconCard,
      accent: '#C99A00',
      bg: '#FBF3DC',
      trend: paymentsDelta,
      trendGood: 'down' as const,
      trendSuffix: '',
      href: '/payments',
    },
    {
      label: 'Verification Requests',
      sub: 'agents pending',
      value: pendingVerification.length.toLocaleString(),
      icon: IconUserCheck,
      accent: '#E4483F',
      bg: '#FCE6E4',
      trend: verificationDelta,
      trendGood: 'down' as const,
      trendSuffix: '',
      href: '/payments',
    },
  ];

  // Freetown Neighborhoods: bucketed by substring-matching each listing's
  // free-text location field, the same technique the mobile app's
  // neighborhood browsing uses -- there's no dedicated neighborhood column.
  const neighborhoodCounts = new Map<string, { count: number; newThisWeek: number }>();
  for (const l of activeApproved) {
    const n = matchNeighborhood(l.location);
    if (!n) continue;
    const entry = neighborhoodCounts.get(n) ?? { count: 0, newThisWeek: 0 };
    entry.count += 1;
    if (new Date(l.created_at) >= weekAgo) entry.newThisWeek += 1;
    neighborhoodCounts.set(n, entry);
  }
  const neighborhoods = [...neighborhoodCounts.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const maxNeighborhoodCount = Math.max(1, ...neighborhoods.map((n) => n.count));
  const neighborhoodColors = ['#3E6FBF', '#0EA5A5', '#C99A00', '#7C5CFC', '#E4483F', '#0891B2'];

  // Platform growth: cumulative totals by month, Jan through the current
  // month of this year. Each point counts everything created on or before
  // the end of that month, including anything from before this year --
  // it's a running total, not a per-month new-signups count.
  const year = now.getFullYear();
  const currentMonthIndex = now.getMonth();
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].slice(0, currentMonthIndex + 1);
  const usersCumulative = monthLabels.map((_, i) => {
    const cutoff = new Date(year, i + 1, 0, 23, 59, 59);
    return allProfiles.filter((p) => new Date(p.created_at) <= cutoff).length;
  });
  const listingsCumulative = monthLabels.map((_, i) => {
    const cutoff = new Date(year, i + 1, 0, 23, 59, 59);
    return activeApproved.filter((l) => new Date(l.created_at) <= cutoff).length;
  });

  const monthsElapsed = currentMonthIndex + 1;
  const avgMonthlyUsers = Math.round(allProfiles.filter((p) => new Date(p.created_at) >= new Date(year, 0, 1)).length / monthsElapsed) || 0;
  const newUsersThisMonth = allProfiles.filter((p) => new Date(p.created_at) >= new Date(year, currentMonthIndex, 1)).length;
  const listingCompletionPct = totalListingsSubmitted ? Math.round((activeApproved.length / totalListingsSubmitted) * 100) : 0;
  const activeAgentsCount = new Set(activeApproved.map((l) => l.owner_id)).size;

  const overallGrowthStatus =
    listingsGrowth > 0 && usersGrowth > 0 ? { label: 'Strong growth', tone: 'trend-up' } :
    listingsGrowth < 0 && usersGrowth < 0 ? { label: 'Needs attention', tone: 'trend-down' } :
    { label: 'Steady growth', tone: 'trend-up' };

  const pendingListingRows: PendingListing[] = pendingReview.slice(0, 8).map((l) => {
    const owner = Array.isArray(l.owner) ? l.owner[0] : (l.owner as any);
    return {
      id: l.id,
      title: l.title,
      category: l.category,
      price: l.price,
      photos: l.photos,
      created_at: l.created_at,
      neighborhood: matchNeighborhood(l.location),
      ownerName: owner?.full_name ?? null,
      ownerRole: owner?.role ?? 'user',
    };
  });

  const queuedPayments: QueuedPayment[] = (pendingPayments ?? []).slice(0, 6).map((p) => {
    const user = Array.isArray(p.user) ? p.user[0] : (p.user as any);
    return {
      id: p.id,
      purpose: p.purpose,
      amount: p.amount,
      currency: p.currency,
      momo_provider: p.momo_provider,
      momo_reference: p.momo_reference,
      screenshot_url: p.screenshot_url,
      notes: p.notes,
      submitted_at: p.submitted_at,
      payerName: user?.full_name ?? null,
    };
  });

  function ownerOf(l: (typeof allListings)[number]) {
    return Array.isArray(l.owner) ? (l.owner as any)[0] : (l.owner as any);
  }

  function MiniListingCard({ listing, statusLabel, statusTone }: { listing: (typeof allListings)[number]; statusLabel: string; statusTone: string }) {
    const owner = ownerOf(listing);
    return (
      <div className="mini-listing-card">
        <div className="mini-listing-title">
          <IconPin size={11} />
          <span className="truncate" style={{ maxWidth: 150 }}>{listing.title}</span>
        </div>
        <div className="mini-listing-owner">{owner?.full_name ?? 'Unknown'}</div>
        <div className="mini-listing-foot">
          <span className={`badge ${statusTone}`}>{statusLabel}</span>
          <span className="muted" style={{ fontSize: 10.5 }}>{relativeTime(listing.created_at)}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overview-topbar">
        <div>
          <div className="overview-title">Dashboard Overview</div>
          <div className="overview-subtitle">
            Freetown, Sierra Leone — {now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <div className="overview-topbar-right">
          <form action="/users" method="get" className="topbar-search">
            <IconSearch size={15} />
            <input type="text" name="q" placeholder="Search users…" />
          </form>
          <span className="status-pill-ok">All systems go</span>
          <Link href="/reports" className="topbar-bell" title="Open items across the dashboard">
            <IconBell size={17} />
            {notifCount > 0 && <span className="topbar-bell-badge">{notifCount > 99 ? '99+' : notifCount}</span>}
          </Link>
          <div className="topbar-user">
            <div className="topbar-user-avatar">{initialsOf(adminName)}</div>
            <div>
              <div className="topbar-user-name">{adminName ?? 'Admin'}</div>
              <div className="topbar-user-role">Administrator</div>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="stats-grid">
          {statCards.map((c) => {
            const Icon = c.icon;
            const card = (
              <div className="stat-card-v2" style={{ borderTopColor: c.accent }}>
                <div className="stat-card-v2-head">
                  <div className="stat-card-v2-icon" style={{ background: c.bg, color: c.accent }}>
                    <Icon size={19} />
                  </div>
                  <span className={`trend-pill ${(c.trendGood === 'up') === (c.trend >= 0) ? 'trend-up' : 'trend-down'}`}>
                    {c.trend >= 0 ? '↑' : '↓'} {Math.abs(c.trend)}{c.trendSuffix}
                  </span>
                </div>
                <div className="stat-card-v2-value">{c.value}</div>
                <div className="stat-card-v2-label">{c.label}</div>
                <div className="stat-card-v2-sub">{c.sub}</div>
              </div>
            );
            return c.href ? <Link key={c.label} href={c.href} style={{ textDecoration: 'none' }}>{card}</Link> : <div key={c.label}>{card}</div>;
          })}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <span className="card-title">Listing Pipeline</span>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Real-time moderation status across all properties</div>
            </div>
            <Link href="/listings" style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600 }}>View all listings →</Link>
          </div>
          <div style={{ padding: 20 }}>
            <div className="pipeline-grid">
              <div>
                <div className="pipeline-col-head" style={{ borderColor: '#C99A00' }}>
                  <span className="pipeline-col-title">Pending Review</span>
                  <span className="pipeline-col-count">{pendingReview.length}</span>
                </div>
                <div className="pipeline-cards">
                  {pendingReview.slice(0, 3).map((l) => (
                    <MiniListingCard key={l.id} listing={l} statusLabel={CATEGORY_LABELS[l.category] ?? l.category} statusTone="badge-amber" />
                  ))}
                  {!pendingReview.length && <div className="muted" style={{ fontSize: 12 }}>Nothing pending.</div>}
                </div>
              </div>
              <div>
                <div className="pipeline-col-head" style={{ borderColor: '#3E6FBF' }}>
                  <span className="pipeline-col-title">Active</span>
                  <span className="pipeline-col-count">{activeApproved.length}</span>
                </div>
                <div className="pipeline-cards">
                  {activeApproved.slice(0, 3).map((l) => (
                    <MiniListingCard key={l.id} listing={l} statusLabel={CATEGORY_LABELS[l.category] ?? l.category} statusTone="badge-blue" />
                  ))}
                  {!activeApproved.length && <div className="muted" style={{ fontSize: 12 }}>No active listings yet.</div>}
                </div>
              </div>
              <div>
                <div className="pipeline-col-head" style={{ borderColor: '#16a34a' }}>
                  <span className="pipeline-col-title">Rented / Sold</span>
                  <span className="pipeline-col-count">{rentedSold.length}</span>
                </div>
                <div className="pipeline-cards">
                  {rentedSold.slice(0, 3).map((l) => (
                    <MiniListingCard key={l.id} listing={l} statusLabel={l.availability_status === 'rented' ? 'Rented' : 'Sold'} statusTone="badge-green" />
                  ))}
                  {!rentedSold.length && <div className="muted" style={{ fontSize: 12 }}>None yet.</div>}
                </div>
              </div>
              <div>
                <div className="pipeline-col-head" style={{ borderColor: '#E4483F' }}>
                  <span className="pipeline-col-title">Reported / Suspended</span>
                  <span className="pipeline-col-count">{reportedSuspended.length}</span>
                </div>
                <div className="pipeline-cards">
                  {reportedSuspended.slice(0, 3).map((l) => (
                    <MiniListingCard key={l.id} listing={l} statusLabel={reportedListingIds.has(l.id) ? 'Reported' : 'Suspended'} statusTone="badge-red" />
                  ))}
                  {!reportedSuspended.length && <div className="muted" style={{ fontSize: 12 }}>All clear ✓</div>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(240px, 1fr)', gap: 20, alignItems: 'start' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <span className="card-title">New Listings Pending Review</span>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{pendingReview.length} listings awaiting moderation</div>
              </div>
              <Link href="/listings" style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600 }}>Review all →</Link>
            </div>
            <div>
              {pendingListingRows.map((l) => <PendingListingRow key={l.id} listing={l} />)}
              {!pendingListingRows.length && <div className="empty">No listings waiting on you. All clear ✓</div>}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconPin size={14} /> Freetown Neighborhoods</span>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{activeApproved.length} active listings across all areas</div>
              </div>
            </div>
            <div style={{ padding: '8px 20px 18px' }}>
              {neighborhoods.map((n, i) => (
                <div className="neighborhood-row" key={n.name}>
                  <div className="neighborhood-row-head">
                    <span style={{ fontWeight: 600, color: '#101828' }}>{n.name}</span>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      {n.newThisWeek > 0 && <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 700 }}>+{n.newThisWeek}</span>}
                      <span style={{ fontWeight: 700 }}>{n.count}</span>
                    </span>
                  </div>
                  <div className="neighborhood-bar-track">
                    <div className="neighborhood-bar-fill" style={{ width: `${(n.count / maxNeighborhoodCount) * 100}%`, background: neighborhoodColors[i % neighborhoodColors.length] }} />
                  </div>
                </div>
              ))}
              {!neighborhoods.length && <div className="muted" style={{ fontSize: 12, padding: '12px 0' }}>No active listings with a recognized neighborhood yet.</div>}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <span className="card-title">Payment Review Queue</span>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Orange Money & Afrimoney references to verify</div>
            </div>
            <span className="badge badge-amber">{(pendingPayments ?? []).length} pending</span>
          </div>
          <div>
            {queuedPayments.map((p) => <PaymentQueueRow key={p.id} payment={p} />)}
            {!queuedPayments.length && <div className="empty">No pending payments. All clear ✓</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span className="card-title">Platform Growth</span>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Users & listings on Easyfen, {monthLabels[0]}–{monthLabels[monthLabels.length - 1]} {year}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="badge badge-blue">{allProfiles.length.toLocaleString()} {usersGrowth >= 0 ? '+' : ''}{usersGrowth}%</span>
              <span className="badge" style={{ background: '#FBF3DC', color: '#92400E' }}>{activeApproved.length.toLocaleString()} {listingsGrowth >= 0 ? '+' : ''}{listingsGrowth}%</span>
              <span className={`badge ${overallGrowthStatus.tone === 'trend-up' ? 'badge-green' : 'badge-red'}`}>{overallGrowthStatus.label}</span>
            </div>
          </div>
          <div style={{ padding: '20px 24px' }}>
            <AreaChart
              months={monthLabels}
              seriesA={{ label: 'Registered Users', color: '#3E6FBF', values: usersCumulative }}
              seriesB={{ label: 'Active Listings', color: '#C99A00', values: listingsCumulative }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 20 }}>
              <div className="growth-tile">
                <div className="growth-tile-value">{avgMonthlyUsers.toLocaleString()}</div>
                <div className="growth-tile-label">Avg. Monthly Users</div>
              </div>
              <div className="growth-tile">
                <div className="growth-tile-value" style={{ color: '#16a34a' }}>+{newUsersThisMonth}</div>
                <div className="growth-tile-label">New Users ({monthLabels[monthLabels.length - 1]})</div>
              </div>
              <div className="growth-tile">
                <div className="growth-tile-value" style={{ color: '#C99A00' }}>{listingCompletionPct}%</div>
                <div className="growth-tile-label">Listing Completion</div>
              </div>
              <div className="growth-tile">
                <div className="growth-tile-value">{activeAgentsCount.toLocaleString()}</div>
                <div className="growth-tile-label">Active Agents</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
