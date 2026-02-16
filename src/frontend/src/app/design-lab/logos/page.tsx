import Link from 'next/link';

type LogoMarkProps = {
  className: string;
};

type LogoConcept = {
  id: string;
  name: string;
  positioning: string;
  rationale: string;
  Mark: ({ className }: LogoMarkProps) => JSX.Element;
};

function CircuitCrest({ className }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" aria-hidden="true">
      <path d="M60 10L97 28V61C97 83 80 102 60 110C40 102 23 83 23 61V28L60 10Z" fill="#E5E0BC" stroke="#3F3933" strokeWidth="6" />
      <circle cx="60" cy="60" r="17" fill="#D8BA8E" stroke="#3F3933" strokeWidth="6" />
      <path d="M60 30V43M60 77V90M30 60H43M77 60H90" stroke="#3F3933" strokeWidth="6" strokeLinecap="round" />
      <circle cx="60" cy="43" r="4" fill="#3F3933" />
      <circle cx="60" cy="77" r="4" fill="#3F3933" />
      <circle cx="43" cy="60" r="4" fill="#3F3933" />
      <circle cx="77" cy="60" r="4" fill="#3F3933" />
    </svg>
  );
}

function LedgerKnot({ className }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" aria-hidden="true">
      <rect x="18" y="18" width="84" height="84" rx="24" fill="#E3DDD9" stroke="#3F3933" strokeWidth="6" />
      <path d="M32 47H88M32 73H88" stroke="#3F3933" strokeWidth="6" strokeLinecap="round" />
      <path d="M46 34V86M74 34V86" stroke="#BDB0A4" strokeWidth="8" strokeLinecap="round" />
      <circle cx="46" cy="60" r="8" fill="#D8BA8E" stroke="#3F3933" strokeWidth="4" />
      <circle cx="74" cy="60" r="8" fill="#D8BA8E" stroke="#3F3933" strokeWidth="4" />
    </svg>
  );
}

function AtlasPulse({ className }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" aria-hidden="true">
      <path d="M60 12L97 33V75L60 108L23 75V33L60 12Z" fill="#DDE2E5" stroke="#3F3933" strokeWidth="6" />
      <path d="M25 62H45L53 44L65 77L74 57H95" stroke="#3F3933" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="25" cy="62" r="4" fill="#3F3933" />
      <circle cx="95" cy="62" r="4" fill="#3F3933" />
    </svg>
  );
}

function QuantOrbit({ className }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="42" fill="#F2EFE0" stroke="#3F3933" strokeWidth="6" />
      <circle cx="60" cy="60" r="24" stroke="#5E544A" strokeWidth="6" />
      <path d="M24 50C31 36 44 27 60 27C76 27 89 36 96 50" stroke="#3F3933" strokeWidth="6" strokeLinecap="round" />
      <circle cx="96" cy="50" r="7" fill="#D8BA8E" stroke="#3F3933" strokeWidth="4" />
      <path d="M60 60L74 45" stroke="#3F3933" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function PillarFlux({ className }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" aria-hidden="true">
      <rect x="16" y="16" width="88" height="88" rx="24" fill="#E5E0BC" stroke="#3F3933" strokeWidth="6" />
      <rect x="32" y="62" width="14" height="28" rx="4" fill="#5E544A" />
      <rect x="53" y="48" width="14" height="42" rx="4" fill="#5E544A" />
      <rect x="74" y="34" width="14" height="56" rx="4" fill="#5E544A" />
      <path d="M28 34H92" stroke="#3F3933" strokeWidth="6" strokeLinecap="round" />
      <circle cx="32" cy="34" r="4" fill="#D8BA8E" />
      <circle cx="60" cy="34" r="4" fill="#D8BA8E" />
      <circle cx="88" cy="34" r="4" fill="#D8BA8E" />
    </svg>
  );
}

function BoundaryLink({ className }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" aria-hidden="true">
      <rect x="18" y="18" width="84" height="84" rx="20" fill="#E3DDD9" stroke="#3F3933" strokeWidth="6" />
      <path d="M40 36H30V84H40M80 36H90V84H80" stroke="#3F3933" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="60" cy="60" r="12" fill="#D8BA8E" stroke="#3F3933" strokeWidth="6" />
      <path d="M48 60H72" stroke="#3F3933" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function VectorMonogram({ className }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" aria-hidden="true">
      <rect x="16" y="16" width="88" height="88" rx="24" fill="#F2EFE0" stroke="#3F3933" strokeWidth="6" />
      <path d="M81 38C75 32 68 29 59 29C42 29 29 42 29 59C29 76 42 89 59 89C68 89 75 86 81 80" stroke="#3F3933" strokeWidth="8" strokeLinecap="round" />
      <path d="M67 76L81 44L93 76" stroke="#5E544A" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M72 64H89" stroke="#5E544A" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function NorthStarGrid({ className }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" aria-hidden="true">
      <rect x="16" y="16" width="88" height="88" rx="24" fill="#DDE2E5" stroke="#3F3933" strokeWidth="6" />
      <path d="M30 40H90M30 60H90M30 80H90M40 30V90M60 30V90M80 30V90" stroke="#BDB0A4" strokeWidth="3" />
      <path d="M60 30L65 55L90 60L65 65L60 90L55 65L30 60L55 55L60 30Z" fill="#D8BA8E" stroke="#3F3933" strokeWidth="5" strokeLinejoin="round" />
      <circle cx="60" cy="60" r="4" fill="#3F3933" />
    </svg>
  );
}

const LOGOS: LogoConcept[] = [
  {
    id: 'L1',
    name: 'Circuit Crest',
    positioning: 'Security-forward seal for a compliance command platform.',
    rationale: 'Communicates trust, governance, and decisive system control.',
    Mark: CircuitCrest,
  },
  {
    id: 'L2',
    name: 'Ledger Knot',
    positioning: 'Interlocked records and audit continuity.',
    rationale: 'Emphasizes immutable decision trails and structural integrity.',
    Mark: LedgerKnot,
  },
  {
    id: 'L3',
    name: 'Atlas Pulse',
    positioning: 'Global rails with real-time compliance pulse.',
    rationale: 'Signals cross-border coverage and machine-assisted monitoring.',
    Mark: AtlasPulse,
  },
  {
    id: 'L4',
    name: 'Quant Orbit',
    positioning: 'Analytical core with orbital governance checks.',
    rationale: 'Balances technical precision with a premium fintech tone.',
    Mark: QuantOrbit,
  },
  {
    id: 'L5',
    name: 'Pillar Flux',
    positioning: 'Portfolio growth framed by policy boundaries.',
    rationale: 'Reads clearly in dashboards and KPI-heavy product surfaces.',
    Mark: PillarFlux,
  },
  {
    id: 'L6',
    name: 'Boundary Link',
    positioning: 'Tenant boundaries and controlled transfer pathways.',
    rationale: 'Strong fit for multi-tenant assurance and risk containment.',
    Mark: BoundaryLink,
  },
  {
    id: 'L7',
    name: 'Vector Monogram',
    positioning: 'Brand-first Caelith monogram for premium identity.',
    rationale: 'Most flexible lockup for marketing and product branding.',
    Mark: VectorMonogram,
  },
  {
    id: 'L8',
    name: 'North Star Grid',
    positioning: 'Strategic compliance direction over structured data.',
    rationale: 'Best option for enterprise credibility and executive decks.',
    Mark: NorthStarGrid,
  },
];

export default function LogoDesignLabPage() {
  return (
    <div className="min-h-screen bg-[#ECE8DF] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1320px]">
        <header className="mb-6 rounded-2xl border border-[#C6BEB1] bg-[#F5F1E8] p-5 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5A524B]">
            Caelith Design Lab
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#2E2823] md:text-3xl">
            Logo Exploration
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5A524B]">
            Eight logo concepts aligned to the Quietude palette and Caelith product direction.
            Each option includes icon, lockup, and UI-context previews for fast executive selection.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/design-lab/quietude"
              className="rounded-lg border border-[#BDB4A6] bg-[#E8E3D7] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#433D37] transition hover:bg-[#DED7CA]"
            >
              View UI Variants
            </Link>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          {LOGOS.map((logo) => (
            <article key={logo.id} className="rounded-2xl border border-[#C6BEB1] bg-[#F8F4EB] p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6A6259]">
                    {logo.id}
                  </p>
                  <h2 className="text-lg font-semibold text-[#2D2722]">
                    {logo.name}
                  </h2>
                  <p className="text-sm text-[#5A524B]">{logo.positioning}</p>
                </div>
                <div className="rounded-lg border border-[#BDB4A6] bg-[#E8E3D7] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#433D37]">
                  Candidate
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-[#CDC4B4] bg-[#EAE5D8] p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <logo.Mark className="h-14 w-14" />
                    <div>
                      <p className="text-base font-semibold tracking-tight text-[#2D2722]">Caelith</p>
                      <p className="text-xs uppercase tracking-[0.12em] text-[#5A524B]">Private Asset Registry</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#5A524B]">{logo.rationale}</p>
                </div>

                <div className="rounded-xl border border-[#CDC4B4] bg-[#F2EEE3] p-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6A6259]">
                    Product Usage
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-lg border border-[#CCC3B3] bg-[#E8E3D7] p-2">
                      <logo.Mark className="h-8 w-8" />
                      <span className="text-xs font-semibold text-[#2D2722]">Sidebar brand lockup</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-[#CCC3B3] bg-[#E8E3D7] p-2">
                      <div className="rounded-md bg-[#D8BA8E] p-1.5">
                        <logo.Mark className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-semibold text-[#2D2722]">App icon tile</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-[#CCC3B3] bg-[#E8E3D7] p-2">
                      <logo.Mark className="h-5 w-5" />
                      <span className="text-xs text-[#5A524B]">Login header treatment</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
