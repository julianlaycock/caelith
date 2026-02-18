'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AIFMD_DEADLINE, GOLD } from './tokens';

/* ── Hooks ─────────────────────────── */

export function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); obs.unobserve(el); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

export function useCountdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, AIFMD_DEADLINE - now);
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

export function useAnimatedCounter(target: number, duration = 2000, trigger = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setValue(target); return; }
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [trigger, target, duration]);
  return value;
}

/* ── Logo ─────────────────────────── */

export function NorthStarMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M16 2L17.5 13.5L30 16L17.5 18.5L16 30L14.5 18.5L2 16L14.5 13.5Z" fill="currentColor" />
    </svg>
  );
}

/* ── RevealDiv ─────────────────────────── */

export function RevealDiv({ children, className = '', delay = 0, ...props }: React.HTMLAttributes<HTMLDivElement> & { delay?: number }) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms`, ...props.style }} {...props}>
      {children}
    </div>
  );
}

/* ── Section wrapper ─────────────────────────── */

export function Section({ id, children, dark, className = '' }: {
  id?: string;
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`py-16 sm:py-24 md:py-32 px-5 sm:px-6 ${dark ? 'bg-accent-950' : ''} ${className}`}
    >
      <div className="max-w-6xl mx-auto">
        {children}
      </div>
    </section>
  );
}

/* ── Section header ─────────────────────────── */

export function SectionHeader({ tag, children, description, dark, className = '' }: {
  tag?: string;
  children: React.ReactNode;
  description?: string;
  dark?: boolean;
  className?: string;
}) {
  return (
    <RevealDiv className={`text-center mb-12 sm:mb-16 md:mb-20 ${className}`}>
      {tag && (
        <span className={`text-[11px] font-mono tracking-[0.2em] uppercase mb-4 block ${dark ? 'text-[#D8BA8E]' : 'text-[#D8BA8E]'}`}>
          {tag}
        </span>
      )}
      {children}
      {description && (
        <p className={`text-sm mt-4 max-w-lg mx-auto ${dark ? 'text-white/45' : 'text-accent-950/45'}`}>
          {description}
        </p>
      )}
    </RevealDiv>
  );
}

/* ── Buttons ─────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

const BTN_VARIANTS: Record<ButtonVariant, string> = {
  primary: `bg-[${GOLD}] text-accent-900 hover:bg-[#c9a878] shadow-lg shadow-[#D8BA8E]/10 hover:shadow-xl hover:shadow-[#D8BA8E]/20`,
  secondary: 'border border-accent-950/15 text-accent-950 hover:bg-accent-950/5',
  ghost: 'text-accent-950/50 hover:text-accent-950',
};

const BTN_SIZES: Record<ButtonSize, string> = {
  sm: 'px-5 py-2 text-[13px]',
  md: 'px-8 py-3 text-sm',
  lg: 'px-10 py-4 text-sm',
};

export function LandingButton({ variant = 'primary', size = 'md', children, onClick, className = '' }: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8BA8E]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F2EA] ${BTN_VARIANTS[variant]} ${BTN_SIZES[size]} ${className}`}
    >
      {children}
    </button>
  );
}

/* ── Countdown ─────────────────────────── */

export function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <span className="countdown-digit text-base sm:text-lg font-bold text-[#D8BA8E]">{String(value).padStart(2, '0')}</span>
      <span className="block text-[9px] sm:text-[10px] uppercase tracking-widest text-white/30 mt-0.5">{label}</span>
    </div>
  );
}

export function CountdownBadge({ countdown }: { countdown: { d: number; h: number; m: number; s: number } }) {
  return (
    <div className="inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 rounded-full bg-[#D8BA8E]/[0.08] border border-[#D8BA8E]/20 backdrop-blur-sm mb-8 sm:mb-10">
      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#D8BA8E] shadow-sm shadow-[#D8BA8E]/50" />
      <span className="text-[10px] sm:text-[11px] font-medium text-[#D8BA8E]/80 tracking-wide uppercase">AIFMD II Deadline</span>
      <div className="flex items-center gap-1 sm:gap-1.5 ml-1">
        <CountdownUnit value={countdown.d} label="days" />
        <span className="text-[#D8BA8E]/30 text-[10px] sm:text-xs">:</span>
        <CountdownUnit value={countdown.h} label="hrs" />
        <span className="text-[#D8BA8E]/30 text-[10px] sm:text-xs">:</span>
        <CountdownUnit value={countdown.m} label="min" />
        <span className="text-[#D8BA8E]/30 text-[10px] sm:text-xs hidden sm:inline">:</span>
        <span className="hidden sm:block"><CountdownUnit value={countdown.s} label="sec" /></span>
      </div>
    </div>
  );
}

/* ── Icons ─────────────────────────── */

export function ProblemIcon({ type }: { type: string }) {
  const cls = 'w-7 h-7 sm:w-8 sm:h-8 text-[#D8BA8E]';
  if (type === 'grid') return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
  if (type === 'zap') return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><line x1="12" y1="8" x2="12" y2="12" /><circle cx="12" cy="15" r="0.5" fill="currentColor" />
    </svg>
  );
}

export function TrustIcon({ type }: { type: string }) {
  const cls = 'w-5 h-5 text-[#D8BA8E]';
  if (type === 'hash') return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
  if (type === 'cpu') return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="15" x2="23" y2="15" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="15" x2="4" y2="15" />
    </svg>
  );
  if (type === 'user') return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><polyline points="16 11 18 13 22 9" />
    </svg>
  );
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  );
}

/* ── Trust strip ─────────────────────────── */

export function TrustStrip({ items, dark = true }: {
  items: { icon: string; label: string; sublabel: string }[];
  dark?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
      {items.map((item) => (
        <div key={item.label} className="text-center group">
          <div className={`w-10 h-10 mx-auto mb-3 rounded-lg flex items-center justify-center transition-colors duration-150 ${dark ? 'bg-white/[0.05] border border-white/[0.08] group-hover:border-[#D8BA8E]/30' : 'bg-accent-950/[0.04] border border-accent-950/[0.08] group-hover:border-[#D8BA8E]/30'}`}>
            <TrustIcon type={item.icon} />
          </div>
          <div className={`text-xs font-semibold mb-1 ${dark ? 'text-white/70' : 'text-accent-950/70'}`}>{item.label}</div>
          <div className={`text-[11px] leading-relaxed ${dark ? 'text-white/30' : 'text-accent-950/35'}`}>{item.sublabel}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Nav ─────────────────────────── */

export function LandingNav({ scrolled, mobileMenuOpen, setMobileMenuOpen, scrollTo, navLinks }: {
  scrolled: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  scrollTo: (id: string) => void;
  navLinks: { label: string; id: string }[];
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  /* ESC to close + focus trap */
  useEffect(() => {
    if (!mobileMenuOpen) return;
    document.body.classList.add('scroll-locked');

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMobileMenuOpen(false); toggleRef.current?.focus(); return; }
      if (e.key !== 'Tab' || !menuRef.current) return;
      const focusable = menuRef.current.querySelectorAll<HTMLElement>('button, a, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.classList.remove('scroll-locked'); window.removeEventListener('keydown', onKey); };
  }, [mobileMenuOpen, setMobileMenuOpen]);

  return (
    <nav className={`landing-nav fixed top-0 left-0 right-0 z-50 ${scrolled ? 'scrolled' : ''}`} role="navigation" aria-label="Main">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-4 flex items-center justify-between">
        <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-2.5" aria-label="Caelith home">
          <NorthStarMark className={`w-6 h-6 sm:w-7 sm:h-7 transition-colors duration-300 ${scrolled ? 'text-accent-950' : 'text-white'}`} />
          <span className={`text-[13px] sm:text-sm font-semibold tracking-[0.08em] uppercase transition-colors duration-300 ${scrolled ? 'text-accent-950' : 'text-white'}`}>Caelith</span>
        </a>

        <div className="hidden md:flex items-center gap-8 lg:gap-10">
          {navLinks.map((l) => (
            <button key={l.id} onClick={() => scrollTo(l.id)}
              className={`nav-link text-[13px] font-medium transition-colors duration-150 hover:text-[#D8BA8E] focus-visible:outline-none focus-visible:text-[#D8BA8E] ${scrolled ? 'text-accent-950/50' : 'text-white/50'}`}>
              {l.label}
            </button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button onClick={() => scrollTo('signin')} className={`text-[13px] font-semibold px-5 py-2 rounded-full border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8BA8E]/40 ${scrolled ? 'border-accent-950/15 text-accent-950 hover:bg-accent-950/5' : 'border-white/20 text-white hover:bg-white/5'}`}>Sign In</button>
          <button onClick={() => scrollTo('pricing')} className="text-[13px] font-semibold px-6 py-2 rounded-full bg-[#D8BA8E] text-accent-900 hover:bg-[#c9a878] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8BA8E]/40">Book a Demo</button>
        </div>

        <button
          ref={toggleRef}
          className="md:hidden p-2 -mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          <svg className={`w-6 h-6 transition-colors ${scrolled ? 'text-accent-950' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            {mobileMenuOpen ? <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {mobileMenuOpen && (
        <div ref={menuRef} id="mobile-menu" className="mobile-overlay md:hidden" role="menu">
          <nav className="flex flex-col items-center gap-2">
            {navLinks.map((l, i) => (
              <button key={l.id} onClick={() => scrollTo(l.id)}
                className="mobile-overlay-link text-xl font-semibold text-white/70 hover:text-white py-3 min-h-[44px] transition-colors duration-150"
                style={{ animationDelay: `${(i + 1) * 70}ms` }}
                role="menuitem">{l.label}</button>
            ))}
            <div className="mobile-overlay-link flex flex-col gap-3 mt-8 w-64" style={{ animationDelay: `${(navLinks.length + 1) * 70}ms` }}>
              <button onClick={() => scrollTo('signin')} className="w-full text-center py-3.5 rounded-full border border-white/20 text-white text-sm font-semibold min-h-[44px] hover:bg-white/5 transition-colors duration-150">Sign In</button>
              <button onClick={() => scrollTo('pricing')} className="w-full text-center py-3.5 rounded-full bg-[#D8BA8E] text-accent-900 text-sm font-semibold min-h-[44px] hover:bg-[#c9a878] transition-colors duration-150">Book a Demo</button>
            </div>
          </nav>
        </div>
      )}
    </nav>
  );
}

/* ── Sign-in form ─────────────────────────── */

export function SignInForm({ email, setEmail, password, setPassword, rememberMe, setRememberMe, error, loading, onSubmit }: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  rememberMe: boolean;
  setRememberMe: (v: boolean) => void;
  error: string | null;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <Section id="signin">
      <div className="max-w-md mx-auto">
        <RevealDiv>
          <div className="text-center mb-10">
            <NorthStarMark className="w-10 h-10 text-accent-950 mx-auto mb-5" />
            <h2 className="text-2xl font-bold text-accent-950 mb-2">Welcome back</h2>
            <p className="text-sm text-accent-950/40">Sign in to your Caelith dashboard.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200/60 text-sm text-red-700" role="alert">{error}</div>}
            <div>
              <label htmlFor="email" className="block text-[11px] font-medium text-accent-950/50 mb-1.5 uppercase tracking-wider">Email</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#c6beb1]/30 bg-white/50 text-sm text-accent-950 placeholder-accent-950/25 focus:border-[#D8BA8E] focus:ring-2 focus:ring-[#D8BA8E]/20 focus:outline-none transition-all duration-150"
                placeholder="you@company.com" autoComplete="email" />
            </div>
            <div>
              <label htmlFor="password" className="block text-[11px] font-medium text-accent-950/50 mb-1.5 uppercase tracking-wider">Password</label>
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#c6beb1]/30 bg-white/50 text-sm text-accent-950 placeholder-accent-950/25 focus:border-[#D8BA8E] focus:ring-2 focus:ring-[#D8BA8E]/20 focus:outline-none transition-all duration-150"
                placeholder="••••••••" autoComplete="current-password" />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-[#c6beb1]/40 text-[#D8BA8E] focus:ring-[#D8BA8E]/30" />
                <span className="text-xs text-accent-950/40">Remember me</span>
              </label>
              <a href="mailto:hello@caelith.tech?subject=Password%20Reset%20Request" className="text-xs text-[#D8BA8E] hover:text-[#c9a878] min-h-[44px] flex items-center">Need help?</a>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-accent-950 text-white font-semibold text-sm hover:bg-accent-950/90 transition-all duration-150 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-950/40 focus-visible:ring-offset-2 min-h-[44px]">
              {loading ? 'Signing in\u2026' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-accent-950/30 mt-8">
            Need an account? <a href="mailto:hello@caelith.tech?subject=Caelith%20Access%20Request" className="text-[#D8BA8E] hover:text-[#c9a878] font-medium">Request access</a>
          </p>
        </RevealDiv>
      </div>
    </Section>
  );
}

/* ── Legal disclaimer ─────────────────────────── */

export function LegalDisclaimer() {
  return (
    <div className="bg-[#eae7df] px-5 sm:px-6 py-6">
      <p className="max-w-4xl mx-auto text-xs text-accent-950/45 leading-relaxed text-center">
        Caelith is a compliance support tool that assists fund managers with regulatory documentation and monitoring. It does not provide legal, regulatory, or compliance advice and does not replace qualified professional advisors. Caelith does not guarantee compliance with any law, regulation, or regulatory standard. Regulatory rules and thresholds implemented in the platform are based on Caelith's interpretation of the cited source legislation and may be incomplete, outdated, or inaccurate. AI-generated outputs, including Compliance Copilot responses and proposed rules, are algorithmically generated, may contain errors, and require independent verification by a qualified professional before any reliance. Caelith shall not be liable for any loss, regulatory penalty, or adverse outcome arising from use of the platform. All compliance decisions remain the sole responsibility of the user.
      </p>
    </div>
  );
}

/* ── Footer ─────────────────────────── */

export function LandingFooter({ scrollTo }: { scrollTo: (id: string) => void }) {
  return (
    <footer className="border-t border-[#c6beb1]/20 relative">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#D8BA8E]/40 to-transparent" />
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <NorthStarMark className="w-5 h-5 sm:w-6 sm:h-6 text-accent-950" />
              <span className="text-sm font-semibold text-accent-950 tracking-tight">Caelith</span>
            </div>
            <p className="text-xs text-accent-950/40 leading-relaxed">Deterministic compliance enforcement for alternative investment fund managers.</p>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold text-accent-950 uppercase tracking-[0.15em] mb-4">Product</h4>
            <ul className="space-y-2.5">
              {['Rules Engine', 'Decision Provenance', 'Regulatory Intelligence'].map((l) => (
                <li key={l}><button onClick={() => scrollTo('features')} className="text-xs text-accent-950/40 hover:text-accent-950 transition-colors duration-150 min-h-[32px] flex items-center">{l}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold text-accent-950 uppercase tracking-[0.15em] mb-4">Company</h4>
            <ul className="space-y-2.5">
              <li><button onClick={() => scrollTo('how-it-works')} className="text-xs text-accent-950/40 hover:text-accent-950 transition-colors duration-150 min-h-[32px] flex items-center">About</button></li>
              <li><a href="mailto:hello@caelith.tech" className="text-xs text-accent-950/40 hover:text-accent-950 transition-colors duration-150 min-h-[32px] flex items-center">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold text-accent-950 uppercase tracking-[0.15em] mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li><span className="text-xs text-accent-950/25">Privacy Policy — Coming soon</span></li>
              <li><span className="text-xs text-accent-950/25">Terms of Service — Coming soon</span></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-[#c6beb1]/15 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-accent-950/25">&copy; {new Date().getFullYear()} Caelith GmbH. All rights reserved.</p>
          <p className="text-[11px] text-accent-950/30">Made in Frankfurt am Main</p>
        </div>
      </div>
    </footer>
  );
}
