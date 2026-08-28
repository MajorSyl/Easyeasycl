import type { Metadata } from 'next';
import './globals.css';
import { createClient } from '@/lib/supabase-server';
import { Sidebar } from '@/components/Sidebar';

export const metadata: Metadata = { title: 'Easyfen Admin', description: 'Admin dashboard' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return (
      <html lang="en">
        <body>{children}</body>
      </html>
    );
  }

  const [{ data: profile }, { data: appSettings }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', session.user.id).single(),
    supabase.from('app_settings').select('launch_mode_active').single(),
  ]);

  return (
    <html lang="en">
      <body>
        <div className="shell">
          <Sidebar adminName={profile?.full_name ?? null} launchModeActive={appSettings?.launch_mode_active ?? false} />
          <main className="main-brand">{children}</main>
        </div>
      </body>
    </html>
  );
}
