'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuth } from '../../components/auth-provider';

const REMEMBER_KEY = 'caelith_remember';

/* ── Unsplash stock photos ─────────────────────────── */
const HERO_BG = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80';
const SOLUTION_BG = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80';
const CTA_BG = 'https://images.unsplash.com/photo-1462206092226-f46025ffe607?w=1920&q=80';

/* ── NorthStar Logo (inline SVG) ─────────────────────────── */
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

/* ── useReveal hook ─────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); obs.unobserve(el); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function RevealDiv({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const ref = useReveal();
  return <div ref={ref} className={`reveal ${className}`} {...props}>{children}</div>;
}

/* ── Data ─────────────────────────── */
const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
];

const TRUST_BADGES = ['AIFMD II', 'KAGB', 'CSSF', 'Annex IV'];

const PROBLEM_CARDS = [
  {
    icon: '📊',
    title: 'Spreadsheet Risk',
    description: 'Critical compliance decisions buried in Excel. No audit trail, no version control, no enforcement. One wrong formula means regulatory breach.',
  },
  {
    icon: '⚡',
    title: 'Regulatory Velocity',
    description: 'AIFMD II, ELTIF 2.0, DORA — regulations are shipping faster than your compliance team can read them. Manual processes cannot keep pace.',
  },
  {
    icon: '🔍',
    title: 'Audit Exposure',
    description: 'When the regulator asks "prove it," you need deterministic evidence — not a folder of screenshots and email threads.',
  },
];

const SOLUTION_METRICS = [
  { value: '< 50ms', label: 'Rule evaluation time' },
  { value: '100%', label: 'Decision auditability' },
  { value: '0', label: 'Manual compliance steps' },
  { value: '∞', label: 'Regulatory scalability' },
];

const FEATURES = [
  {
    tag: 'Rules Engine',
    headline: 'Configure once. Enforce forever.',
    description: 'Define compliance rules as deterministic logic — not guidelines. Every investment decision is evaluated against your complete ruleset in real time, with zero manual intervention.',
    items: ['Pre-trade & post-trade enforcement', 'Multi-jurisdiction rule stacking', 'Breach prevention, not just detection', 'Version-controlled rule history'],
  },
  {
    tag: 'Decision Provenance',
    headline: 'Every decision hash-chained.',
    description: 'Every compliance decision produces an immutable, cryptographically signed audit record. When regulators ask for proof, you hand them a hash chain — not a spreadsheet.',
    items: ['SHA-256 hash-chained decisions', 'Tamper-evident audit log', 'Point-in-time regulatory snapshots', 'One-click regulator export'],
  },
  {
    tag: 'Regulatory Intelligence',
    headline: 'AIFMD II. KAGB. ELTIF 2.0.',
    description: 'Pre-built regulatory modules covering the full European alternative investment landscape. New regulations are modeled and deployed before enforcement dates.',
    items: ['AIFMD II full coverage', 'KAGB investment limits', 'ELTIF 2.0 eligibility rules', 'Annex IV reporting automation'],
  },
];

const STEPS = [
  { num: '01', title: 'Configure', description: 'Define your fund structures, regulatory jurisdictions, and compliance rules. Our rule builder translates legal text into deterministic logic.' },
  { num: '02', title: 'Onboard', description: 'Connect your portfolio data, investor records, and counterparty information. Caelith integrates with your existing systems via API or file upload.' },
  { num: '03', title: 'Prove', description: 'Every transaction is evaluated in real time. Every decision is logged. Every audit request is answered with cryptographic proof.' },
];

const PRICING_TIERS = [
  {
    name: 'Starter',
    price: '€299',
    period: '/mo',
    description: 'For emerging managers getting compliant.',
    features: ['Up to 3 funds', 'AIFMD II rules engine', 'Basic audit trail', 'Email support', 'Monthly reporting'],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '€799',
    period: '/mo',
    description: 'For growing firms with multi-fund complexity.',
    features: ['Up to 25 funds', 'Full regulatory coverage', 'Hash-chained provenance', 'Priority support', 'API access', 'Custom rule builder'],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For institutional managers and service providers.',
    features: ['Unlimited funds', 'Multi-entity support', 'Dedicated infrastructure', 'SLA guarantee', 'On-premise option', 'White-glove onboarding'],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

/* ── Main Component ─────────────────────────── */
export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();

  // Nav state
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showFloatingCta, setShowFloatingCta] = useState(false);

  // Sign-in form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load remembered email
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.email) { setEmail(parsed.email); setRememberMe(true); }
      }
    } catch {}
  }, []);

  // Scroll listener
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      setShowFloatingCta(window.scrollY > 800);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Sign-in handler
  const handleSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(email, password);
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email }));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      setUser(res.user);
      router.push('/');
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, password, rememberMe, router, setUser]);

  const scrollTo = useCallback((id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="landing-page min-h-screen bg-[#F5F2EA] text-[#2d2722]">
      {/* Grain overlay */}
      <div className="pointer-events-none fixed inset-0 z-[9999]" style={{ opacity: 0.03, mixBlendMode: 'overlay', backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

      {/* ── STICKY NAV ─────────────────────────── */}
      <nav className={`landing-nav fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'scrolled' : ''}`}>
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-2.5 group">
            <NorthStarGridMark className={`w-8 h-8 transition-colors ${scrolled ? 'text-accent-950' : 'text-white'}`} />
            <span className={`text-lg font-semibold tracking-tight transition-colors ${scrolled ? 'text-accent-950' : 'text-white'}`}>Caelith</span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={(e) => { e.preventDefault(); scrollTo(link.href.slice(1)); }}
                className={`text-sm font-medium transition-colors hover:opacity-70 ${scrolled ? 'text-accent-950/70' : 'text-white/70'}`}>
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => scrollTo('signin')}
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${scrolled ? 'text-accent-950 hover:bg-accent-950/5' : 'text-white hover:bg-white/10'}`}>
              Sign In
            </button>
            <button onClick={() => scrollTo('pricing')}
              className="text-sm font-medium px-5 py-2 rounded-lg bg-[#D8BA8E] text-accent-950 hover:bg-[#c9a97a] transition-all">
              Get Started
            </button>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <svg className={`w-6 h-6 ${scrolled ? 'text-accent-950' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#F5F2EA]/95 backdrop-blur-xl border-t border-[#c6beb1]/30 px-6 py-4 space-y-3">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={(e) => { e.preventDefault(); scrollTo(link.href.slice(1)); }}
                className="block text-sm font-medium text-accent-950/70 py-2">{link.label}</a>
            ))}
            <hr className="border-[#c6beb1]/30" />
            <button onClick={() => scrollTo('signin')} className="block w-full text-left text-sm font-medium text-accent-950 py-2">Sign In</button>
            <button onClick={() => scrollTo('pricing')} className="block w-full text-sm font-medium px-5 py-2.5 rounded-lg bg-[#D8BA8E] text-accent-950 text-center">Get Started</button>
          </div>
        )}
      </nav>

      {/* ── HERO ─────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img src={HERO_BG} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-accent-950/[0.95]" />
        </div>

        {/* Animated grid */}
        <div className="absolute inset-0 overflow-hidden opacity-[0.06]">
          <div className="animate-grid-scroll absolute -inset-40"
            style={{ backgroundImage: 'linear-gradient(rgba(216,186,142,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(216,186,142,0.3) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-32 pb-20">
          {/* Urgency badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D8BA8E]/15 border border-[#D8BA8E]/25 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#D8BA8E] animate-pulse" />
            <span className="text-xs font-medium text-[#D8BA8E] tracking-wide uppercase">AIFMD II Deadline — April 16, 2026</span>
          </div>

          <h1 className="text-on-photo text-4xl sm:text-5xl md:text-7xl font-bold text-white leading-[1.1] tracking-tight mb-6">
            The compliance engine<br />that <span className="text-[#D8BA8E]">proves</span> you&apos;re compliant.
          </h1>

          <p className="text-on-photo-subtle text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            Deterministic regulatory enforcement for alternative investment fund managers. Configure your rules. Caelith enforces them — and proves it.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <button onClick={() => scrollTo('pricing')}
              className="px-8 py-3.5 rounded-lg bg-[#D8BA8E] text-accent-950 font-semibold text-sm hover:bg-[#c9a97a] transition-all shadow-lg shadow-[#D8BA8E]/20">
              Start Free →
            </button>
            <button className="px-8 py-3.5 rounded-lg border border-white/20 text-white font-medium text-sm hover:bg-white/5 transition-all">
              Watch Demo
            </button>
          </div>

          {/* Trust strip */}
          <div className="flex items-center justify-center gap-6 mb-16">
            {TRUST_BADGES.map((badge) => (
              <span key={badge} className="text-xs font-mono text-white/30 tracking-widest uppercase">{badge}</span>
            ))}
          </div>

          {/* Mock dashboard screenshot */}
          <div className="relative mx-auto max-w-4xl screenshot-shine">
            <div className="rounded-xl border border-white/10 bg-accent-950/60 backdrop-blur-sm shadow-2xl shadow-black/40 overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
                <span className="ml-3 text-[10px] font-mono text-white/25">app.caelith.com/dashboard</span>
              </div>
              <div className="p-6 md:p-8 space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  {[{ l: 'Active Rules', v: '247' }, { l: 'Decisions Today', v: '1,893' }, { l: 'Compliance Rate', v: '100%' }, { l: 'Avg Latency', v: '23ms' }].map((m) => (
                    <div key={m.l} className="bg-white/5 rounded-lg p-3 text-center">
                      <div className="text-lg md:text-2xl font-bold text-[#D8BA8E] font-mono">{m.v}</div>
                      <div className="text-[10px] text-white/40 mt-1">{m.l}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 bg-white/5 rounded-lg p-4 h-32 flex items-end gap-1">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                      <div key={i} className="flex-1 bg-[#D8BA8E]/30 rounded-t" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 space-y-2">
                    {['AIFMD II', 'KAGB §§', 'ELTIF 2.0'].map((r) => (
                      <div key={r} className="flex items-center justify-between text-[10px]">
                        <span className="text-white/40">{r}</span>
                        <span className="text-emerald-400 font-mono">PASS</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll hint */}
          <div className="mt-12 animate-scroll-hint">
            <svg className="w-5 h-5 mx-auto text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </section>

      {/* ── PROBLEM SECTION ─────────────────────────── */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <RevealDiv className="text-center mb-16">
            <span className="text-xs font-mono text-[#D8BA8E] tracking-widest uppercase mb-4 block">The Problem</span>
            <h2 className="text-3xl md:text-5xl font-bold text-accent-950 leading-tight">
              €1.8T in EU AIF assets.<br />Compliance is still manual.
            </h2>
          </RevealDiv>

          <div className="grid md:grid-cols-3 gap-6">
            {PROBLEM_CARDS.map((card, i) => (
              <RevealDiv key={card.title} style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-[#c6beb1]/20 hover:border-[#D8BA8E]/30 transition-all hover:shadow-lg h-full">
                  <span className="text-3xl mb-4 block">{card.icon}</span>
                  <h3 className="text-lg font-semibold text-accent-950 mb-3">{card.title}</h3>
                  <p className="text-sm text-accent-950/60 leading-relaxed">{card.description}</p>
                </div>
              </RevealDiv>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ─────────────────────────── */}
      <section className="py-16 border-y border-[#c6beb1]/20 bg-white/30">
        <div className="max-w-6xl mx-auto px-6">
          <RevealDiv>
            <div className="grid md:grid-cols-4 gap-8 items-center">
              {[
                { value: '€1.8T', label: 'EU AIF Market' },
                { value: '4,000+', label: 'Licensed AIFMs' },
                { value: '59', label: 'Days to AIFMD II' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-accent-950 font-mono">{stat.value}</div>
                  <div className="text-xs text-accent-950/50 mt-1 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
              <div className="text-center md:text-left md:border-l md:border-[#c6beb1]/30 md:pl-8">
                <p className="text-sm text-accent-950/60 italic leading-relaxed">
                  &ldquo;The industry is moving from best-effort compliance to provable compliance. The firms that adapt will thrive.&rdquo;
                </p>
                <p className="text-xs text-accent-950/40 mt-2">— European Fund Administration Review, 2025</p>
              </div>
            </div>
          </RevealDiv>
        </div>
      </section>

      {/* ── SOLUTION SECTION ─────────────────────────── */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <img src={SOLUTION_BG} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-accent-950/[0.93]" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <RevealDiv className="text-center mb-16">
            <span className="text-xs font-mono text-[#D8BA8E] tracking-widest uppercase mb-4 block">The Solution</span>
            <h2 className="text-on-photo text-3xl md:text-5xl font-bold text-white leading-tight max-w-4xl mx-auto">
              Caelith replaces spreadsheet compliance with <span className="text-[#D8BA8E]">deterministic enforcement</span>.
            </h2>
          </RevealDiv>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SOLUTION_METRICS.map((m, i) => (
              <RevealDiv key={m.label} style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center hover:bg-white/10 transition-all">
                  <div className="text-3xl md:text-4xl font-bold text-[#D8BA8E] font-mono mb-2">{m.value}</div>
                  <div className="text-xs text-white/50 uppercase tracking-wider">{m.label}</div>
                </div>
              </RevealDiv>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────── */}
      <section id="features" className="py-24 md:py-32 px-6">
        <div className="max-w-6xl mx-auto space-y-24">
          {FEATURES.map((feature, i) => (
            <RevealDiv key={feature.tag}>
              <div className={`flex flex-col ${i % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-12 md:gap-16 items-center`}>
                {/* Text side */}
                <div className="flex-1">
                  <span className="text-xs font-mono text-[#D8BA8E] tracking-widest uppercase mb-3 block">{feature.tag}</span>
                  <h3 className="text-2xl md:text-4xl font-bold text-accent-950 leading-tight mb-4">{feature.headline}</h3>
                  <p className="text-sm text-accent-950/60 leading-relaxed mb-6">{feature.description}</p>
                  <ul className="space-y-3">
                    {feature.items.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-accent-950/70">
                        <svg className="w-4 h-4 text-[#D8BA8E] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Visual side */}
                <div className="flex-1 w-full">
                  {i === 0 && (
                    <div className="bg-accent-950 rounded-xl p-6 font-mono text-xs text-white/70 space-y-2 shadow-xl">
                      <div className="text-[#D8BA8E]/60 mb-3">// Investment limit rule — KAGB §225</div>
                      <div><span className="text-emerald-400">rule</span> <span className="text-white">single_asset_limit</span> {'{'}</div>
                      <div className="pl-4"><span className="text-sky-400">jurisdiction</span>: <span className="text-amber-300">&quot;DE&quot;</span></div>
                      <div className="pl-4"><span className="text-sky-400">regulation</span>: <span className="text-amber-300">&quot;KAGB §225&quot;</span></div>
                      <div className="pl-4"><span className="text-sky-400">condition</span>: <span className="text-white">asset.weight &lt;= 0.05</span></div>
                      <div className="pl-4"><span className="text-sky-400">breach_action</span>: <span className="text-amber-300">&quot;BLOCK&quot;</span></div>
                      <div>{'}'}</div>
                      <div className="mt-4 pt-3 border-t border-white/10 text-emerald-400">✓ Rule compiled · Enforcing across 12 funds</div>
                    </div>
                  )}
                  {i === 1 && (
                    <div className="bg-accent-950 rounded-xl p-6 shadow-xl space-y-3">
                      {[
                        { hash: '7f3a...c291', action: 'PRE_TRADE_CHECK', result: 'PASS', time: '14:23:07.441' },
                        { hash: 'b8e1...4f0d', action: 'LIMIT_BREACH_EVAL', result: 'PASS', time: '14:23:07.443' },
                        { hash: '2c9d...a817', action: 'REGULATORY_SNAP', result: 'LOGGED', time: '14:23:07.444' },
                        { hash: 'e4b7...31fa', action: 'DECISION_SIGNED', result: 'SEALED', time: '14:23:07.445' },
                      ].map((entry) => (
                        <div key={entry.hash} className="flex items-center gap-3 text-xs font-mono">
                          <span className="text-white/25 w-24 shrink-0">{entry.time}</span>
                          <span className="text-[#D8BA8E]/60 w-24 shrink-0">{entry.hash}</span>
                          <span className="text-white/50 flex-1">{entry.action}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${entry.result === 'PASS' ? 'bg-emerald-500/15 text-emerald-400' : entry.result === 'SEALED' ? 'bg-[#D8BA8E]/15 text-[#D8BA8E]' : 'bg-sky-500/15 text-sky-400'}`}>
                            {entry.result}
                          </span>
                        </div>
                      ))}
                      <div className="pt-3 border-t border-white/10 text-[10px] font-mono text-white/25">
                        Chain: 4 decisions · Integrity: SHA-256 · Tamper-proof
                      </div>
                    </div>
                  )}
                  {i === 2 && (
                    <div className="bg-accent-950 rounded-xl p-6 shadow-xl">
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { reg: 'AIFMD II', status: 'Active', articles: 47, color: 'emerald' },
                          { reg: 'KAGB', status: 'Active', articles: 32, color: 'emerald' },
                          { reg: 'ELTIF 2.0', status: 'Active', articles: 18, color: 'emerald' },
                          { reg: 'CSSF 24/856', status: 'Active', articles: 12, color: 'emerald' },
                          { reg: 'DORA', status: 'Planned', articles: 24, color: 'amber' },
                          { reg: 'MiCA', status: 'Planned', articles: 15, color: 'amber' },
                        ].map((r) => (
                          <div key={r.reg} className="bg-white/5 rounded-lg p-3 text-center">
                            <div className="text-xs font-semibold text-white/80 mb-1">{r.reg}</div>
                            <div className={`text-[10px] font-mono mb-2 ${r.color === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}`}>{r.status}</div>
                            <div className="text-lg font-bold text-[#D8BA8E] font-mono">{r.articles}</div>
                            <div className="text-[9px] text-white/30">articles</div>
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

      {/* ── HOW IT WORKS ─────────────────────────── */}
      <section id="how-it-works" className="py-24 md:py-32 px-6 bg-white/30 border-y border-[#c6beb1]/20">
        <div className="max-w-5xl mx-auto">
          <RevealDiv className="text-center mb-16">
            <span className="text-xs font-mono text-[#D8BA8E] tracking-widest uppercase mb-4 block">How It Works</span>
            <h2 className="text-3xl md:text-5xl font-bold text-accent-950">Three steps to provable compliance.</h2>
          </RevealDiv>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <RevealDiv key={step.num} style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="text-center">
                  <div className="text-5xl md:text-6xl font-bold text-[#D8BA8E]/20 font-mono mb-4">{step.num}</div>
                  <h3 className="text-xl font-semibold text-accent-950 mb-3">{step.title}</h3>
                  <p className="text-sm text-accent-950/60 leading-relaxed">{step.description}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:flex justify-center mt-8">
                    <svg className="w-8 h-8 text-[#D8BA8E]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                )}
              </RevealDiv>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ─────────────────────────── */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <RevealDiv className="text-center">
            <svg className="w-10 h-10 text-[#D8BA8E]/30 mx-auto mb-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609L9.978 5.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H0z" />
            </svg>
            <blockquote className="text-xl md:text-3xl font-semibold text-accent-950 leading-relaxed mb-8">
              &ldquo;We moved from a 40-page Excel compliance workbook to Caelith in two weeks. Our last CSSF audit took 45 minutes instead of three days. The regulator was impressed — so were our investors.&rdquo;
            </blockquote>
            <div>
              <div className="text-sm font-semibold text-accent-950">Dr. Marcus Weber</div>
              <div className="text-xs text-accent-950/50">Head of Risk & Compliance, Rhine Capital Partners</div>
            </div>
          </RevealDiv>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────── */}
      <section id="pricing" className="py-24 md:py-32 px-6 bg-white/30 border-y border-[#c6beb1]/20">
        <div className="max-w-6xl mx-auto">
          <RevealDiv className="text-center mb-16">
            <span className="text-xs font-mono text-[#D8BA8E] tracking-widest uppercase mb-4 block">Pricing</span>
            <h2 className="text-3xl md:text-5xl font-bold text-accent-950 mb-4">Simple, transparent pricing.</h2>
            <p className="text-sm text-accent-950/60 max-w-lg mx-auto">Start free. Upgrade when you&apos;re ready. No hidden fees, no per-transaction costs.</p>
          </RevealDiv>

          <div className="grid md:grid-cols-3 gap-6">
            {PRICING_TIERS.map((tier, i) => (
              <RevealDiv key={tier.name} style={{ transitionDelay: `${i * 100}ms` }}>
                <div className={`relative rounded-2xl p-8 h-full flex flex-col ${tier.highlighted
                  ? 'bg-accent-950 text-white border-2 border-[#D8BA8E]/30 shadow-xl shadow-accent-950/20'
                  : 'bg-white/60 backdrop-blur-sm border border-[#c6beb1]/20'}`}>
                  {tier.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#D8BA8E] text-accent-950 text-[10px] font-semibold uppercase tracking-wider">
                      Most Popular
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className={`text-lg font-semibold mb-1 ${tier.highlighted ? 'text-white' : 'text-accent-950'}`}>{tier.name}</h3>
                    <p className={`text-xs mb-4 ${tier.highlighted ? 'text-white/50' : 'text-accent-950/50'}`}>{tier.description}</p>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl font-bold font-mono ${tier.highlighted ? 'text-[#D8BA8E]' : 'text-accent-950'}`}>{tier.price}</span>
                      <span className={`text-sm ${tier.highlighted ? 'text-white/40' : 'text-accent-950/40'}`}>{tier.period}</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {tier.features.map((f) => (
                      <li key={f} className={`flex items-start gap-2.5 text-sm ${tier.highlighted ? 'text-white/70' : 'text-accent-950/60'}`}>
                        <svg className={`w-4 h-4 mt-0.5 shrink-0 ${tier.highlighted ? 'text-[#D8BA8E]' : 'text-[#D8BA8E]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button className={`w-full py-3 rounded-lg text-sm font-semibold transition-all ${tier.highlighted
                    ? 'bg-[#D8BA8E] text-accent-950 hover:bg-[#c9a97a]'
                    : 'bg-accent-950 text-white hover:bg-accent-950/90'}`}>
                    {tier.cta}
                  </button>
                </div>
              </RevealDiv>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ─────────────────────────── */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <img src={CTA_BG} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-accent-950/[0.93]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <RevealDiv>
            <h2 className="text-on-photo text-3xl md:text-5xl font-bold text-white mb-6">
              Provably compliant.<br /><span className="text-[#D8BA8E]">Start today.</span>
            </h2>
            <p className="text-on-photo-subtle text-white/50 text-lg mb-10 max-w-xl mx-auto">
              Join the firms replacing spreadsheet compliance with deterministic enforcement. AIFMD II is 59 days away.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => scrollTo('pricing')}
                className="px-8 py-3.5 rounded-lg bg-[#D8BA8E] text-accent-950 font-semibold text-sm hover:bg-[#c9a97a] transition-all shadow-lg shadow-[#D8BA8E]/20">
                Get Started Free →
              </button>
              <button onClick={() => scrollTo('signin')}
                className="px-8 py-3.5 rounded-lg border border-white/20 text-white font-medium text-sm hover:bg-white/5 transition-all">
                Sign In
              </button>
            </div>
          </RevealDiv>
        </div>
      </section>

      {/* ── SIGN-IN FORM ─────────────────────────── */}
      <section id="signin" className="py-24 md:py-32 px-6">
        <div className="max-w-md mx-auto">
          <RevealDiv>
            <div className="text-center mb-8">
              <NorthStarGridMark className="w-10 h-10 text-accent-950 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-accent-950 mb-2">Welcome back</h2>
              <p className="text-sm text-accent-950/50">Sign in to your Caelith dashboard.</p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
              )}

              <div>
                <label htmlFor="email" className="block text-xs font-medium text-accent-950/60 mb-1.5">Email</label>
                <input
                  id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#c6beb1]/40 bg-white/60 text-sm text-accent-950 placeholder-accent-950/30 focus:border-[#D8BA8E] focus:ring-1 focus:ring-[#D8BA8E]/30 focus:outline-none transition-all"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium text-accent-950/60 mb-1.5">Password</label>
                <input
                  id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#c6beb1]/40 bg-white/60 text-sm text-accent-950 placeholder-accent-950/30 focus:border-[#D8BA8E] focus:ring-1 focus:ring-[#D8BA8E]/30 focus:outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-[#c6beb1]/40 text-[#D8BA8E] focus:ring-[#D8BA8E]/30" />
                  <span className="text-xs text-accent-950/50">Remember me</span>
                </label>
                <a href="#" className="text-xs text-[#D8BA8E] hover:text-[#c9a97a] transition-colors">Forgot password?</a>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-lg bg-accent-950 text-white font-semibold text-sm hover:bg-accent-950/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-xs text-accent-950/40 mt-6">
              Don&apos;t have an account? <button onClick={() => scrollTo('pricing')} className="text-[#D8BA8E] hover:text-[#c9a97a] font-medium transition-colors">Get started</button>
            </p>
          </RevealDiv>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────── */}
      <footer className="border-t border-[#c6beb1]/20 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <NorthStarGridMark className="w-6 h-6 text-accent-950" />
                <span className="text-sm font-semibold text-accent-950">Caelith</span>
              </div>
              <p className="text-xs text-accent-950/50 leading-relaxed">
                Deterministic compliance enforcement for alternative investment fund managers.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-accent-950 uppercase tracking-wider mb-4">Product</h4>
              <ul className="space-y-2">
                {['Rules Engine', 'Decision Provenance', 'Regulatory Intelligence', 'API Documentation'].map((l) => (
                  <li key={l}><a href="#" className="text-xs text-accent-950/50 hover:text-accent-950 transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-accent-950 uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-2">
                {['About', 'Blog', 'Careers', 'Contact'].map((l) => (
                  <li key={l}><a href="#" className="text-xs text-accent-950/50 hover:text-accent-950 transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-accent-950 uppercase tracking-wider mb-4">Legal</h4>
              <ul className="space-y-2">
                {['Privacy Policy', 'Terms of Service', 'Data Processing', 'Security'].map((l) => (
                  <li key={l}><a href="#" className="text-xs text-accent-950/50 hover:text-accent-950 transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-[#c6beb1]/20 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-accent-950/30">© {new Date().getFullYear()} Caelith GmbH. All rights reserved.</p>
            <p className="text-[10px] text-accent-950/30">Made in Frankfurt am Main 🇩🇪</p>
          </div>
        </div>
      </footer>

      {/* ── FLOATING CTA ─────────────────────────── */}
      {showFloatingCta && (
        <div className="fixed bottom-6 right-6 z-50 floating-cta">
          <button onClick={() => scrollTo('pricing')}
            className="px-6 py-3 rounded-full bg-[#D8BA8E] text-accent-950 font-semibold text-sm shadow-xl shadow-[#D8BA8E]/25 hover:bg-[#c9a97a] transition-all flex items-center gap-2">
            Get Started
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
