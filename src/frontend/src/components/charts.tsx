'use client';

import React, { useState } from 'react';
import { formatCompactNumber, formatInvestorType, classNames } from '../lib/utils';
import { useI18n } from '../lib/i18n';

// ── Brand Palette (theme-safe) ───────────────────────────

const ACCENT = '#C5E0EE';
const WARM = '#E8A87C';

const TYPE_COLORS = [ACCENT, WARM, 'rgba(197,224,238,0.35)', '#B8C9A3', '#D4A5C7', '#A3B8C9', '#C9B8A3'];
const TYPE_GRADIENTS = [
  'linear-gradient(135deg, #3a6b7a, rgba(197,224,238,0.25))',
  'linear-gradient(135deg, #8a5f3a, rgba(232,168,124,0.25))',
  'linear-gradient(135deg, rgba(197,224,238,0.25), rgba(197,224,238,0.1))',
  'linear-gradient(135deg, #5a7a4a, rgba(184,201,163,0.25))',
  'linear-gradient(135deg, #7a4a6a, rgba(212,165,199,0.25))',
  'linear-gradient(135deg, #4a6a7a, rgba(163,184,201,0.25))',
  'linear-gradient(135deg, #7a6a4a, rgba(201,184,163,0.25))',
];

function getJurisdictionColor(j: string): string {
  const u = j.toUpperCase();
  if (u === 'DE' || u === 'GERMANY' || u === 'DEUTSCHLAND') return ACCENT;
  if (u === 'LU' || u === 'LUXEMBOURG' || u === 'LUXEMBURG') return WARM;
  return 'rgba(197,224,238,0.35)';
}

function getJurisdictionBg(j: string, pct: number): string {
  const u = j.toUpperCase();
  const alpha = Math.max(0.08, Math.min(0.4, pct / 100));
  if (u === 'DE' || u === 'GERMANY' || u === 'DEUTSCHLAND') return `rgba(197,224,238,${alpha})`;
  if (u === 'LU' || u === 'LUXEMBOURG' || u === 'LUXEMBURG') return `rgba(232,168,124,${alpha})`;
  return `rgba(197,224,238,${alpha * 0.5})`;
}

// ── 1. Investor Type: Treemap (C) + Tufte breakdown (B) ──

interface TypeAllocationEntry {
  type: string;
  count: number;
  total_units: number;
}

export const InvestorTypeDonut = React.memo(function InvestorTypeDonut({
  data,
  onTypeClick,
}: {
  data: TypeAllocationEntry[];
  onTypeClick?: (rawType: string) => void;
}) {
  const { t } = useI18n();
  if (!data || data.length === 0) {
    return <EmptyChart label={t('charts.noInvestorTypeData')} />;
  }

  const sorted = [...data].sort((a, b) => b.total_units - a.total_units);
  const total = sorted.reduce((s, d) => s + d.total_units, 0);

  return (
    <ChartCard title={t('charts.investorTypeTitle')} subtitle={t('charts.investorTypeSubtitle')}>
      {/* Treemap blocks */}
      <div className="flex gap-[3px] overflow-hidden rounded-lg" style={{ height: 140 }}>
        {sorted.length > 0 && (
          <>
            {/* Largest block */}
            <div
              className={classNames('flex flex-col justify-end rounded-md p-2.5 relative overflow-hidden transition-opacity', onTypeClick && 'cursor-pointer hover:opacity-85')}
              style={{ flex: Math.max(sorted[0].total_units, 1), background: TYPE_GRADIENTS[0] }}
              onClick={onTypeClick ? () => onTypeClick(sorted[0].type) : undefined}
            >
              <span className="font-mono text-sm font-bold text-white">
                {total > 0 ? ((sorted[0].total_units / total) * 100).toFixed(0) : 0}%
              </span>
              <span className="text-[10px] font-semibold text-white/90">{formatInvestorType(sorted[0].type)}</span>
            </div>
            {/* Remaining blocks stacked vertically */}
            {sorted.length > 1 && (
              <div className="flex flex-col gap-[3px]" style={{ flex: sorted.slice(1).reduce((s, d) => s + d.total_units, 0) }}>
                {sorted.slice(1).map((d, i) => {
                  const pct = total > 0 ? ((d.total_units / total) * 100).toFixed(0) : '0';
                  return (
                    <div
                      key={d.type}
                      className={classNames('flex flex-col justify-end rounded-md p-2 overflow-hidden transition-opacity', onTypeClick && 'cursor-pointer hover:opacity-85')}
                      style={{ flex: Math.max(d.total_units, 1), background: TYPE_GRADIENTS[(i + 1) % TYPE_GRADIENTS.length] }}
                      onClick={onTypeClick ? () => onTypeClick(d.type) : undefined}
                    >
                      {d.total_units / total > 0.08 ? (
                        <>
                          <span className="font-mono text-xs font-bold text-white">{pct}%</span>
                          <span className="text-[9px] font-semibold text-white/90 truncate">{formatInvestorType(d.type)}</span>
                        </>
                      ) : (
                        <span className="text-[9px] font-semibold text-white/80 truncate">
                          {formatInvestorType(d.type)} {pct}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Tufte breakdown rows */}
      <div className="mt-4">
        {sorted.map((d, i) => {
          const pct = total > 0 ? (d.total_units / total) * 100 : 0;
          return (
            <div
              key={d.type}
              className={classNames(
                'flex items-center gap-2.5 py-1.5',
                onTypeClick && 'cursor-pointer rounded px-1 -mx-1 hover:bg-bg-tertiary transition-colors'
              )}
              onClick={onTypeClick ? () => onTypeClick(d.type) : undefined}
            >
              <span className="w-28 text-[11px] text-ink-secondary truncate">{formatInvestorType(d.type)}</span>
              <div className="flex-1 h-[2px] bg-bg-tertiary rounded-full relative">
                <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${pct}%`, background: TYPE_COLORS[i % TYPE_COLORS.length] }} />
              </div>
              <span className="font-mono text-[11px] font-semibold w-12 text-right" style={{ color: TYPE_COLORS[i % TYPE_COLORS.length] }}>
                {formatCompactNumber(d.total_units)}
              </span>
              <span className="font-mono text-[10px] text-ink-muted w-9 text-right">{pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="mt-3 pt-2.5 border-t border-edge-subtle flex justify-between text-[11px]">
        <span className="text-ink-muted">Total</span>
        <span className="font-mono font-bold text-ink">{total.toLocaleString()}</span>
      </div>
    </ChartCard>
  );
});

// ── 2. Jurisdiction: Stacked strip (B) + Heatmap (C) + Breakdown (B) ──

interface JurisdictionEntry {
  jurisdiction: string;
  count: number;
  total_units: number;
}

export const JurisdictionExposureBar = React.memo(function JurisdictionExposureBar({
  data,
  onBarClick,
}: {
  data: JurisdictionEntry[];
  onBarClick?: (jurisdiction: string) => void;
}) {
  const { t } = useI18n();
  if (!data || data.length === 0) {
    return <EmptyChart label={t('charts.noJurisdictionData')} />;
  }

  const sorted = [...data].sort((a, b) => b.total_units - a.total_units).slice(0, 12);
  const total = sorted.reduce((s, d) => s + d.total_units, 0);

  return (
    <ChartCard title={t('charts.jurisdictionTitle')} subtitle={t('charts.jurisdictionSubtitle')}>
      {/* Stacked strip */}
      <div className="flex h-8 rounded-lg overflow-hidden mb-4">
        {sorted.map((d) => {
          const pct = total > 0 ? (d.total_units / total) * 100 : 0;
          if (pct < 1) return null;
          const color = getJurisdictionColor(d.jurisdiction);
          return (
            <div
              key={d.jurisdiction}
              className={classNames('flex items-center justify-center transition-all', onBarClick && 'cursor-pointer hover:opacity-80')}
              style={{ flex: d.total_units, background: color }}
              onClick={onBarClick ? () => onBarClick(d.jurisdiction) : undefined}
            >
              {pct > 4 && (
                <span className="font-mono text-[11px] font-semibold" style={{ color: pct > 15 ? '#2D3333' : undefined }}>
                  {d.jurisdiction.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Heatmap tiles */}
      <div className="grid grid-cols-4 gap-1 mb-4">
        {sorted.map((d, i) => {
          const pct = total > 0 ? (d.total_units / total) * 100 : 0;
          const color = getJurisdictionColor(d.jurisdiction);
          const isLarge = i < 2;
          return (
            <div
              key={d.jurisdiction}
              className={classNames(
                'flex flex-col items-center justify-center rounded-md transition-transform hover:scale-105',
                isLarge ? 'col-span-2' : 'col-span-2',
                onBarClick && 'cursor-pointer'
              )}
              style={{
                background: getJurisdictionBg(d.jurisdiction, pct),
                aspectRatio: isLarge ? '3.4' : '1.6',
              }}
              onClick={onBarClick ? () => onBarClick(d.jurisdiction) : undefined}
            >
              <span className="font-mono font-bold" style={{ fontSize: isLarge ? 18 : 13, color }}>{d.jurisdiction.slice(0, 2).toUpperCase()}</span>
              <span className="font-mono text-[10px] mt-0.5" style={{ color, opacity: 0.7 }}>{formatCompactNumber(d.total_units)}</span>
            </div>
          );
        })}
      </div>

      {/* Breakdown rows */}
      <div>
        {sorted.map((d) => {
          const pct = total > 0 ? (d.total_units / total) * 100 : 0;
          const color = getJurisdictionColor(d.jurisdiction);
          return (
            <div
              key={d.jurisdiction}
              className={classNames(
                'flex items-center gap-2.5 py-1.5',
                onBarClick && 'cursor-pointer rounded px-1 -mx-1 hover:bg-bg-tertiary transition-colors'
              )}
              onClick={onBarClick ? () => onBarClick(d.jurisdiction) : undefined}
            >
              <span className="w-28 text-[11px] text-ink-secondary truncate">{d.jurisdiction}</span>
              <span className="font-mono text-[11px] font-semibold ml-auto" style={{ color }}>{formatCompactNumber(d.total_units)}</span>
              <span className="font-mono text-[10px] text-ink-muted w-12 text-right">{pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
});

// ── 3. KYC: Big number (B) + Dot matrix (C) + Segmented strip (B) ──

interface KycSegmentData {
  verified: number;
  pending: number;
  expired: number;
  expiring_soon: number;
}

const KYC_SEGMENTS = [
  { key: 'verified', label: 'Verified', color: 'var(--success)' },
  { key: 'expiring_soon', label: 'Expiring <90d', color: WARM },
  { key: 'pending', label: 'Pending', color: 'var(--warning)' },
  { key: 'expired', label: 'Expired', color: 'var(--danger)' },
] as const;

export const KycExpiryHorizon = React.memo(function KycExpiryHorizon({
  data,
  onStatusClick,
}: {
  data: KycSegmentData;
  onStatusClick?: (status: string) => void;
}) {
  const { t } = useI18n();
  const total = data.verified + data.pending + data.expired + data.expiring_soon;
  const [hoveredDot, setHoveredDot] = useState<number | null>(null);

  if (total === 0) {
    return <EmptyChart label={t('charts.noKycData')} />;
  }

  // Build dot array
  const dots: { status: string; color: string; label: string; index: number }[] = [];
  let idx = 0;
  for (const seg of KYC_SEGMENTS) {
    const count = data[seg.key as keyof KycSegmentData];
    for (let i = 0; i < count; i++) {
      dots.push({ status: seg.key, color: seg.color, label: seg.label, index: idx++ });
    }
  }

  const segments = KYC_SEGMENTS.map(s => ({ ...s, value: data[s.key as keyof KycSegmentData] })).filter(s => s.value > 0);

  return (
    <ChartCard title={t('charts.kycTitle')} subtitle={t('charts.kycSubtitle')}>
      {/* Big number */}
      <div className="text-center my-3">
        <div className="font-mono text-5xl font-extrabold leading-none tracking-tight">
          <span style={{ color: 'var(--success)' }}>{data.verified}</span>
          <span className="text-ink-muted text-2xl"> / {total}</span>
        </div>
        <div className="text-[11px] text-ink-muted mt-1.5">{t('charts.verifiedInvestors')}</div>
      </div>

      {/* Dot matrix */}
      <div className="grid grid-cols-6 gap-2.5 max-w-[260px] mx-auto mb-5">
        {dots.map((dot) => (
          <div
            key={dot.index}
            className={classNames(
              'rounded-sm transition-transform relative',
              onStatusClick && 'cursor-pointer',
              hoveredDot === dot.index && 'scale-125 z-10'
            )}
            style={{ background: dot.color, height: 28, aspectRatio: '1' }}
            onClick={onStatusClick ? () => onStatusClick(dot.status) : undefined}
            onMouseEnter={() => setHoveredDot(dot.index)}
            onMouseLeave={() => setHoveredDot(null)}
          >
            {hoveredDot === dot.index && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 rounded-md border border-edge bg-bg-secondary px-2.5 py-1.5 text-[10px] text-ink whitespace-nowrap z-20 shadow-lg">
                Inv. {dot.index + 1} · {dot.label}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Segmented strip */}
      <div className="flex h-2 rounded overflow-hidden">
        {segments.map((seg, i) => (
          <div
            key={seg.key}
            style={{
              flex: seg.value,
              background: seg.color,
              borderRadius: i === 0 ? '4px 0 0 4px' : i === segments.length - 1 ? '0 4px 4px 0' : undefined,
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-between mt-3 text-[10px]">
        {segments.map((seg) => (
          <span
            key={seg.key}
            className={classNames(onStatusClick && 'cursor-pointer hover:opacity-80')}
            style={{ color: seg.color }}
            onClick={onStatusClick ? () => onStatusClick(seg.key) : undefined}
          >
            ● {seg.label} {seg.value}
          </span>
        ))}
      </div>
    </ChartCard>
  );
});

// ── 4. Violations: Severity list with color bars ──

interface ViolationEntry {
  asset_name: string;
  violation_count: number;
  total_decisions: number;
}

export const ViolationAnalysisBar = React.memo(function ViolationAnalysisBar({
  data,
  onBarClick,
}: {
  data: ViolationEntry[];
  onBarClick?: (assetName: string) => void;
}) {
  const { t } = useI18n();
  if (!data || data.length === 0) {
    return (
      <ChartCard title={t('charts.violationsTitle')} subtitle={t('charts.violationsSubtitle')}>
        <div className="flex h-[200px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-bg-tertiary">
              <svg className="h-5 w-5 text-ink-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-xs text-ink-tertiary">{t('charts.noViolationsDetected')}</p>
          </div>
        </div>
      </ChartCard>
    );
  }

  const sorted = [...data].sort((a, b) => b.violation_count - a.violation_count);
  const totalViolations = sorted.reduce((s, d) => s + d.violation_count, 0);
  const totalDecisions = sorted.reduce((s, d) => s + d.total_decisions, 0);

  function getSeverityColor(count: number): string {
    if (count >= 3) return 'var(--danger)';
    if (count >= 1) return WARM;
    return 'rgba(197,224,238,0.2)';
  }

  function getCountColor(count: number): string {
    if (count >= 3) return 'var(--danger)';
    if (count >= 1) return WARM;
    return 'var(--success)';
  }

  return (
    <ChartCard title={t('charts.violationsTitle')} subtitle={t('charts.violationsSubtitle')}>
      <div>
        {sorted.map((d) => {
          const barColor = getSeverityColor(d.violation_count);
          const countColor = getCountColor(d.violation_count);
          return (
            <div
              key={d.asset_name}
              className={classNames(
                'flex items-center gap-3 py-2.5 border-b border-edge-subtle last:border-b-0',
                onBarClick && 'cursor-pointer hover:bg-bg-tertiary transition-colors rounded -mx-1 px-1'
              )}
              onClick={onBarClick ? () => onBarClick(d.asset_name) : undefined}
            >
              <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: barColor }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-ink truncate">{d.asset_name}</div>
                <div className="text-[10px] text-ink-muted mt-0.5">
                  {d.violation_count} violation{d.violation_count !== 1 ? 's' : ''} · {d.total_decisions} decisions
                </div>
              </div>
              <span className="font-mono text-lg font-bold flex-shrink-0" style={{ color: countColor }}>
                {d.violation_count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="mt-3 pt-2.5 border-t border-edge-subtle flex justify-between text-[11px]">
        <span className="text-ink-muted">{t('charts.totalViolationsDecisions')}</span>
        <span className="font-mono font-bold text-ink">
          <span style={{ color: totalViolations > 0 ? 'var(--danger)' : undefined }}>{totalViolations}</span> / {totalDecisions}
        </span>
      </div>
    </ChartCard>
  );
});

// ── 5. Concentration Risk: Tags (C) + Gradient bars (B) + HHI ──

interface ConcentrationEntry {
  fund_name: string;
  top_investor_pct: number;
  top3_investor_pct: number;
  hhi: number;
}

export const ConcentrationRiskGrid = React.memo(function ConcentrationRiskGrid({
  data,
}: {
  data: ConcentrationEntry[];
}) {
  const { t } = useI18n();
  if (!data || data.length === 0) {
    return <EmptyChart label={t('charts.noConcentrationData')} />;
  }

  function getRisk(fund: ConcentrationEntry) {
    if (fund.top_investor_pct >= 50) return { label: t('charts.high'), color: 'var(--danger)', bg: 'rgba(248,113,113,0.15)' };
    if (fund.top_investor_pct >= 25) return { label: t('charts.medium'), color: WARM, bg: 'rgba(232,168,124,0.15)' };
    return { label: t('charts.low'), color: 'var(--success)', bg: 'rgba(110,231,183,0.15)' };
  }

  function getBarGradient(fund: ConcentrationEntry, type: 'top1' | 'top3'): string {
    const risk = getRisk(fund);
    if (type === 'top1') {
      if (risk.label === 'HOCH') return `linear-gradient(90deg, var(--danger), ${WARM})`;
      if (risk.label === 'MITTEL') return WARM;
      return 'var(--success)';
    }
    // top3
    if (risk.label === 'HOCH') return `linear-gradient(90deg, ${WARM}, rgba(232,168,124,0.5))`;
    if (risk.label === 'MITTEL') return 'rgba(232,168,124,0.5)';
    return 'rgba(110,231,183,0.5)';
  }

  return (
    <ChartCard title={t('charts.concentrationTitle')} subtitle={t('charts.concentrationSubtitle')}>
      <div>
        {data.map((fund, fi) => {
          const risk = getRisk(fund);
          return (
            <div key={fund.fund_name} className={classNames('py-3', fi < data.length - 1 && 'border-b border-edge-subtle')}>
              {/* Header */}
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-xs font-semibold text-ink">{fund.fund_name}</span>
                <span
                  className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: risk.bg, color: risk.color }}
                >
                  {risk.label}
                </span>
              </div>

              {/* Three columns */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="text-[10px] text-ink-muted mb-1">{t('charts.topInvestor')}</div>
                  <div className="h-1.5 bg-bg-tertiary rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(fund.top_investor_pct, 100)}%`, background: getBarGradient(fund, 'top1') }}
                    />
                  </div>
                  <div className="font-mono text-[11px] font-semibold mt-1 text-ink">{fund.top_investor_pct.toFixed(1)}%</div>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] text-ink-muted mb-1">Top 3</div>
                  <div className="h-1.5 bg-bg-tertiary rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(fund.top3_investor_pct, 100)}%`, background: getBarGradient(fund, 'top3') }}
                    />
                  </div>
                  <div className="font-mono text-[11px] font-semibold mt-1 text-ink">{fund.top3_investor_pct.toFixed(1)}%</div>
                </div>
                <div className="w-[60px] text-right">
                  <div className="text-[10px] text-ink-muted mb-1">HHI</div>
                  <div className="font-mono text-sm font-bold" style={{ color: risk.color }}>{fund.hhi.toLocaleString()}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
});

// ── Shared Components ────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-edge bg-bg-secondary p-6">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-ink-tertiary">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <ChartCard title={label}>
      <div className="flex h-[200px] items-center justify-center">
        <p className="text-xs text-ink-tertiary">{label}</p>
      </div>
    </ChartCard>
  );
}
