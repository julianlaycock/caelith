'use client';

import React from 'react';
import { formatCompactNumber, formatInvestorType, classNames } from '../lib/utils';

// ── Brand Palette (theme-safe) ───────────────────────────

const ACCENT = '#C5E0EE';
const WARM = '#E8A87C';
const MUTED = '#9AA3AA';

const TYPE_COLORS = [ACCENT, WARM, MUTED, '#B8C9A3', '#D4A5C7', '#A3B8C9', '#C9B8A3'];

function getJurisdictionColor(j: string) {
  const upper = j.toUpperCase();
  if (upper === 'DE' || upper === 'GERMANY') return ACCENT;
  if (upper === 'LU' || upper === 'LUXEMBOURG') return WARM;
  return MUTED;
}

// ── SVG Arc helpers ──────────────────────────────────────

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const rad = (a: number) => ((a - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(startAngle));
  const y1 = cy + r * Math.sin(rad(startAngle));
  const x2 = cx + r * Math.cos(rad(endAngle));
  const y2 = cy + r * Math.sin(rad(endAngle));
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

// ── 1. Investor Type Allocation (Radial Gauge) ──────────

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
  if (!data || data.length === 0) {
    return <EmptyChart label="No investor type data" />;
  }

  const chartData = data.map((d) => ({
    name: formatInvestorType(d.type),
    rawType: d.type,
    value: d.total_units,
    count: d.count,
  }));

  const total = chartData.reduce((s, d) => s + d.value, 0);
  const dominant = chartData.reduce((a, b) => (b.value > a.value ? b : a), chartData[0]);
  const dominantPct = total > 0 ? ((dominant.value / total) * 100).toFixed(0) : '0';

  // Build arcs
  const cx = 90, cy = 90, r = 72, trackR = r;
  let angleOffset = 0;
  const arcs = chartData.map((d, i) => {
    const sweep = total > 0 ? (d.value / total) * 360 : 0;
    const startAngle = angleOffset;
    const endAngle = angleOffset + Math.max(sweep - 2, 0.5); // small gap
    angleOffset += sweep;
    return { ...d, startAngle, endAngle, color: TYPE_COLORS[i % TYPE_COLORS.length] };
  });

  return (
    <ChartCard title="Investor Type Allocation" subtitle="Units by investor classification">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-shrink-0" style={{ width: 180, height: 180 }}>
          <svg viewBox="0 0 180 180" width="180" height="180">
            {/* Track */}
            <circle cx={cx} cy={cy} r={trackR} fill="none" className="stroke-edge-subtle" strokeWidth="10" opacity="0.3" />
            {/* Arcs */}
            {arcs.map((arc, i) => (
              <path
                key={i}
                d={describeArc(cx, cy, r, arc.startAngle, arc.endAngle)}
                fill="none"
                stroke={arc.color}
                strokeWidth="10"
                strokeLinecap="round"
                className={classNames(
                  'transition-opacity',
                  onTypeClick && 'cursor-pointer hover:opacity-70'
                )}
                onClick={onTypeClick ? () => onTypeClick(arc.rawType) : undefined}
              />
            ))}
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-2xl font-bold text-ink">{dominantPct}%</span>
            <span className="text-[10px] text-ink-tertiary">{dominant.name}</span>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {arcs.map((d) => (
            <div
              key={d.name}
              className={classNames(
                'flex items-center justify-between text-xs',
                onTypeClick && 'cursor-pointer rounded px-1 -mx-1 py-0.5 hover:bg-bg-tertiary transition-colors'
              )}
              onClick={onTypeClick ? () => onTypeClick(d.rawType) : undefined}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-ink-secondary">{d.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-ink-tertiary">{d.count}</span>
                <span className="font-mono font-medium text-ink">
                  {total > 0 ? ((d.value / total) * 100).toFixed(1) : '0'}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
});

// ── 2. Jurisdiction Exposure (Horizontal CSS Bars) ───────

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
  if (!data || data.length === 0) {
    return <EmptyChart label="No jurisdiction data" />;
  }

  const sorted = [...data].sort((a, b) => b.total_units - a.total_units).slice(0, 12);
  const maxUnits = sorted[0]?.total_units || 1;

  return (
    <ChartCard title="Jurisdiction Exposure" subtitle="Top jurisdictions by allocated units">
      <div className="space-y-3">
        {sorted.map((d) => {
          const pct = (d.total_units / maxUnits) * 100;
          const color = getJurisdictionColor(d.jurisdiction);
          return (
            <div
              key={d.jurisdiction}
              className={classNames(
                'group',
                onBarClick && 'cursor-pointer'
              )}
              onClick={onBarClick ? () => onBarClick(d.jurisdiction) : undefined}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-ink">{d.jurisdiction}</span>
                <span className="font-mono text-xs text-ink-secondary">
                  {formatCompactNumber(d.total_units)} <span className="text-ink-tertiary">({d.count})</span>
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-bg-tertiary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all group-hover:opacity-80"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${color}, ${color}CC)`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
});

// ── 3. KYC Expiry Horizon (Semi-circular Arc) ────────────

interface KycSegmentData {
  verified: number;
  pending: number;
  expired: number;
  expiring_soon: number;
}

export const KycExpiryHorizon = React.memo(function KycExpiryHorizon({
  data,
  onStatusClick,
}: {
  data: KycSegmentData;
  onStatusClick?: (status: string) => void;
}) {
  const total = data.verified + data.pending + data.expired + data.expiring_soon;

  if (total === 0) {
    return <EmptyChart label="No KYC data available" />;
  }

  const segments = [
    { key: 'verified', label: 'Verified', value: data.verified, color: 'var(--success)' },
    { key: 'expiring_soon', label: 'Expiring <90d', value: data.expiring_soon, color: WARM },
    { key: 'pending', label: 'Pending', value: data.pending, color: 'var(--warning)' },
    { key: 'expired', label: 'Expired', value: data.expired, color: 'var(--danger)' },
  ].filter((s) => s.value > 0);

  const verified = data.verified;

  // Semi-circle: 180 to 360 degrees
  const cx = 120, cy = 110, r = 80;
  let angleOffset = 180;
  const arcs = segments.map((seg) => {
    const sweep = (seg.value / total) * 180;
    const start = angleOffset;
    const end = angleOffset + Math.max(sweep - 1.5, 0.5);
    angleOffset += sweep;
    return { ...seg, start, end };
  });

  return (
    <ChartCard title="KYC Status Overview" subtitle="Investor KYC verification status">
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: 240, height: 130 }}>
          <svg viewBox="0 0 240 130" width="240" height="130">
            {/* Track */}
            <path
              d={describeArc(cx, cy, r, 180, 360)}
              fill="none"
              className="stroke-edge-subtle"
              strokeWidth="14"
              opacity="0.3"
            />
            {/* Segments */}
            {arcs.map((arc) => (
              <path
                key={arc.key}
                d={describeArc(cx, cy, r, arc.start, arc.end)}
                fill="none"
                stroke={arc.color}
                strokeWidth="14"
                strokeLinecap="round"
                className={classNames(
                  'transition-opacity',
                  onStatusClick && 'cursor-pointer hover:opacity-70'
                )}
                onClick={onStatusClick ? () => onStatusClick(arc.key) : undefined}
              />
            ))}
          </svg>
          {/* Center number */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <span className="font-mono text-xl font-bold text-ink">
              {verified} <span className="text-ink-tertiary font-normal text-base">/ {total}</span>
            </span>
            <span className="text-[10px] text-ink-tertiary">verified</span>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 grid grid-cols-2 gap-2 w-full">
          {segments.map((seg) => (
            <div
              key={seg.key}
              className={classNames(
                'flex items-center gap-2 text-xs',
                onStatusClick && 'cursor-pointer rounded px-1 -mx-1 py-0.5 hover:bg-bg-tertiary transition-colors'
              )}
              onClick={onStatusClick ? () => onStatusClick(seg.key) : undefined}
            >
              <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
              <span className="text-ink-secondary">{seg.label}</span>
              <span className="ml-auto font-mono font-medium text-ink">{seg.value}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
});

// ── 4. Violation Analysis (Severity List) ────────────────

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
  if (!data || data.length === 0) {
    return (
      <ChartCard title="Rule Violations" subtitle="Top assets by compliance violations">
        <div className="flex h-[200px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent-500/10">
              <svg className="h-5 w-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-xs text-ink-tertiary">No violations detected</p>
          </div>
        </div>
      </ChartCard>
    );
  }

  const sorted = [...data].sort((a, b) => b.violation_count - a.violation_count).slice(0, 5);

  function getSeverityColor(count: number): string {
    if (count >= 5) return 'var(--danger)';
    if (count >= 2) return WARM;
    return 'var(--success)';
  }

  return (
    <ChartCard title="Rule Violations" subtitle="Top assets by compliance violations">
      <div className="space-y-2">
        {sorted.map((d) => {
          const color = getSeverityColor(d.violation_count);
          return (
            <div
              key={d.asset_name}
              className={classNames(
                'flex items-center gap-3 rounded-lg border border-edge-subtle p-3 transition-colors',
                onBarClick && 'cursor-pointer hover:bg-bg-tertiary'
              )}
              style={{ borderLeftWidth: 3, borderLeftColor: color }}
              onClick={onBarClick ? () => onBarClick(d.asset_name) : undefined}
            >
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-ink truncate block">{d.asset_name}</span>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <span className="font-mono text-sm font-bold" style={{ color }}>{d.violation_count}</span>
                  <span className="text-[10px] text-ink-tertiary block">violations</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm text-ink-secondary">{d.total_decisions}</span>
                  <span className="text-[10px] text-ink-tertiary block">decisions</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
});

// ── 5. Concentration Risk Grid ───────────────────────────

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
  if (!data || data.length === 0) {
    return <EmptyChart label="No concentration data" />;
  }

  return (
    <ChartCard title="Concentration Risk" subtitle="Investor concentration by fund">
      <div className="space-y-3">
        {data.map((fund) => {
          const riskLevel =
            fund.top_investor_pct >= 50 ? 'high' : fund.top_investor_pct >= 25 ? 'medium' : 'low';
          const riskLabel = riskLevel === 'high' ? 'HOCH' : riskLevel === 'medium' ? 'MITTEL' : 'NIEDRIG';
          const riskColor =
            riskLevel === 'high'
              ? 'var(--danger)'
              : riskLevel === 'medium'
              ? WARM
              : 'var(--success)';

          return (
            <div key={fund.fund_name} className="rounded-lg border border-edge-subtle p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-ink">{fund.fund_name}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    color: riskColor,
                    backgroundColor: 'var(--bg-tertiary)',
                  }}
                >
                  {riskLabel}
                </span>
              </div>
              <div className="space-y-1.5">
                <ConcentrationBar label="Top investor" value={fund.top_investor_pct} color={riskColor} />
                <ConcentrationBar label="Top 3 investors" value={fund.top3_investor_pct} color={ACCENT} />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-ink-tertiary">
                <span>HHI: <span className="font-mono font-medium text-ink-secondary">{fund.hhi.toLocaleString()}</span></span>
                <span>
                  {fund.hhi < 1500
                    ? 'Well diversified'
                    : fund.hhi < 2500
                    ? 'Moderately concentrated'
                    : 'Highly concentrated'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
});

function ConcentrationBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 text-[11px] text-ink-tertiary">{label}</span>
      <div className="flex-1">
        <div className="h-1.5 w-full rounded-full bg-bg-tertiary">
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${Math.min(value, 100)}%`, background: `linear-gradient(90deg, ${color}, ${color}CC)` }}
          />
        </div>
      </div>
      <span className="w-10 text-right font-mono text-[11px] font-medium text-ink">
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

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
    <div className="rounded-xl border border-edge bg-bg-secondary p-5">
      <div className="mb-4">
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
