'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from './auth-provider';
import { Sidebar } from './sidebar';
import { CopilotPanel, CopilotToggleButton } from './copilot';
import { CommandPalette } from './command-palette';
import { ErrorBoundary } from './error-boundary';

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('caelith_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('caelith_theme', next ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggle}
      className="fixed right-4 top-4 z-50 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-2 text-[var(--text-tertiary)] shadow-sm transition-all hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)]"
      title={dark ? 'Light Mode' : 'Dark Mode'}
    >
      {dark ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      )}
    </button>
  );
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname.startsWith('/design-lab') || pathname === '/terms' || pathname === '/privacy' || pathname === '/dpa' || pathname === '/landing';
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
        <div className="flex h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <ThemeToggle />

          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed left-4 top-4 z-40 rounded-lg border border-[var(--border)] bg-[var(--bg-sidebar)] p-2 text-[var(--text-primary)] shadow-lg md:hidden"
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

          <main className="flex-1 overflow-y-auto p-8 pt-16 md:pt-8" style={{ color: 'var(--text-primary)' }}>
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
