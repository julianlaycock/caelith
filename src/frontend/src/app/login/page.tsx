'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuth } from '../../components/auth-provider';

const REMEMBER_KEY = 'caelith_remember';

/* ── Stock photos ─────────────────────────── */
const HERO_BG = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80';
const SOLUTION_BG = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80';
const CTA_BG = 'https://images.unsplash.com/photo-1462206092226-f46025ffe607?w=1920&q=80';

/* ── AIFMD II deadline ─────────────────────────── */
const AIFMD_DEADLINE = new Date('2026-04-16T00:00:00+02:00').getTime();

/* ── Logo ─────────────────────────── */
function NorthStarGridMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="12" height="12" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="18" y="2" width="12" height="12" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="2" y="18" width="12" height="12" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="18" y="18" width="12" height="12" rx="1" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

/* ── Hooks ─────────────────────────── */
function useReveal() {
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

function useCountdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, AIFMD_DEADLINE - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s };
}

function useAnimatedCounter(target: number, duration = 2000, trigger = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!trigger) return;
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

function useMagneticHover() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || 'ontouchstart' in window) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
      el.style.transform = `perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) scale(1.02)`;
    };
    const onLeave = () => { el.style.transform = ''; };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); };
  }, []);
  return ref;
}

/* ── Components ─────────────────────────── */
function RevealDiv({ children, className = '', delay = 0, ...props }: React.HTMLAttributes<HTMLDivElement> & { delay?: number }) {
  const ref = useReveal();
  return <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms`, ...props.style }} {...props}>{children}</div>;
}

function MagneticCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useMagneticHover();
  return <div ref={ref} className={className} style={{ transition: 'transform 0.2s ease-out' }}>{children}</div>;
}

function SectionDivider() {
  return <div className="section-divider" aria-hidden="true"><span className="dot" /></div>;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <span className="countdown-digit text-lg font-bold text-[#D8BA8E]">{String(value).padStart(2, '0')}</span>
      <span className="block text-[8px] uppercase tracking-widest text-white/30 mt-0.5">{label}</span>
    </div>
  );
}

/* ── Data ─────────────────────────── */
const NAV_LINKS = [
  { label: 'Features', id: 'features' },
  { label: 'How It Works', id: 'how-it-works' },
  { label: 'Pricing', id: 'pricing' },
];

const MARQUEE_ITEMS = ['AIFMD II', 'KAGB', 'CSSF', 'ELTIF 2.0', 'Annex IV', 'DORA', 'MiCA', 'UCITS VI', 'ESMA', 'AIFMD II', 'KAGB', 'CSSF', 'ELTIF 2.0', 'Annex IV', 'DORA', 'MiCA', 'UCITS VI', 'ESMA'];

const PROBLEM_CARDS = [
  { icon: '📊', title: 'Spreadsheet Risk', description: 'Critical compliance decisions buried in Excel. No audit trail, no version control, no enforcement. One wrong formula means regulatory breach.' },
  { icon: '⚡', title: 'Regulatory Velocity', description: 'AIFMD II, ELTIF 2.0, DORA — regulations shipping faster than your compliance team can read them. Manual processes cannot keep pace.' },
  { icon: '🔍', title: 'Audit Exposure', description: 'When the regulator asks "prove it," you need deterministic evidence — not a folder of screenshots and email threads.' },
];

const SOLUTION_METRICS = [
  { value: 50, suffix: 'ms', prefix: '< ', label: 'Rule evaluation time' },
  { value: 100, suffix: '%', prefix: '', label: 'Decision auditability' },
  { value: 0, suffix: '', prefix: '', label: 'Manual compliance steps', static: true },
  { value: 0, suffix: '∞', prefix: '', label: 'Regulatory scalability', static: true },
];

const FEATURES = [
  {
    tag: 'Rules Engine',
    headline: ['Configure once.', 'Enforce forever.'],
    description: 'Define compliance rules as deterministic logic — not guidelines. Every investment decision is evaluated against your complete ruleset in real time.',
    items: ['Pre-trade & post-trade enforcement', 'Multi-jurisdiction rule stacking', 'Breach prevention, not detection', 'Version-controlled rule history'],
  },
  {
    tag: 'Decision Provenance',
    headline: ['Every decision', 'hash-chained.'],
    description: 'Every compliance decision produces an immutable, cryptographically signed audit record. When regulators ask for proof, you hand them a hash chain.',
    items: ['SHA-256 hash-chained decisions', 'Tamper-evident audit log', 'Point-in-time regulatory snapshots', 'One-click regulator export'],
  },
  {
    tag: 'Regulatory Intelligence',
    headline: ['AIFMD II. KAGB.', 'ELTIF 2.0.'],
    description: 'Pre-built regulatory modules covering the full European alternative investment landscape. New regulations modeled before enforcement dates.',
    items: ['AIFMD II full coverage', 'KAGB investment limits', 'ELTIF 2.0 eligibility rules', 'Annex IV reporting automation'],
  },
];

const STEPS = [
  { num: '01', title: 'Configure', description: 'Define fund structures, regulatory jurisdictions, and compliance rules. Our rule builder translates legal text into deterministic logic.' },
  { num: '02', title: 'Onboard', description: 'Connect portfolio data, investor records, and counterparty information. Caelith integrates via API or file upload.' },
  { num: '03', title: 'Prove', description: 'Every transaction evaluated in real time. Every decision logged. Every audit request answered with cryptographic proof.' },
];

const PRICING_TIERS = [
  { name: 'Starter', price: 299, period: '/mo', description: 'For emerging managers getting compliant.', features: ['Up to 3 funds', 'AIFMD II rules engine', 'Basic audit trail', 'Email support', 'Monthly reporting'], cta: 'Start Free Trial', highlighted: false },
  { name: 'Professional', price: 799, period: '/mo', description: 'For growing firms with multi-fund complexity.', features: ['Up to 25 funds', 'Full regulatory coverage', 'Hash-chained provenance', 'Priority support', 'API access', 'Custom rule builder'], cta: 'Start Free Trial', highlighted: true },
  { name: 'Enterprise', price: 0, period: '', description: 'For institutional managers and service providers.', features: ['Unlimited funds', 'Multi-entity support', 'Dedicated infrastructure', 'SLA guarantee', 'On-premise option', 'White-glove onboarding'], cta: 'Contact Sales', highlighted: false },
];

/* ── Main ─────────────────────────── */
function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const { message } = error as { message?: unknown };
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  return 'Invalid credentials.';
}

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const countdown = useCountdown();

  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showFloatingCta, setShowFloatingCta] = useState(false);
  const [solutionVisible, setSolutionVisible] = useState(false);
  const [barsVisible, setBarsVisible] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const solutionRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const parallax1Ref = useRef<HTMLImageElement>(null);
  const parallax2Ref = useRef<HTMLImageElement>(null);

  // Animated counters
  const counter50 = useAnimatedCounter(50, 2000, solutionVisible);
  const counter100 = useAnimatedCounter(100, 2000, solutionVisible);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) { const p = JSON.parse(saved); if (p.email) { setEmail(p.email); setRememberMe(true); } }
    } catch {
      localStorage.removeItem(REMEMBER_KEY);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      setShowFloatingCta(window.scrollY > 800);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(h > 0 ? (window.scrollY / h) * 100 : 0);
      // Parallax
      if (parallax1Ref.current) parallax1Ref.current.style.transform = `translateY(${window.scrollY * 0.3}px)`;
      if (parallax2Ref.current) parallax2Ref.current.style.transform = `translateY(${window.scrollY * 0.3}px)`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Observe solution section for counter trigger
  useEffect(() => {
    const el = solutionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSolutionVisible(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Observe hero bars
  useEffect(() => {
    const el = barsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setBarsVisible(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(email, password);
      if (rememberMe) localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email }));
      else localStorage.removeItem(REMEMBER_KEY);
      setUser(res.user);
      router.push('/');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [email, password, rememberMe, router, setUser]);

  const scrollTo = useCallback((id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const barHeights = [40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88];

  return (
    <div className="landing-page min-h-screen bg-[#F5F2EA] text-[#2d2722]">
      {/* Scroll progress */}
      <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />

      {/* Grain */}
      <div className="pointer-events-none fixed inset-0 z-[9998]" style={{ opacity: 0.03, mixBlendMode: 'overlay', backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />

      {/* ── NAV ─────────────────────────── */}
      <nav className={`landing-nav fixed top-0 left-0 right-0 z-50 ${scrolled ? 'scrolled' : ''}`}>
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-2.5">
            <NorthStarGridMark className={`w-7 h-7 transition-colors duration-500 ${scrolled ? 'text-accent-950' : 'text-white'}`} />
            <span className={`text-sm font-semibold tracking-[0.08em] uppercase transition-colors duration-500 ${scrolled ? 'text-accent-950' : 'text-white'}`}>Caelith</span>
          </a>

          <div className="hidden md:flex items-center gap-10">
            {NAV_LINKS.map((l) => (
              <button key={l.id} onClick={() => scrollTo(l.id)}
                className={`text-[13px] font-medium transition-colors duration-300 hover:text-[#D8BA8E] ${scrolled ? 'text-accent-950/50' : 'text-white/50'}`}>
                {l.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => scrollTo('signin')} className={`text-[13px] font-medium px-4 py-2 rounded-full transition-all ${scrolled ? 'text-accent-950/70 hover:text-accent-950' : 'text-white/70 hover:text-white'}`}>Sign In</button>
            <button onClick={() => scrollTo('pricing')} className="text-[13px] font-semibold px-6 py-2 rounded-full bg-[#D8BA8E] text-accent-900 hover:bg-[#c9a878] transition-all hover:shadow-lg hover:shadow-[#D8BA8E]/20">Get Started</button>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <svg className={`w-6 h-6 transition-colors ${scrolled ? 'text-accent-950' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              {mobileMenuOpen ? <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#F5F2EA]/95 backdrop-blur-xl border-t border-[#c6beb1]/30 px-6 py-4 space-y-2">
            {NAV_LINKS.map((l) => (
              <button key={l.id} onClick={() => scrollTo(l.id)} className="block w-full text-left py-2 text-sm text-accent-950/70">{l.label}</button>
            ))}
            <button onClick={() => scrollTo('signin')} className="block w-full text-center mt-3 py-2.5 rounded-full bg-[#D8BA8E] text-accent-900 text-sm font-semibold">Get Started</button>
          </div>
        )}
      </nav>

      {/* ── HERO ─────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img ref={parallax1Ref} src={HERO_BG} alt="" className="w-full h-[120%] object-cover will-change-transform" />
          <div className="absolute inset-0 bg-gradient-to-b from-accent-950/[0.96] via-accent-950/[0.93] to-accent-900/[0.90]" />
        </div>

        <div className="absolute inset-0 overflow-hidden opacity-[0.04]">
          <div className="animate-grid-scroll absolute -inset-40" style={{ backgroundImage: 'linear-gradient(rgba(216,186,142,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(216,186,142,0.3) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-32 pb-20">
          {/* Live countdown badge */}
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-[#D8BA8E]/[0.08] border border-[#D8BA8E]/20 backdrop-blur-sm mb-10">
            <span className="w-2 h-2 rounded-full bg-[#D8BA8E] animate-pulse shadow-sm shadow-[#D8BA8E]/50" />
            <span className="text-[11px] font-medium text-[#D8BA8E]/80 tracking-wide uppercase">AIFMD II Deadline</span>
            <div className="flex items-center gap-1.5 ml-1">
              <CountdownUnit value={countdown.d} label="days" />
              <span className="text-[#D8BA8E]/30 text-xs">:</span>
              <CountdownUnit value={countdown.h} label="hrs" />
              <span className="text-[#D8BA8E]/30 text-xs">:</span>
              <CountdownUnit value={countdown.m} label="min" />
              <span className="text-[#D8BA8E]/30 text-xs">:</span>
              <CountdownUnit value={countdown.s} label="sec" />
            </div>
          </div>

          <h1 className="text-on-photo mx-auto max-w-5xl text-4xl sm:text-5xl md:text-7xl lg:text-[5.5rem] font-bold leading-[1.05] tracking-tight text-white">
            The <span className="font-serif italic">compliance engine</span>
            <br />that <span className="gradient-text-animate">proves</span> you&apos;re
            <br />compliant.
          </h1>

          <p className="text-on-photo-subtle mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-white/50 md:text-xl">
            Deterministic regulatory enforcement for alternative investment fund managers.
            Configure your rules. Caelith enforces them — and proves it.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => scrollTo('pricing')} className="group rounded-full bg-[#D8BA8E] px-10 py-4 text-sm font-semibold text-accent-900 shadow-xl shadow-[#D8BA8E]/15 transition-all hover:bg-[#c9a878] hover:shadow-2xl hover:shadow-[#D8BA8E]/25 active:scale-[0.98]">
              Start Free <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </button>
            <button onClick={() => scrollTo('features')} className="group flex items-center gap-2.5 rounded-full border border-white/15 px-10 py-4 text-sm font-medium text-white/70 backdrop-blur-sm transition-all hover:border-white/30 hover:bg-white/[0.05] hover:text-white">
              <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20"><polygon points="8,4 8,16 17,10" /></svg>
              See How It Works
            </button>
          </div>

          {/* Marquee trust strip */}
          <div className="mt-16 overflow-hidden relative">
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-accent-950/90 to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-accent-950/90 to-transparent z-10" />
            <div className="animate-marquee marquee-track">
              {MARQUEE_ITEMS.map((item, i) => (
                <span key={i} className="mx-8 text-[11px] font-mono text-white/20 tracking-[0.2em] uppercase whitespace-nowrap">{item}</span>
              ))}
            </div>
          </div>

          {/* Mock dashboard */}
          <div className="relative mx-auto mt-12 max-w-4xl screenshot-shine">
            <div className="rounded-xl border border-white/10 bg-accent-950/60 backdrop-blur-sm shadow-2xl shadow-black/40 overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.05]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/40" />
                </div>
                <span className="ml-4 text-[10px] font-mono text-white/20">app.caelith.com/dashboard</span>
              </div>
              <div className="p-6 md:p-8 space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  {[{ l: 'Active Rules', v: '247' }, { l: 'Decisions Today', v: '1,893' }, { l: 'Compliance Rate', v: '100%' }, { l: 'Avg Latency', v: '23ms' }].map((m) => (
                    <div key={m.l} className="bg-white/[0.04] rounded-lg p-3 text-center border border-white/[0.04]">
                      <div className="text-lg md:text-2xl font-bold text-[#D8BA8E] font-mono">{m.v}</div>
                      <div className="text-[10px] text-white/30 mt-1">{m.l}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div ref={barsRef} className="col-span-2 bg-white/[0.04] rounded-lg p-4 h-32 flex items-end gap-1 border border-white/[0.04]">
                    {barHeights.map((h, i) => (
                      <div key={i} className={`flex-1 bg-[#D8BA8E]/30 rounded-t ${barsVisible ? 'animate-bar' : 'scale-y-0'}`}
                        style={{ height: `${h}%`, animationDelay: `${i * 60}ms`, transformOrigin: 'bottom' }} />
                    ))}
                  </div>
                  <div className="bg-white/[0.04] rounded-lg p-4 space-y-2.5 border border-white/[0.04]">
                    {['AIFMD II', 'KAGB §§', 'ELTIF 2.0'].map((r) => (
                      <div key={r} className="flex items-center justify-between text-[10px]">
                        <span className="text-white/35">{r}</span>
                        <span className="text-emerald-400 font-mono font-medium">PASS</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-8 inset-x-0 h-24 bg-gradient-to-t from-accent-900/90 to-transparent pointer-events-none" />
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-scroll-hint">
          <div className="w-[1px] h-10 bg-gradient-to-b from-transparent to-white/20" />
        </div>
      </section>

      {/* ── PROBLEM ─────────────────────────── */}
      <section className="py-28 md:py-40 px-6">
        <div className="max-w-6xl mx-auto">
          <RevealDiv className="text-center mb-20">
            <span className="text-[11px] font-mono text-[#D8BA8E] tracking-[0.2em] uppercase mb-4 block">The Problem</span>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-accent-950 leading-[1.08]">
              €1.8T in EU AIF assets.
              <br /><span className="text-accent-950/40">Compliance is still manual.</span>
            </h2>
          </RevealDiv>

          <div className="grid md:grid-cols-3 gap-6">
            {PROBLEM_CARDS.map((card, i) => (
              <RevealDiv key={card.title} delay={i * 120}>
                <MagneticCard className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-[#c6beb1]/20 hover:border-[#D8BA8E]/30 transition-colors h-full">
                  <span className="text-3xl mb-5 block">{card.icon}</span>
                  <h3 className="text-lg font-semibold text-accent-950 mb-3">{card.title}</h3>
                  <p className="text-sm text-accent-950/55 leading-relaxed">{card.description}</p>
                </MagneticCard>
              </RevealDiv>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── SOCIAL PROOF ─────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <RevealDiv>
            <div className="grid md:grid-cols-4 gap-8 items-center">
              {[
                { value: '€1.8T', label: 'EU AIF Market' },
                { value: '4,000+', label: 'Licensed AIFMs' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-accent-950 font-mono">{stat.value}</div>
                  <div className="text-[10px] text-accent-950/40 mt-1 uppercase tracking-[0.15em]">{stat.label}</div>
                </div>
              ))}
              {/* Live countdown in social proof */}
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-accent-950 font-mono">{countdown.d}<span className="text-lg text-accent-950/30">d</span> {countdown.h}<span className="text-lg text-accent-950/30">h</span></div>
                <div className="text-[10px] text-accent-950/40 mt-1 uppercase tracking-[0.15em]">Until AIFMD II</div>
              </div>
              <div className="text-center md:text-left md:border-l md:border-[#c6beb1]/30 md:pl-8">
                <p className="text-sm font-serif italic text-accent-950/55 leading-relaxed">
                  &ldquo;The industry is moving from best-effort compliance to provable compliance. The firms that adapt will thrive.&rdquo;
                </p>
                <p className="text-[11px] text-accent-950/30 mt-2">— European Fund Administration Review, 2025</p>
              </div>
            </div>
          </RevealDiv>
        </div>
      </section>

      <SectionDivider />

      {/* ── SOLUTION ─────────────────────────── */}
      <section ref={solutionRef} className="relative py-28 md:py-40 overflow-hidden">
        <div className="absolute inset-0">
          <img ref={parallax2Ref} src={SOLUTION_BG} alt="" className="w-full h-[120%] object-cover will-change-transform" />
          <div className="absolute inset-0 bg-accent-950/[0.94]" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <RevealDiv className="text-center mb-20">
            <span className="text-[11px] font-mono text-[#D8BA8E] tracking-[0.2em] uppercase mb-4 block">The Solution</span>
            <h2 className="text-on-photo text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.08] max-w-4xl mx-auto">
              Caelith replaces spreadsheet compliance with{' '}
              <span className="gradient-text-animate font-serif italic">deterministic enforcement</span>.
            </h2>
          </RevealDiv>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SOLUTION_METRICS.map((m, i) => (
              <RevealDiv key={m.label} delay={i * 100}>
                <div className="bg-white/[0.05] backdrop-blur-sm rounded-xl p-7 border border-white/[0.08] text-center hover:bg-white/[0.08] transition-all group">
                  <div className="text-3xl md:text-4xl font-bold text-[#D8BA8E] font-mono mb-2">
                    {m.static ? (m.suffix || '0') : `${m.prefix}${i === 0 ? counter50 : counter100}${m.suffix}`}
                  </div>
                  <div className="text-[10px] text-white/40 uppercase tracking-[0.15em]">{m.label}</div>
                </div>
              </RevealDiv>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────── */}
      <section id="features" className="py-28 md:py-40 px-6">
        <div className="max-w-6xl mx-auto space-y-32">
          {FEATURES.map((feature, i) => (
            <RevealDiv key={feature.tag}>
              <div className={`flex flex-col ${i % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-12 md:gap-20 items-center`}>
                <div className="flex-1">
                  <span className="text-[11px] font-mono text-[#D8BA8E] tracking-[0.2em] uppercase mb-4 block">{feature.tag}</span>
                  <h3 className="text-2xl md:text-4xl lg:text-5xl font-bold text-accent-950 leading-[1.1] mb-5">
                    {feature.headline[0]}<br /><span className="font-serif italic text-accent-950/70">{feature.headline[1]}</span>
                  </h3>
                  <p className="text-sm text-accent-950/55 leading-relaxed mb-8 max-w-md">{feature.description}</p>
                  <ul className="space-y-3">
                    {feature.items.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-accent-950/65">
                        <svg className="w-4 h-4 text-[#D8BA8E] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex-1 w-full">
                  {i === 0 && (
                    <div className="code-shimmer bg-accent-950 rounded-2xl p-7 font-mono text-xs text-white/70 space-y-2 shadow-2xl shadow-accent-950/50 border border-white/[0.04]">
                      <div className="text-[#D8BA8E]/50 mb-3">{'// Investment limit rule - KAGB Sec. 225'}</div>
                      <div><span className="text-emerald-400">rule</span> <span className="text-white">single_asset_limit</span> {'{'}</div>
                      <div className="pl-4"><span className="text-sky-400">jurisdiction</span>: <span className="text-amber-300">&quot;DE&quot;</span></div>
                      <div className="pl-4"><span className="text-sky-400">regulation</span>: <span className="text-amber-300">&quot;KAGB §225&quot;</span></div>
                      <div className="pl-4"><span className="text-sky-400">condition</span>: <span className="text-white">asset.weight &lt;= 0.05</span></div>
                      <div className="pl-4"><span className="text-sky-400">breach_action</span>: <span className="text-amber-300">&quot;BLOCK&quot;</span></div>
                      <div>{'}'}</div>
                      <div className="mt-4 pt-3 border-t border-white/[0.06] text-emerald-400/80 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Rule compiled · Enforcing across 12 funds
                      </div>
                    </div>
                  )}
                  {i === 1 && (
                    <div className="code-shimmer bg-accent-950 rounded-2xl p-7 shadow-2xl shadow-accent-950/50 space-y-3 border border-white/[0.04]">
                      {[
                        { hash: '7f3a...c291', action: 'PRE_TRADE_CHECK', result: 'PASS', time: '14:23:07.441' },
                        { hash: 'b8e1...4f0d', action: 'LIMIT_BREACH_EVAL', result: 'PASS', time: '14:23:07.443' },
                        { hash: '2c9d...a817', action: 'REGULATORY_SNAP', result: 'LOGGED', time: '14:23:07.444' },
                        { hash: 'e4b7...31fa', action: 'DECISION_SIGNED', result: 'SEALED', time: '14:23:07.445' },
                      ].map((entry) => (
                        <div key={entry.hash} className="flex items-center gap-3 text-xs font-mono">
                          <span className="text-white/20 w-24 shrink-0">{entry.time}</span>
                          <span className="text-[#D8BA8E]/50 w-24 shrink-0">{entry.hash}</span>
                          <span className="text-white/45 flex-1">{entry.action}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${entry.result === 'PASS' ? 'bg-emerald-500/15 text-emerald-400' : entry.result === 'SEALED' ? 'bg-[#D8BA8E]/15 text-[#D8BA8E]' : 'bg-sky-500/15 text-sky-400'}`}>{entry.result}</span>
                        </div>
                      ))}
                      <div className="pt-3 border-t border-white/[0.06] text-[10px] font-mono text-white/20">Chain: 4 decisions · Integrity: SHA-256 · Tamper-proof</div>
                    </div>
                  )}
                  {i === 2 && (
                    <div className="code-shimmer bg-accent-950 rounded-2xl p-7 shadow-2xl shadow-accent-950/50 border border-white/[0.04]">
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { reg: 'AIFMD II', articles: 47, color: 'emerald' },
                          { reg: 'KAGB', articles: 32, color: 'emerald' },
                          { reg: 'ELTIF 2.0', articles: 18, color: 'emerald' },
                          { reg: 'CSSF', articles: 12, color: 'emerald' },
                          { reg: 'DORA', articles: 24, color: 'amber' },
                          { reg: 'MiCA', articles: 15, color: 'amber' },
                        ].map((r) => (
                          <div key={r.reg} className="bg-white/[0.04] rounded-lg p-3 text-center border border-white/[0.04]">
                            <div className="text-[11px] font-semibold text-white/70 mb-1">{r.reg}</div>
                            <div className="text-xl font-bold text-[#D8BA8E] font-mono">{r.articles}</div>
                            <div className={`text-[9px] font-mono mt-0.5 ${r.color === 'emerald' ? 'text-emerald-400/70' : 'text-amber-400/70'}`}>{r.color === 'emerald' ? 'ACTIVE' : 'PLANNED'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </RevealDiv>
          ))}
        </div>
      </section>

      <SectionDivider />

      {/* ── HOW IT WORKS ─────────────────────────── */}
      <section id="how-it-works" className="py-28 md:py-40 px-6">
        <div className="max-w-5xl mx-auto">
          <RevealDiv className="text-center mb-20">
            <span className="text-[11px] font-mono text-[#D8BA8E] tracking-[0.2em] uppercase mb-4 block">How It Works</span>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-accent-950">
              Three steps to <span className="font-serif italic">provable</span> compliance.
            </h2>
          </RevealDiv>

          <div className="grid md:grid-cols-3 gap-12">
            {STEPS.map((step, i) => (
              <RevealDiv key={step.num} delay={i * 120}>
                <div className="text-center">
                  <div className="text-7xl md:text-8xl font-bold text-[#D8BA8E]/[0.08] font-mono mb-4 leading-none">{step.num}</div>
                  <h3 className="text-xl font-semibold text-accent-950 mb-3">{step.title}</h3>
                  <p className="text-sm text-accent-950/50 leading-relaxed">{step.description}</p>
                </div>
              </RevealDiv>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── TESTIMONIAL ─────────────────────────── */}
      <section className="py-28 md:py-40 px-6">
        <div className="max-w-4xl mx-auto">
          <RevealDiv className="text-center">
            <svg className="w-12 h-12 text-[#D8BA8E]/20 mx-auto mb-10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609L9.978 5.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H0z" />
            </svg>
            <blockquote className="font-serif text-2xl md:text-4xl lg:text-[2.75rem] font-normal text-accent-950 leading-[1.3] mb-10">
              &ldquo;We moved from a 40-page Excel compliance workbook to Caelith in two weeks. Our last CSSF audit took 45 minutes instead of three days.&rdquo;
            </blockquote>
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent-950/[0.06] flex items-center justify-center">
                <span className="text-sm font-semibold text-accent-950/60">MW</span>
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-accent-950">Dr. Marcus Weber</div>
                <div className="text-xs text-accent-950/40">Head of Risk & Compliance, Rhine Capital Partners</div>
                <div className="text-[10px] text-accent-950/25 mt-0.5 italic">Composite illustration</div>
              </div>
            </div>
          </RevealDiv>
        </div>
      </section>

      <SectionDivider />

      {/* ── PRICING ─────────────────────────── */}
      <section id="pricing" className="py-28 md:py-40 px-6">
        <div className="max-w-6xl mx-auto">
          <RevealDiv className="text-center mb-20">
            <span className="text-[11px] font-mono text-[#D8BA8E] tracking-[0.2em] uppercase mb-4 block">Pricing</span>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-accent-950 mb-4">
              Simple, <span className="font-serif italic">transparent</span> pricing.
            </h2>
            <p className="text-sm text-accent-950/45 max-w-lg mx-auto">Start free. Upgrade when ready. No hidden fees.</p>
          </RevealDiv>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {PRICING_TIERS.map((tier, i) => (
              <RevealDiv key={tier.name} delay={i * 120}>
                <MagneticCard className={`relative rounded-2xl p-8 flex flex-col ${tier.highlighted ? 'glow-border bg-accent-950 text-white shadow-2xl shadow-accent-950/30 md:-mt-4 md:mb-4' : 'bg-white/60 backdrop-blur-sm border border-[#c6beb1]/20'}`}>
                  {tier.highlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1 rounded-full bg-[#D8BA8E] text-accent-900 text-[10px] font-bold uppercase tracking-[0.15em]">Most Popular</div>
                  )}
                  <div className="mb-8">
                    <h3 className={`text-base font-semibold mb-1 ${tier.highlighted ? 'text-white' : 'text-accent-950'}`}>{tier.name}</h3>
                    <p className={`text-xs mb-5 ${tier.highlighted ? 'text-white/40' : 'text-accent-950/40'}`}>{tier.description}</p>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl font-bold font-mono ${tier.highlighted ? 'text-[#D8BA8E]' : 'text-accent-950'}`}>
                        {tier.price > 0 ? `€${tier.price}` : 'Custom'}
                      </span>
                      <span className={`text-sm ${tier.highlighted ? 'text-white/30' : 'text-accent-950/30'}`}>{tier.period}</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {tier.features.map((f) => (
                      <li key={f} className={`flex items-start gap-2.5 text-sm ${tier.highlighted ? 'text-white/65' : 'text-accent-950/55'}`}>
                        <svg className="w-4 h-4 mt-0.5 shrink-0 text-[#D8BA8E]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button className={`w-full py-3.5 rounded-full text-sm font-semibold transition-all ${tier.highlighted ? 'bg-[#D8BA8E] text-accent-900 hover:bg-[#c9a878]' : 'bg-accent-950 text-white hover:bg-accent-950/90'}`}>{tier.cta}</button>
                </MagneticCard>
              </RevealDiv>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────── */}
      <section className="relative py-28 md:py-40 overflow-hidden">
        <div className="absolute inset-0">
          <img src={CTA_BG} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-accent-950/[0.94]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <RevealDiv>
            <h2 className="text-on-photo text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              <span className="font-serif italic">Provably compliant.</span><br /><span className="gradient-text-animate">Start today.</span>
            </h2>
            <p className="text-on-photo-subtle text-white/40 text-lg mb-12 max-w-xl mx-auto">
              Join the firms replacing spreadsheet compliance with deterministic enforcement.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => scrollTo('pricing')} className="rounded-full bg-[#D8BA8E] px-10 py-4 text-sm font-semibold text-accent-900 shadow-xl shadow-[#D8BA8E]/15 hover:bg-[#c9a878] transition-all">Get Started Free →</button>
              <button onClick={() => scrollTo('signin')} className="rounded-full border border-white/15 px-10 py-4 text-sm font-medium text-white/70 hover:bg-white/[0.05] transition-all">Sign In</button>
            </div>
          </RevealDiv>
        </div>
      </section>

      {/* ── SIGN IN ─────────────────────────── */}
      <section id="signin" className="py-28 md:py-40 px-6">
        <div className="max-w-md mx-auto">
          <RevealDiv>
            <div className="text-center mb-10">
              <NorthStarGridMark className="w-10 h-10 text-accent-950 mx-auto mb-5" />
              <h2 className="text-2xl font-bold text-accent-950 mb-2">Welcome back</h2>
              <p className="text-sm text-accent-950/40">Sign in to your Caelith dashboard.</p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-5">
              {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200/60 text-sm text-red-700">{error}</div>}
              <div>
                <label htmlFor="email" className="block text-[11px] font-medium text-accent-950/50 mb-1.5 uppercase tracking-wider">Email</label>
                <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#c6beb1]/30 bg-white/50 text-sm text-accent-950 placeholder-accent-950/25 focus:border-[#D8BA8E] focus:ring-2 focus:ring-[#D8BA8E]/20 focus:outline-none transition-all"
                  placeholder="you@company.com" />
              </div>
              <div>
                <label htmlFor="password" className="block text-[11px] font-medium text-accent-950/50 mb-1.5 uppercase tracking-wider">Password</label>
                <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#c6beb1]/30 bg-white/50 text-sm text-accent-950 placeholder-accent-950/25 focus:border-[#D8BA8E] focus:ring-2 focus:ring-[#D8BA8E]/20 focus:outline-none transition-all"
                  placeholder="••••••••" />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-3.5 h-3.5 rounded border-[#c6beb1]/40 text-[#D8BA8E] focus:ring-[#D8BA8E]/30" />
                  <span className="text-xs text-accent-950/40">Remember me</span>
                </label>
                <a href="#" className="text-xs text-[#D8BA8E] hover:text-[#c9a878]">Forgot password?</a>
              </div>
              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-accent-950 text-white font-semibold text-sm hover:bg-accent-950/90 transition-all disabled:opacity-50">{loading ? 'Signing in...' : 'Sign In'}</button>
            </form>

            <p className="text-center text-xs text-accent-950/30 mt-8">
              Don&apos;t have an account? <button onClick={() => scrollTo('pricing')} className="text-[#D8BA8E] hover:text-[#c9a878] font-medium">Get started</button>
            </p>
          </RevealDiv>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────── */}
      <footer className="border-t border-[#c6beb1]/20 relative">
        {/* Animated gradient line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#D8BA8E]/40 to-transparent" />
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <NorthStarGridMark className="w-6 h-6 text-accent-950" />
                <span className="text-sm font-semibold text-accent-950 tracking-tight">Caelith</span>
              </div>
              <p className="text-xs text-accent-950/40 leading-relaxed">Deterministic compliance enforcement for alternative investment fund managers.</p>
            </div>
            {[
              { title: 'Product', links: [{ label: 'Rules Engine', id: 'features' }, { label: 'Decision Provenance', id: 'features' }, { label: 'Regulatory Intelligence', id: 'features' }, { label: 'API Docs', id: 'signin' }] },
              { title: 'Company', links: [{ label: 'About', id: 'how-it-works' }, { label: 'Contact', id: 'signin' }] },
              { title: 'Legal', links: [{ label: 'Privacy Policy', id: 'signin' }, { label: 'Terms of Service', id: 'signin' }] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-[10px] font-semibold text-accent-950 uppercase tracking-[0.15em] mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (<li key={l.label}><button onClick={() => scrollTo(l.id)} className="text-xs text-accent-950/40 hover:text-accent-950 transition-colors">{l.label}</button></li>))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-[#c6beb1]/15 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-accent-950/25">© {new Date().getFullYear()} Caelith GmbH. All rights reserved.</p>
            <p className="text-[11px] text-accent-950/30">Made in Frankfurt am Main 🇩🇪</p>
          </div>
        </div>
      </footer>

      {/* ── FLOATING CTA ─────────────────────────── */}
      {showFloatingCta && (
        <div className="fixed bottom-6 right-6 z-50 floating-cta hidden md:block">
          <button onClick={() => scrollTo('pricing')} className="px-6 py-3 rounded-full bg-[#D8BA8E] text-accent-900 font-semibold text-sm shadow-xl shadow-[#D8BA8E]/25 hover:bg-[#c9a878] transition-all flex items-center gap-2">
            Get Started <span>→</span>
          </button>
        </div>
      )}
    </div>
  );
}
