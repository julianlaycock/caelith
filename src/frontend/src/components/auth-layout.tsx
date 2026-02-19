'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from './auth-provider';
import { I18nProvider, useI18n } from '../lib/i18n';
import { Sidebar, ThemeToggle } from './sidebar';
import { CopilotPanel, CopilotToggleButton } from './copilot';
import { CommandPalette } from './command-palette';
import { ErrorBoundary } from './error-boundary';
import { Breadcrumb } from './breadcrumb';

function TopRightControls() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="fixed right-6 top-4 z-30 flex items-center gap-2 md:right-8">
      <button
        onClick={() => setLocale(locale === 'de' ? 'en' : 'de')}
        className="rounded-lg border border-edge bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-tertiary transition-all hover:border-edge-strong hover:text-ink-secondary"
        title={t('lang.toggle')}
      >
        {locale === 'de' ? 'EN' : 'DE'}
      </button>
      <ThemeToggle />
    </div>
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
      <I18nProvider>
      {isPublicPage ? (
        children
      ) : (
        <div className="flex h-screen bg-bg-primary">
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed left-4 top-4 z-40 rounded-lg border border-edge bg-bg-sidebar p-2 text-ink shadow-lg md:hidden"
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

          <main className="relative flex-1 overflow-y-auto p-4 pb-20 pt-14 md:p-6 md:pt-6 lg:p-8 text-ink">
            <TopRightControls />
            <Breadcrumb />
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>

          <CopilotToggleButton onClick={() => setCopilotOpen(true)} />
          <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} />
          <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
        </div>
      )}
    </I18nProvider>
    </AuthProvider>
  );
}
