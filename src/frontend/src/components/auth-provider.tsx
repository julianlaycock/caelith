'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import type { User } from '../lib/types';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Restore token on mount
    const token = localStorage.getItem('caelith_token');
    const stored = localStorage.getItem('caelith_user');
    if (token && stored) {
      api.setToken(token);
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('caelith_token');
        localStorage.removeItem('caelith_user');
      }
    }
    setReady(true);

    // Listen for expired sessions
    const handler = () => {
      localStorage.removeItem('caelith_token');
      localStorage.removeItem('caelith_user');
      setUser(null);
      router.push('/login');
    };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-edge border-t-brand-500" />
      </div>
    );
  }

  // Not logged in and not on login page
  if (!user && typeof window !== 'undefined' && window.location.pathname !== '/login') {
    router.push('/login');
    return null;
  }

  return <>{children}</>;
}

export function useAuth(): { user: User | null; logout: () => void } {
  const router = useRouter();

  const logout = () => {
    api.logout();
    localStorage.removeItem('caelith_token');
    localStorage.removeItem('caelith_user');
    router.push('/login');
  };

  const stored = typeof window !== 'undefined' ? localStorage.getItem('caelith_user') : null;
  let user: User | null = null;
  if (stored) {
    try {
      user = JSON.parse(stored);
    } catch {
      localStorage.removeItem('caelith_user');
    }
  }

  return { user, logout };
}
