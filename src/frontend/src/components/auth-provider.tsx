'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '../lib/api';
import type { User } from '../lib/types';

interface AuthContextType {
  user: User | null;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, logout: () => {}, setUser: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const isPublicPath = pathname === '/login' || pathname.startsWith('/design-lab');

  useEffect(() => {
    // Restore token on mount and on pathname change (in case of fresh login)
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
  }, [router, pathname]);

  // Bug 1 fix: redirect in useEffect instead of during render
  useEffect(() => {
    if (ready && !user && !isPublicPath) {
      router.push('/login');
    }
  }, [ready, user, isPublicPath, router]);

  if (!ready || (!user && !isPublicPath)) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-edge-subtle border-t-accent-400" />
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
    <AuthContext.Provider value={{ user, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Bug 2 fix: useAuth consumes Context instead of reading localStorage
export function useAuth(): { user: User | null; logout: () => void; setUser: (user: User) => void } {
  return useContext(AuthContext);
}
