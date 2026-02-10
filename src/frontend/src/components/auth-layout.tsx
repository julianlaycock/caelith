'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from './auth-provider';
import { Sidebar } from './sidebar';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <AuthProvider>
      {isLoginPage ? (
        children
      ) : (
        <div className="flex h-screen bg-surface-muted">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-8">{children}</main>
        </div>
      )}
    </AuthProvider>
  );
}
