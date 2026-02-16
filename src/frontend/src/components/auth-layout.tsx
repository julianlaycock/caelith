'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from './auth-provider';
import { Sidebar } from './sidebar';
import { CopilotPanel, CopilotToggleButton } from './copilot';
import { CommandPalette } from './command-palette';
import { ErrorBoundary } from './error-boundary';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/login' || pathname.startsWith('/design-lab');
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const openCopilot = () => setCopilotOpen(true);
    window.addEventListener('caelith:open-copilot', openCopilot as EventListener);
    return () => window.removeEventListener('caelith:open-copilot', openCopilot as EventListener);
  }, []);

  return (
    <AuthProvider>
      {isPublicPage ? (
        children
      ) : (
        <div className="flex h-screen bg-bg-primary">
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed left-4 top-4 z-40 rounded-lg border border-edge-subtle bg-bg-sidebar p-2 text-ink shadow-lg md:hidden"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <Sidebar
            onSearchToggle={() => setCommandPaletteOpen(true)}
            mobileOpen={sidebarOpen}
            onMobileClose={() => setSidebarOpen(false)}
          />

          <main className="flex-1 overflow-y-auto p-8 pt-16 md:pt-8">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>

          <CopilotToggleButton onClick={() => setCopilotOpen(true)} />
          <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} />
          <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
        </div>
      )}
    </AuthProvider>
  );
}
