'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '../lib/api';
import type { User } from '../lib/types';

interface AuthContextType {
  user: User | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, logout: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();

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

  // Bug 1 fix: redirect in useEffect instead of during render
  useEffect(() => {
    if (ready && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [ready, user, pathname, router]);

  if (!ready || (!user && pathname !== '/login')) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-edge border-t-brand-500" />
      </div>
    );
  }

  // Bug 2 fix: provide user + logout via Context
  const logout = () => {
    api.logout();
    localStorage.removeItem('caelith_token');
    localStorage.removeItem('caelith_user');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Bug 2 fix: useAuth consumes Context instead of reading localStorage
export function useAuth(): { user: User | null; logout: () => void } {
  return useContext(AuthContext);
}
