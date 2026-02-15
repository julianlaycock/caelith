import Link from 'next/link';
import { QuietudeVariant } from './variants';

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;
  const int = Number.parseInt(value, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function aaStatus(ratio: number): string {
  return ratio >= 4.5 ? `Pass (${ratio.toFixed(2)}:1)` : `Fail (${ratio.toFixed(2)}:1)`;
}

export function QuietudeRender({
  variant,
  showTopNav = true,
}: {
  variant: QuietudeVariant;
  showTopNav?: boolean;
}) {
  const { tokens } = variant;
  const textOnSurface = contrastRatio(tokens.textPrimary, tokens.surfaceElevated);
  const textOnAccent = contrastRatio(tokens.textPrimary, tokens.accent);
  const secondaryOnBg = contrastRatio(tokens.textSecondary, tokens.bg);
  const checks = [
    { label: 'Primary text on elevated surface', status: aaStatus(textOnSurface) },
    { label: 'Primary text on accent chip', status: aaStatus(textOnAccent) },
    { label: 'Secondary text on background', status: aaStatus(secondaryOnBg) },
  ];

  return (
    <div
      className="min-h-screen p-4 md:p-8"
      style={{
        background: `radial-gradient(1200px 420px at 88% -12%, ${tokens.surfaceElevated} 0%, transparent 68%), ${variant.heroGradient}`,
      }}
    >
      {showTopNav && (
        <div className="mx-auto mb-5 max-w-[1300px]">
          <div
            className="flex items-center justify-between rounded-2xl border px-4 py-3 shadow-lg md:px-6"
            style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
          >
            <div className="flex items-center gap-3">
              <div
                className="grid h-10 w-10 place-items-center rounded-xl border text-xs font-bold tracking-[0.12em]"
                style={{ backgroundColor: tokens.surfaceElevated, borderColor: tokens.border, color: tokens.accentStrong }}
              >
                C
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: tokens.textSecondary }}>
                  Caelith Design Lab
                </p>
                <p className="text-sm font-semibold md:text-base" style={{ color: tokens.textPrimary }}>
                  Quietude Variant {variant.id.toUpperCase()} · {variant.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/design-lab/quietude"
                className="rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] md:px-4"
                style={{ borderColor: tokens.border, color: tokens.textSecondary }}
              >
                Gallery
              </Link>
              <span
                className="rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] md:px-4"
                style={{ backgroundColor: tokens.accent, color: tokens.textPrimary }}
              >
                Premium Preview
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-[1300px] gap-5 lg:grid-cols-[248px_1fr]">
        <aside
          className="rounded-2xl border p-4 shadow-xl"
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border, color: tokens.textPrimary }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: tokens.textSecondary }}>
            Navigation
          </p>
          <nav className="mt-3 space-y-2">
            {['Command Center', 'Funds', 'Investors', 'Rules', 'Transfers', 'Audit'].map((item, index) => (
              <div
                key={item}
                className="rounded-xl border px-3 py-2 text-sm font-medium"
                style={{
                  backgroundColor: index === 0 ? tokens.surfaceElevated : 'transparent',
                  borderColor: tokens.border,
                  color: index === 0 ? tokens.accentStrong : tokens.textPrimary,
                }}
              >
                {item}
              </div>
            ))}
          </nav>
          <div className="mt-5 rounded-xl border p-3" style={{ borderColor: tokens.border, backgroundColor: tokens.surfaceElevated }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: tokens.textSecondary }}>
              Palette DNA
            </p>
            <p className="mt-1 text-sm font-medium" style={{ color: tokens.textPrimary }}>
              {variant.tagline}
            </p>
          </div>
        </aside>

        <section className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Funds Monitored', value: '12', tone: tokens.accentStrong },
              { label: 'Risk Alerts', value: '03', tone: tokens.danger },
              { label: 'KYC Verified', value: '94%', tone: tokens.success },
              { label: 'Rules Coverage', value: '98%', tone: tokens.warning },
            ].map((kpi) => (
              <article
                key={kpi.label}
                className="rounded-2xl border p-4 shadow-lg"
                style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: tokens.textSecondary }}>
                  {kpi.label}
                </p>
                <p className="mt-3 text-3xl font-semibold" style={{ color: tokens.textPrimary }}>
                  {kpi.value}
                </p>
                <div className="mt-4 h-1.5 rounded-full" style={{ backgroundColor: tokens.surfaceElevated }}>
                  <div className="h-1.5 rounded-full" style={{ width: '62%', backgroundColor: kpi.tone }} />
                </div>
              </article>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <article
              className="rounded-2xl border shadow-xl"
              style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
            >
              <div className="flex items-center justify-between border-b px-4 py-3 md:px-5" style={{ borderColor: tokens.border }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: tokens.textPrimary }}>
                    Recent Decision Records
                  </p>
                  <p className="text-xs" style={{ color: tokens.textSecondary }}>
                    Operational snapshot with eligibility and transfer checks
                  </p>
                </div>
                <span
                  className="rounded-lg px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em]"
                  style={{ backgroundColor: tokens.accent, color: tokens.textPrimary }}
                >
                  live
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr style={{ color: tokens.textSecondary }}>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em]">Fund</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em]">Decision</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em]">Status</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em]">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Aurora Credit I', 'Transfer Validation', 'Approved', '97%'],
                      ['Northwind Yield', 'Onboarding Eligibility', 'Escalated', '81%'],
                      ['Helios Infra SPV', 'Rules Simulation', 'Approved', '95%'],
                    ].map((row, idx) => (
                      <tr key={row[0]} style={{ borderTop: `1px solid ${tokens.border}` }}>
                        <td className="px-5 py-3 text-sm font-medium" style={{ color: tokens.textPrimary }}>
                          {row[0]}
                        </td>
                        <td className="px-5 py-3 text-sm" style={{ color: tokens.textPrimary }}>
                          {row[1]}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className="rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.06em]"
                            style={{
                              backgroundColor: idx === 1 ? tokens.warning : tokens.success,
                              color: tokens.surfaceElevated,
                            }}
                          >
                            {row[2]}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm font-semibold" style={{ color: tokens.accentStrong }}>
                          {row[3]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article
              className="rounded-2xl border p-4 shadow-xl md:p-5"
              style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
            >
              <p className="text-sm font-semibold" style={{ color: tokens.textPrimary }}>
                Add Rule Condition
              </p>
              <p className="mt-0.5 text-xs" style={{ color: tokens.textSecondary }}>
                Preview of form controls, chips, and focus styling
              </p>

              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: tokens.textSecondary }}>
                    Operator
                  </span>
                  <select
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    style={{ backgroundColor: tokens.surfaceElevated, borderColor: tokens.focus, color: tokens.textPrimary }}
                    defaultValue="and"
                  >
                    <option value="and">AND</option>
                    <option value="or">OR</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: tokens.textSecondary }}>
                    Jurisdiction
                  </span>
                  <input
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    style={{ backgroundColor: tokens.surfaceElevated, borderColor: tokens.border, color: tokens.textPrimary }}
                    defaultValue="EU / EEA"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: tokens.accent, color: tokens.textPrimary }}>
                    KYC verified
                  </span>
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: tokens.warning, color: tokens.surfaceElevated }}>
                    Manual review
                  </span>
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: tokens.danger, color: tokens.surfaceElevated }}>
                    High risk
                  </span>
                </div>
                <button
                  className="w-full rounded-lg px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em]"
                  style={{ backgroundColor: tokens.accentStrong, color: tokens.surfaceElevated }}
                >
                  Save condition
                </button>
              </div>
            </article>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <article
              className="rounded-2xl border p-5 shadow-lg"
              style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
            >
              <p className="text-sm font-semibold" style={{ color: tokens.textPrimary }}>
                Empty State Treatment
              </p>
              <div
                className="mt-4 rounded-xl border border-dashed p-8 text-center"
                style={{ borderColor: tokens.border, backgroundColor: tokens.surfaceElevated }}
              >
                <p className="text-sm font-semibold" style={{ color: tokens.accentStrong }}>
                  No unresolved onboarding records
                </p>
                <p className="mt-1 text-xs" style={{ color: tokens.textSecondary }}>
                  Queue is clear. Trigger synthetic dataset or wait for new submissions.
                </p>
              </div>
            </article>

            <article
              className="rounded-2xl border p-5 shadow-lg"
              style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
            >
              <p className="text-sm font-semibold" style={{ color: tokens.textPrimary }}>
                Contrast Check (WCAG AA baseline)
              </p>
              <ul className="mt-3 space-y-2">
                {checks.map((check) => (
                  <li
                    key={check.label}
                    className="rounded-lg border px-3 py-2 text-xs"
                    style={{ borderColor: tokens.border, color: tokens.textPrimary, backgroundColor: tokens.surfaceElevated }}
                  >
                    <span className="font-semibold">{check.label}</span>
                    <span className="ml-2" style={{ color: tokens.textSecondary }}>
                      {check.status}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-5" style={{ color: tokens.textSecondary }}>
                {variant.narrative}
              </p>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
