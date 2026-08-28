'use client';

import { usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { logout } from '../app/actions';
import { IconGrid, IconHome, IconUsers, IconCard, IconFlag, IconUserCheck, IconGear } from './icons';
import { initialsOf } from '../lib/avatar';

const navItems = [
  { href: '/', label: 'Overview', icon: IconGrid },
  { href: '/listings', label: 'Listings', icon: IconHome },
  { href: '/users', label: 'Users', icon: IconUsers },
  { href: '/payments', label: 'Payments', icon: IconCard },
  { href: '/reports', label: 'Reports', icon: IconFlag },
  { href: '/leads', label: 'Agent Leads', icon: IconUserCheck },
  { href: '/settings', label: 'Settings', icon: IconGear },
];

export function Sidebar({ adminName, launchModeActive }: { adminName: string | null; launchModeActive: boolean }) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <aside className="sidebar-brand">
      <div className="sidebar-brand-logo">
        <div className="sidebar-brand-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3E6FBF" strokeWidth="2.4" strokeLinecap="round">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M19 19l-4.3-4.3" />
          </svg>
        </div>
        <div>
          <div className="sidebar-brand-wordmark">
            easy<span style={{ color: '#F0C239' }}>fen</span>
          </div>
          <div className="sidebar-brand-caption">ADMIN</div>
        </div>
      </div>

      {launchModeActive && (
        <div className="launch-pill">
          <span className="launch-pill-dot" />
          <div>
            <div style={{ fontWeight: 700 }}>Launch Mode Active</div>
            <div style={{ opacity: 0.75, fontSize: 11 }}>Free boosts & subscriptions enabled</div>
          </div>
        </div>
      )}

      <nav className="sidebar-brand-nav">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <a key={item.href} href={item.href} className={`sidebar-brand-link${active ? ' active' : ''}`}>
              <Icon size={17} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      <div className="sidebar-brand-footer">
        <div className="sidebar-brand-avatar">{initialsOf(adminName)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {adminName ?? 'Admin'}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>Administrator</div>
        </div>
        <button
          type="button"
          title="Sign out"
          disabled={isPending}
          onClick={() => startTransition(() => logout())}
          className="sidebar-brand-signout"
        >
          ⏻
        </button>
      </div>
    </aside>
  );
}
