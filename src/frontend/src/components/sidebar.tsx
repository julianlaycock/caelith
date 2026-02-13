'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { classNames } from '../lib/utils';
import { useAuth } from './auth-provider';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  matchPaths?: string[]; // additional paths that highlight this item
}

const iconClass = "h-[18px] w-[18px]";

const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    href: '/funds',
    label: 'Funds',
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
    matchPaths: ['/funds', '/holdings', '/assets'],
  },
  {
    href: '/investors',
    label: 'Investors',
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
    label: 'Rules',
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    matchPaths: ['/rules'],
  },
  {
    href: '/audit',
    label: 'Activity',
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    matchPaths: ['/audit', '/decisions'],
  },
];

export function Sidebar({ onCopilotToggle, mobileOpen, onMobileClose }: { onCopilotToggle?: () => void; mobileOpen?: boolean; onMobileClose?: () => void } = {}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (item: NavItem) => {
    if (item.href === '/') return pathname === '/';
    if (pathname.startsWith(item.href)) return true;
    if (item.matchPaths) return item.matchPaths.some(p => pathname.startsWith(p));
    return false;
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  return (
    <aside className={classNames(
      'flex h-screen w-[220px] flex-col bg-bg-sidebar border-r border-edge-subtle transition-transform duration-200',
      'fixed z-50 md:static md:translate-x-0',
      mobileOpen ? 'translate-x-0' : '-translate-x-full'
    )}>
      {/* Brand */}
      <div className="px-5 pt-6 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Accent Mark Logo */}
          <svg viewBox="0 0 32 32" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
            <g transform="translate(3, 3)">
              <path d="M13 0C5.82 0 0 5.82 0 13C0 20.18 5.82 26 13 26C16.6 26 19.85 24.58 22.16 22.22"
                    stroke="#22D3EE" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <line x1="6" y1="13" x2="19" y2="13" stroke="#22D3EE" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="21.5" cy="13" r="1.5" fill="#22D3EE"/>
            </g>
          </svg>
          <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-ink">
            Caelith
          </span>
        </div>
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="rounded-md p-1 text-ink-tertiary hover:text-ink md:hidden"
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
        <div className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={classNames(
                  'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
                  active
                    ? 'bg-white/[0.07] text-ink'
                    : 'text-ink-secondary hover:bg-white/[0.04] hover:text-ink'
                )}
              >
                <span className={active ? 'text-accent-400' : 'text-ink-tertiary group-hover:text-ink-secondary'}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-edge-subtle px-3 py-4">
        {onCopilotToggle && (
          <button
            onClick={onCopilotToggle}
            className="mb-3 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-accent-300 transition-all hover:text-accent-200 hover:bg-white/[0.04]"
          >
            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
            Copilot
          </button>
        )}

        {user && (
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent-500/15 ring-1 ring-accent-400/20 text-[10px] font-bold text-accent-300 font-mono">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-ink">{user.name}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-md p-1 text-ink-muted hover:text-ink-secondary transition-colors"
              title="Sign out"
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
