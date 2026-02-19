'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuth } from '../../components/auth-provider';

const REMEMBER_KEY = 'caelith_remember';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Something went wrong. Please try again.';
}

export default function LoginPage() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) router.push('/dashboard');
  }, [user, router]);

  // Restore remembered email
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        const { email: savedEmail } = JSON.parse(saved);
        if (savedEmail) { setEmail(savedEmail); setRememberMe(true); }
      }
    } catch { /* localStorage may be unavailable */ }
  }, []);

  const handleSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(email, password);
      // Persist auth so the auth-provider can restore it across navigations
      localStorage.setItem('caelith_token', res.token);
      localStorage.setItem('caelith_user', JSON.stringify(res.user));
      if (rememberMe) localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email }));
      else localStorage.removeItem(REMEMBER_KEY);
      setUser(res.user);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [email, password, rememberMe, router, setUser]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#2D3333',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Sora', sans-serif",
      padding: '20px',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div style={{
        width: '100%',
        maxWidth: '400px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <a href="https://www.caelith.tech" style={{
            fontFamily: "'Sora', sans-serif",
            fontWeight: 800,
            fontSize: '28px',
            color: '#fff',
            textDecoration: 'none',
            letterSpacing: '-0.02em',
          }}>Caelith</a>
          <p style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            color: 'rgba(197, 224, 238, 0.5)',
            marginTop: '8px',
            letterSpacing: '1px',
          }}>COMPLIANCE-PLATTFORM FÜR EU-FONDSVERWALTER</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(197,224,238,0.1)',
          borderRadius: '12px',
          padding: '40px 32px',
          backdropFilter: 'blur(8px)',
        }}>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 600,
            color: '#fff',
            marginBottom: '8px',
            margin: '0 0 8px 0',
          }}>Anmelden</h1>
          <p style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.4)',
            marginBottom: '32px',
            margin: '0 0 32px 0',
          }}>Melden Sie sich an, um auf das Dashboard zuzugreifen.</p>

          {error && (
            <div style={{
              background: 'rgba(255,95,86,0.1)',
              border: '1px solid rgba(255,95,86,0.2)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '24px',
              fontSize: '13px',
              color: '#FF5F56',
            }}>{error}</div>
          )}

          <form onSubmit={handleSignIn}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.5)',
                marginBottom: '8px',
                letterSpacing: '0.5px',
              }}>E-MAIL
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@fund.eu"
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(197,224,238,0.15)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#fff',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#C5E0EE'}
                onBlur={e => e.target.style.borderColor = 'rgba(197,224,238,0.15)'}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.5)',
                marginBottom: '8px',
                letterSpacing: '0.5px',
              }}>PASSWORT
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 48px 12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(197,224,238,0.15)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#fff',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#C5E0EE'}
                  onBlur={e => e.target.style.borderColor = 'rgba(197,224,238,0.15)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.3)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: '4px',
                  }}
                >{showPassword ? 'Verbergen' : 'Zeigen'}</button>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '28px',
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#C5E0EE' }}
                />
                Angemeldet bleiben
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                border: 'none',
                background: '#C5E0EE',
                color: '#2D3333',
                fontFamily: "'Sora', sans-serif",
                fontSize: '15px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s',
              }}
            >{loading ? 'Wird angemeldet...' : 'Anmelden'}</button>
          </form>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          marginTop: '32px',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.2)',
          fontFamily: "'JetBrains Mono', monospace",
        }}>© 2026 Caelith. Alle Rechte vorbehalten.</p>
      </div>
    </div>
  );
}
