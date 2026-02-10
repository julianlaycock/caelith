'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { User } from '../lib/types';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Restore token on mount
    const token = localStorage.getItem('caelith_token');
    const stored = localStorage.getItem('caelith_user');
    if (token && stored) {
      api.setToken(token);
      setUser(JSON.parse(stored));
    }
    setReady(true);

    // Listen for expired sessions
    const handler = () => {
      localStorage.removeItem('caelith_token');
      localStorage.removeItem('caelith_user');
      setUser(null);
      window.location.href = '/login';
    };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
      </div>
    );
  }

  // Not logged in and not on login page
  if (!user && typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
    return null;
  }

  return <>{children}</>;
}

export function useAuth(): { user: User | null; logout: () => void } {
  const logout = () => {
    api.logout();
    localStorage.removeItem('caelith_token');
    localStorage.removeItem('caelith_user');
    window.location.href = '/login';
  };

  const stored = typeof window !== 'undefined' ? localStorage.getItem('caelith_user') : null;
  const user = stored ? JSON.parse(stored) : null;

  return { user, logout };
}