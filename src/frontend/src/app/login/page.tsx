'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuth } from '../../components/auth-provider';

const REMEMBER_KEY = 'caelith_remember';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        const { email: savedEmail } = JSON.parse(saved);
        if (savedEmail) setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let result;
      if (isRegister) {
        result = await api.register(email, password, name);
      } else {
        result = await api.login(email, password);
      }
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email }));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      localStorage.setItem('caelith_token', result.token);
      localStorage.setItem('caelith_user', JSON.stringify(result.user));
      setUser(result.user);
      router.push('/');
    } catch (err) {
      setError((err as { message?: string }).message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Branding */}
      <div className="hidden w-1/2 flex-col justify-between bg-bg-sidebar p-12 lg:flex relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
        {/* Gradient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl" />

        <div className="relative">
          <div className="mb-2 h-0.5 w-8 bg-accent-400" />
          <span className="text-base font-bold uppercase tracking-[0.2em] text-ink">
            CAELITH
          </span>
        </div>
        <div className="relative">
          <p className="text-3xl font-semibold leading-tight tracking-tight text-ink">
            Compliance Intelligence<br />for Alternative Investments
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-secondary">
            Configure eligibility rules, manage investor onboarding, validate transfers against regulatory frameworks, and maintain a complete audit trail.
          </p>
        </div>
        <p className="relative text-xs text-ink-muted font-mono">
          Institutional-grade compliance infrastructure
        </p>
      </div>

      {/* Right Panel — Form */}
      <div className="flex w-full flex-col items-center justify-center bg-bg-primary px-8 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="mb-1 h-0.5 w-6 bg-accent-400" />
            <span className="text-base font-bold uppercase tracking-[0.2em] text-ink">
              CAELITH
            </span>
          </div>

          <h2 className="text-xl font-semibold tracking-tight text-ink">
            {isRegister ? 'Create an account' : 'Sign in'}
          </h2>
          <p className="mt-1 text-sm text-ink-secondary">
            {isRegister ? 'Get started with Caelith' : 'Welcome back'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            {isRegister && (
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-ink-tertiary mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-lg border border-edge bg-bg-secondary px-3 py-2 text-sm text-ink focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400/30 placeholder:text-ink-muted"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-ink-tertiary mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-lg border border-edge bg-bg-secondary px-3 py-2 text-sm text-ink focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400/30 placeholder:text-ink-muted"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-ink-tertiary mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                className="block w-full rounded-lg border border-edge bg-bg-secondary px-3 py-2 text-sm text-ink focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400/30 placeholder:text-ink-muted"
                required
              />
            </div>

            {!isRegister && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-edge bg-bg-secondary text-accent-500 focus:ring-accent-400/30"
                />
                <label htmlFor="remember-me" className="text-sm text-ink-secondary">
                  Remember me
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-accent-400 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-secondary">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(null); }}
              className="font-medium text-accent-400 hover:text-accent-300"
            >
              {isRegister ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
