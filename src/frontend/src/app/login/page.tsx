'use client';

import React, { useState } from 'react';
import { api } from '../../lib/api';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      localStorage.setItem('caelith_token', result.token);
      localStorage.setItem('caelith_user', JSON.stringify(result.user));
      window.location.href = '/';
    } catch (err) {
      setError((err as { message?: string }).message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-slate-900 p-12 lg:flex">
        <div>
          <span className="text-lg font-bold tracking-tight text-white">Caelith</span>
          <span className="ml-2 rounded bg-blue-600/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">BETA</span>
        </div>
        <div>
          <p className="text-3xl font-semibold leading-tight tracking-tight text-white">
            Programmable compliance<br />for private assets.
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
            Configure transfer restrictions, validate transactions against regulatory rules, and maintain a complete audit trail — all through a single API.
          </p>
        </div>
        <p className="text-xs text-slate-600">Source-available compliance infrastructure</p>
      </div>

      {/* Right Panel — Form */}
      <div className="flex w-full flex-col items-center justify-center px-8 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="text-lg font-bold tracking-tight text-slate-900">Caelith</span>
          </div>

          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            {isRegister ? 'Create an account' : 'Sign in'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isRegister ? 'Get started with Caelith' : 'Welcome back'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {isRegister && (
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-800 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-900 disabled:opacity-50"
            >
              {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(null); }}
              className="font-medium text-blue-800 hover:text-blue-900"
            >
              {isRegister ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}