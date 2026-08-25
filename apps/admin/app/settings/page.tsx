import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { MilestoneBar } from '@/components/MilestoneBar';
import { setRequireListingApproval, setLaunchModeActive, updateLaunchModeDetails } from '../actions';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const isAdmin = session.user.app_metadata?.is_admin === true ||
    (await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()).data?.is_admin === true;
  if (!isAdmin) redirect('/login');

  const [{ data: appSettings }, { count: activeListingsCount }, { data: activeOwners }, { count: totalLeadsCount }, { count: onboardedLeadsCount }] = await Promise.all([
    supabase
      .from('app_settings')
      .select('require_listing_approval, launch_mode_active, launch_mode_note, launch_mode_listings_target, launch_mode_agents_target')
      .single(),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('moderation_status', 'approved'),
    supabase.from('listings').select('owner_id').eq('is_active', true).eq('moderation_status', 'approved'),
    supabase.from('agent_leads').select('id', { count: 'exact', head: true }),
    supabase.from('agent_leads').select('id', { count: 'exact', head: true }).eq('status', 'onboarded'),
  ]);

  const requireApproval = appSettings?.require_listing_approval ?? false;
  const launchModeActive = appSettings?.launch_mode_active ?? true;
  const launchModeNote = appSettings?.launch_mode_note ?? '';
  const listingsTarget = appSettings?.launch_mode_listings_target ?? 150;
  const agentsTarget = appSettings?.launch_mode_agents_target ?? 40;

  const activeListings = activeListingsCount ?? 0;
  const activeAgents = new Set((activeOwners ?? []).map((l) => l.owner_id)).size;
  const listingsPct = Math.min(100, Math.round((activeListings / listingsTarget) * 100));
  const agentsPct = Math.min(100, Math.round((activeAgents / agentsTarget) * 100));

  return (
    <>
      <div className="topbar"><h1>Settings</h1></div>
      <div className="content">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Launch mode</span>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, color: '#667085', lineHeight: 1.6 }}>
              While on, every purchase (listing boost, agent subscription, verified agent review) is free —
              agents skip the mobile money step entirely and get the feature instantly. Each free claim still
              writes a full payment record (NLE 0, marked as a launch promo) so nothing is lost when you switch
              to real billing. Turning this off does not touch anything already claimed for free; it only
              switches new purchases back to requiring real mobile money payment.
            </p>
            <form
              action={async (fd: FormData) => {
                'use server';
                await setLaunchModeActive(fd.get('value') === 'true');
              }}
            >
              <input type="hidden" name="value" value={String(!launchModeActive)} />
              <button
                type="submit"
                className={`badge ${launchModeActive ? 'badge-green' : 'badge-gray'}`}
                style={{ border: 'none', cursor: 'pointer', fontSize: 13, padding: '8px 16px' }}
              >
                Launch mode (free purchases): {launchModeActive ? 'ON' : 'OFF'}
              </button>
            </form>

            <form
              action={async (fd: FormData) => {
                'use server';
                await updateLaunchModeDetails(
                  String(fd.get('note') ?? ''),
                  Number(fd.get('listings_target')),
                  Number(fd.get('agents_target'))
                );
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480 }}
            >
              <label style={{ fontSize: 12, fontWeight: 600, color: '#344054' }}>
                Message shown to agents on the purchase screen while launch mode is on
                <textarea
                  name="note"
                  defaultValue={launchModeNote}
                  rows={3}
                  style={{ width: '100%', marginTop: 4, padding: 8, fontSize: 13, border: '1px solid #d0d5dd', borderRadius: 6, fontFamily: 'inherit' }}
                />
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', flex: 1 }}>
                  Listings milestone target
                  <input
                    type="number"
                    name="listings_target"
                    defaultValue={listingsTarget}
                    min={1}
                    style={{ width: '100%', marginTop: 4, padding: 8, fontSize: 13, border: '1px solid #d0d5dd', borderRadius: 6 }}
                  />
                </label>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', flex: 1 }}>
                  Agents milestone target
                  <input
                    type="number"
                    name="agents_target"
                    defaultValue={agentsTarget}
                    min={1}
                    style={{ width: '100%', marginTop: 4, padding: 8, fontSize: 13, border: '1px solid #d0d5dd', borderRadius: 6 }}
                  />
                </label>
              </div>
              <button type="submit" className="btn btn-sm" style={{ alignSelf: 'flex-start', background: '#1d4ed8', color: '#fff', border: 'none' }}>
                Save
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Growth toward milestone</span>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 12, color: '#667085' }}>
              Counts every currently active, approved listing site-wide. "Agents" here means distinct owners of
              those listings, not strictly accounts with the agent role. This is a display only — nothing
              switches automatically when a target is hit; the launch mode toggle above is a manual decision.
            </p>
            <MilestoneBar label="Active listings" current={activeListings} target={listingsTarget} pct={listingsPct} />
            <MilestoneBar label="Distinct owners with an active listing" current={activeAgents} target={agentsTarget} pct={agentsPct} />
            <div style={{ borderTop: '1px solid #ECEEF1', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#344054' }}>
                Agent leads onboarded: {onboardedLeadsCount ?? 0} / {totalLeadsCount ?? 0}
              </span>
              <Link href="/leads" style={{ fontSize: 12, color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>
                View leads →
              </Link>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Listing moderation</span>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, color: '#667085', lineHeight: 1.6 }}>
              By default, a new listing goes live immediately and moderation is retroactive — it only comes
              down if someone reports it. Turning this on requires every new listing to be approved by an
              admin here before it's visible to anyone but its owner. This does not affect listings already
              live when you turn it on.
            </p>
            <form
              action={async (fd: FormData) => {
                'use server';
                await setRequireListingApproval(fd.get('value') === 'true');
              }}
            >
              <input type="hidden" name="value" value={String(!requireApproval)} />
              <button
                type="submit"
                className={`badge ${requireApproval ? 'badge-green' : 'badge-gray'}`}
                style={{ border: 'none', cursor: 'pointer', fontSize: 13, padding: '8px 16px' }}
              >
                Require approval before publishing: {requireApproval ? 'ON' : 'OFF'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
