'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { classNames } from '../lib/utils';
import { useAuth } from './auth-provider';

interface NavItem {
  href: string;
  label: string;
  section?: string;
  icon: React.ReactNode;
  matchPaths?: string[];
}

const iconClass = 'h-[18px] w-[18px] flex-shrink-0';

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    section: 'ÜBERSICHT',
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    href: '/funds',
    label: 'Fonds',
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
    matchPaths: ['/funds', '/holdings', '/assets'],
  },
  {
    href: '/investors',
    label: 'Investoren',
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    matchPaths: ['/investors', '/onboarding'],
  },
  {
    href: '/transfers',
    label: 'Transfers',
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    href: '/rules',
    label: 'Regelwerk',
    section: 'COMPLIANCE',
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    matchPaths: ['/rules'],
  },
  {
    href: '/decisions',
    label: 'Entscheidungen',
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
    matchPaths: ['/decisions', '/audit'],
  },
];

export function Sidebar({
  onSearchToggle,
  mobileOpen,
  onMobileClose,
}: {
  onSearchToggle?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
} = {}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (item: NavItem) => {
    if (item.href === '/') return pathname === '/dashboard';
    if (pathname.startsWith(item.href)) return true;
    if (item.matchPaths) return item.matchPaths.some((p) => pathname.startsWith(p));
    return false;
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '--';

  let lastSection = '';

  return (
    <aside
      className={classNames(
        'fixed z-50 flex h-screen w-[220px] flex-col transition-transform duration-200 md:static md:translate-x-0',
        'bg-[var(--bg-sidebar)] border-r border-[var(--border)]',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-[26px] pb-6 pt-7">
        <span
          className="text-[18px] font-extrabold text-[var(--text-primary)]"
          style={{ fontFamily: "'Sora', sans-serif", letterSpacing: '-0.04em' }}
        >
          Caelith
        </span>
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="rounded-md p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] md:hidden"
            aria-label="Close menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3">
        {navItems.map((item) => {
          const active = isActive(item);
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;

          return (
            <React.Fragment key={item.label}>
              {showSection && (
                <div
                  className="mb-2 mt-6 px-[10px] font-mono text-[10px] tracking-[1.5px] text-[var(--text-muted)]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {item.section}
                </div>
              )}
              <Link
                href={item.href}
                onClick={onMobileClose}
                className={classNames(
                  'group flex items-center gap-2.5 rounded-lg px-3 py-[9px] text-[13px] font-medium transition-all duration-150',
                  active
                    ? 'bg-[rgba(197,224,238,0.15)] text-[var(--text-primary)] border-l-2 border-[#C5E0EE] -ml-[2px] dark:bg-[rgba(197,224,238,0.08)] dark:text-[#C5E0EE]'
                    : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]'
                )}
              >
                <span className={active ? 'text-[#C5E0EE]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-tertiary)]'}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--border)] px-3 py-4">
        {onSearchToggle && (
          <button
            onClick={onSearchToggle}
            className="mb-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--text-tertiary)] transition-all hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
          >
            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <span className="flex-1 text-left">Suche</span>
            <kbd className="font-mono text-[10px] text-[var(--text-muted)]">Ctrl+K</kbd>
          </button>
        )}

        {user && (
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(197,224,238,0.15)] border border-[rgba(197,224,238,0.3)] font-mono text-[10px] font-semibold text-[#2D3333] dark:text-[#C5E0EE] dark:bg-[rgba(197,224,238,0.08)] dark:border-[rgba(197,224,238,0.15)]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-[var(--text-secondary)]">{user.name}</p>
              <p className="truncate text-[10px] text-[var(--text-muted)]">{user.role === 'admin' ? 'Administrator' : user.role === 'compliance_officer' ? 'Compliance Officer' : 'Viewer'}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-md p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
              title="Abmelden"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
