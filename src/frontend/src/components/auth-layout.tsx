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

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <AuthProvider>
      {isPublicPage ? (
        children
      ) : (
        <div className="flex h-screen bg-bg-primary">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed top-4 left-4 z-40 rounded-lg bg-bg-sidebar border border-edge-subtle p-2 text-ink shadow-lg md:hidden"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {/* Backdrop */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <Sidebar
            onCopilotToggle={() => setCopilotOpen(true)}
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
