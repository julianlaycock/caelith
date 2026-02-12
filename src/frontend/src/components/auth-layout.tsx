'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from './auth-provider';
import { Sidebar } from './sidebar';
import { CopilotPanel, CopilotToggleButton } from './copilot';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const [copilotOpen, setCopilotOpen] = useState(false);

  return (
    <AuthProvider>
      {isLoginPage ? (
        children
      ) : (
        <div className="flex h-screen bg-surface-muted">
          <Sidebar onCopilotToggle={() => setCopilotOpen(true)} />
          <main className="flex-1 overflow-y-auto p-8">{children}</main>
          <CopilotToggleButton onClick={() => setCopilotOpen(true)} />
          <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} />
        </div>
      )}
    </AuthProvider>
  );
}
