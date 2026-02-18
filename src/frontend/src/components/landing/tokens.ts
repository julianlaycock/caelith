/* ── Design tokens for the Caelith landing page ─────────────────── */

export const GOLD = '#D8BA8E';
export const GOLD_HOVER = '#c9a878';

/* ── Stock photos ─────────────────────────── */
export const HERO_BG = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80';
export const SOLUTION_BG = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80';
export const CTA_BG = 'https://images.unsplash.com/photo-1462206092226-f46025ffe607?w=1920&q=80';

/* ── AIFMD II deadline ─────────────────────────── */
export const AIFMD_DEADLINE = new Date('2026-04-16T00:00:00+02:00').getTime();

/* ── Navigation ─────────────────────────── */
export const NAV_LINKS = [
  { label: 'Product', id: 'features' },
  { label: 'How It Works', id: 'how-it-works' },
  { label: 'Pricing', id: 'pricing' },
];

/* ── Problem cards ─────────────────────────── */
export const PROBLEM_CARDS = [
  { icon: 'grid' as const, title: 'Spreadsheet Risk', description: 'Critical compliance decisions buried in Excel. No audit trail, no version control, no enforcement. One wrong formula means regulatory breach.' },
  { icon: 'zap' as const, title: 'Regulatory Velocity', description: 'AIFMD II, ELTIF 2.0, DORA \u2014 regulations shipping faster than your compliance team can read them. Manual processes cannot keep pace.' },
  { icon: 'shield' as const, title: 'Audit Exposure', description: 'When the regulator asks \u201cprove it,\u201d you need deterministic evidence \u2014 not a folder of screenshots and email threads.' },
];

/* ── Solution metrics ─────────────────────────── */
export const SOLUTION_METRICS = [
  { value: 50, suffix: 'ms', prefix: '< ', label: 'Rule evaluation time', static: false },
  { value: 100, suffix: '%', prefix: '', label: 'Decisions logged', static: false },
  { value: 6, suffix: '', prefix: '', label: 'Regulatory frameworks', static: true },
  { value: 4, suffix: '+', prefix: '', label: 'EU jurisdictions', static: true },
];

/* ── Features ─────────────────────────── */
export const FEATURES = [
  {
    tag: 'Rules Engine',
    headline: ['Configure once.', 'Enforce forever.'],
    description: 'Define compliance rules as deterministic logic \u2014 not guidelines. Every investment decision is evaluated against your complete ruleset in real time.',
    items: ['Pre-trade & post-trade evaluation', 'Multi-jurisdiction rule stacking', 'Composite AND/OR/NOT rule logic', 'Version-controlled rule history'],
  },
  {
    tag: 'Decision Provenance',
    headline: ['Every decision', 'hash-chained.'],
    description: 'Every compliance decision produces a hash-chained, tamper-evident audit record. When regulators ask for documentation, you have a verifiable decision trail.',
    items: ['SHA-256 hash-chained decisions', 'Tamper-evident audit log', 'Point-in-time regulatory snapshots', 'One-click regulator export'],
  },
  {
    tag: 'Regulatory Intelligence',
    headline: ['AIFMD II. KAGB.', 'ELTIF 2.0.'],
    description: 'Pre-built regulatory modules covering the full European alternative investment landscape. New regulations modeled before enforcement dates.',
    items: ['AIFMD II eligibility & reporting', 'KAGB investment limits', 'ELTIF 2.0 eligibility rules', 'Annex IV reporting automation'],
  },
];

/* ── Steps ─────────────────────────── */
export const STEPS = [
  { num: '01', title: 'Configure', description: 'Define fund structures, regulatory jurisdictions, and compliance rules. Our rule builder translates legal text into deterministic logic.' },
  { num: '02', title: 'Onboard', description: 'Connect portfolio data, investor records, and counterparty information. Caelith integrates via API or file upload.' },
  { num: '03', title: 'Document', description: 'Every transaction evaluated in real time. Every decision logged. Every audit request answered with a verifiable decision trail.' },
];

/* ── Pricing ─────────────────────────── */
export const PRICING_TIERS = [
  { name: 'Starter', price: 299, period: '/mo', description: 'For emerging managers getting compliant.', features: ['Up to 3 funds', 'AIFMD II rules engine', 'Basic audit trail', 'Email support', 'Monthly reporting'], cta: 'Request Access', highlighted: false },
  { name: 'Professional', price: 799, period: '/mo', description: 'For growing firms with multi-fund complexity.', features: ['Up to 25 funds', 'Multi-framework rule engine', 'Hash-chained provenance', 'Priority support', 'API access', 'Custom rule builder'], cta: 'Request Access', highlighted: true },
  { name: 'Enterprise', price: 0, period: '', description: 'For institutional managers and service providers.', features: ['Unlimited funds', 'Multi-entity support', 'Dedicated infrastructure', 'Custom SLA terms', 'On-premise option', 'White-glove onboarding'], cta: 'Contact Us', highlighted: false },
];

/* ── Compliance workflows ─────────────────────────── */
export type WorkflowStatus = 'live' | 'pilot';

export interface Workflow {
  title: string;
  role: string;
  jurisdiction: string;
  output: string;
  status: WorkflowStatus;
}

export const WORKFLOWS: Workflow[] = [
  { title: 'Investor Eligibility Check', role: 'Compliance Officer', jurisdiction: 'AIFMD II, KAGB', output: 'Eligibility Report', status: 'live' },
  { title: 'Pre-Trade Rule Evaluation', role: 'Risk Manager', jurisdiction: 'Multi-jurisdiction', output: 'Decision Record', status: 'live' },
  { title: 'Hash-Chained Audit Trail', role: 'Compliance Officer', jurisdiction: 'All frameworks', output: 'Tamper-evident Log', status: 'live' },
  { title: 'Regulatory Reporting', role: 'Fund Administrator', jurisdiction: 'AIFMD II (Annex IV)', output: 'Regulatory Report', status: 'pilot' },
  { title: 'Fund Structure Validation', role: 'Fund Administrator', jurisdiction: 'ELTIF 2.0, SIF Law', output: 'Validation Report', status: 'live' },
  { title: 'Scenario Modeling', role: 'Risk Manager', jurisdiction: 'Multi-jurisdiction', output: 'What-if Analysis', status: 'pilot' },
];

/* ── Trust credentials ─────────────────────────── */
export const TRUST_ITEMS = [
  { icon: 'hash' as const, label: 'SHA-256 Hash-Chained', sublabel: 'Tamper-evident decision records' },
  { icon: 'cpu' as const, label: 'Deterministic Evaluation', sublabel: 'Same input, same output, every time' },
  { icon: 'user' as const, label: 'Human-in-the-Loop', sublabel: 'AI outputs require verification' },
  { icon: 'server' as const, label: 'EU-Hosted Infrastructure', sublabel: 'EU-hosted data processing' },
];

/* ── Framework coverage ─────────────────────────── */
export const FRAMEWORKS = ['AIFMD II', 'KAGB', 'ELTIF 2.0', 'Annex IV', 'SIF Law', 'RAIF Law'];
