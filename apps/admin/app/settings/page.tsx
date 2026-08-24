import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { setRequireListingApproval } from '../actions';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const isAdmin = session.user.app_metadata?.is_admin === true ||
    (await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()).data?.is_admin === true;
  if (!isAdmin) redirect('/login');

  const { data: appSettings } = await supabase.from('app_settings').select('require_listing_approval').single();
  const requireApproval = appSettings?.require_listing_approval ?? false;

  return (
    <>
      <div className="topbar"><h1>Settings</h1></div>
      <div className="content">
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
