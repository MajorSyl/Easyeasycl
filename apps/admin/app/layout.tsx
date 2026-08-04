import type { Metadata } from 'next';
import './globals.css';
import { logout } from './actions';
import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Easyfen Admin', description: 'Admin dashboard' };

const navItems = [
  { href: '/', label: 'Overview', icon: '📊' },
  { href: '/users', label: 'Users', icon: '👥' },
  { href: '/content', label: 'Content', icon: '🏠' },
  { href: '/reports', label: 'Reports', icon: '🚩' },
];

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

  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <div className="sidebar-logo">
              <img src="/easyfen-logo-white.svg" alt="Easyfen" height={20} />
              <span className="sidebar-logo-suffix">Admin</span>
            </div>
            <nav className="sidebar-nav">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="sidebar-link">
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="sidebar-footer">
              <form action={logout}>
                <button type="submit" className="btn btn-ghost" style={{ width: '100%', color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.15)' }}>
                  Sign out
                </button>
              </form>
            </div>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
