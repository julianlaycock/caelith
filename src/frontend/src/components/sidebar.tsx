'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { classNames } from '../lib/utils';
import { useAuth } from './auth-provider';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/assets', label: 'Assets', icon: '📦' },
  { href: '/investors', label: 'Investors', icon: '👤' },
  { href: '/holdings', label: 'Holdings', icon: '💼' },
  { href: '/rules', label: 'Rules', icon: '📋' },
  { href: '/transfers', label: 'Transfers', icon: '🔄' },
  { href: '/audit', label: 'Audit Trail', icon: '📜' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-14 items-center border-b border-gray-200 px-4">
        <h1 className="text-lg font-bold text-indigo-600">Codex</h1>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={classNames(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-4">
        {user && (
          <div className="mb-3">
            <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
            <p className="truncate text-xs text-gray-500">{user.email}</p>
            <span className="mt-1 inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {user.role.replace('_', ' ')}
            </span>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}