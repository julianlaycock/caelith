'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCompactNumber, formatInvestorType, classNames } from '../lib/utils';

// ── Color Palette ────────────────────────────────────────

const CHART_COLORS = [
  '#16A34A', // brand-600
  '#22C55E', // brand-500
  '#4ADE80', // brand-400
  '#86EFAD', // brand-300
  '#BBF7D1', // brand-200
  '#15803D', // brand-700
  '#166534', // brand-800
];

const KYC_COLORS: Record<string, string> = {
  verified: '#16A34A',
  pending: '#D4A017',
  expired: '#DC2626',
  expiring_soon: '#EA580C',
};

const VIOLATION_COLOR = '#DC2626';

// ── Shared Tooltip Style ─────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    background: '#FFFFFF',
    border: '1px solid #D1DDD7',
    borderRadius: '8px',
    fontSize: '12px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)',
  },
  itemStyle: { color: '#0F1D18' },
  labelStyle: { color: '#4B6358', fontWeight: 600 },
};

// ── 1. Investor Type Allocation (Donut) ──────────────────

interface TypeAllocationEntry {
  type: string;
  count: number;
  total_units: number;
}

export function InvestorTypeDonut({ data, onTypeClick }: { data: TypeAllocationEntry[]; onTypeClick?: (rawType: string) => void }) {
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

  return (
    <ChartCard title="Investor Type Allocation" subtitle="Units by investor classification">
      <div className="flex items-center gap-4">
        <div className="h-[200px] w-[200px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                dataKey="value"
                stroke="#FFFFFF"
                strokeWidth={2}
                style={onTypeClick ? { cursor: 'pointer' } : undefined}
                onClick={onTypeClick ? (_: unknown, index: number) => onTypeClick(chartData[index].rawType) : undefined}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [formatCompactNumber(Number(value)) + ' units', 'Allocated']}
                {...tooltipStyle}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2">
          {chartData.map((d, i) => (
            <div
              key={d.name}
              className={classNames(
                'flex items-center justify-between text-xs',
                onTypeClick && 'cursor-pointer rounded px-1 -mx-1 py-0.5 hover:bg-surface-subtle transition-colors'
              )}
              onClick={onTypeClick ? () => onTypeClick(d.rawType) : undefined}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                />
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
}

// ── 2. Jurisdiction Exposure (Horizontal Bar) ────────────

interface JurisdictionEntry {
  jurisdiction: string;
  count: number;
  total_units: number;
}

export function JurisdictionExposureBar({ data }: { data: JurisdictionEntry[] }) {
  if (!data || data.length === 0) {
    return <EmptyChart label="No jurisdiction data" />;
  }

  const sorted = [...data].sort((a, b) => b.total_units - a.total_units).slice(0, 12);
  const chartData = sorted.map((d) => ({
    name: d.jurisdiction,
    units: d.total_units,
    investors: d.count,
  }));

  const chartHeight = Math.max(200, chartData.length * 28);

  return (
    <ChartCard title="Jurisdiction Exposure" subtitle="Top jurisdictions by allocated units">
      <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
            <XAxis
              type="number"
              tickFormatter={formatCompactNumber}
              tick={{ fontSize: 11, fill: '#7A9488' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={36}
              tick={{ fontSize: 11, fill: '#4B6358' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => [formatCompactNumber(Number(value)) + ' units', 'Allocated']}
              {...tooltipStyle}
            />
            <Bar dataKey="units" fill="#22C55E" radius={[0, 4, 4, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

// ── 3. KYC Expiry Horizon (Segmented Bar) ─────────────────

interface KycSegmentData {
  verified: number;
  pending: number;
  expired: number;
  expiring_soon: number;
}

export function KycExpiryHorizon({ data, onStatusClick }: { data: KycSegmentData; onStatusClick?: (status: string) => void }) {
  const total = data.verified + data.pending + data.expired + data.expiring_soon;

  if (total === 0) {
    return <EmptyChart label="No KYC data available" />;
  }

  const segments = [
    { key: 'verified', label: 'Verified', value: data.verified, color: KYC_COLORS.verified },
    { key: 'expiring_soon', label: 'Expiring <90d', value: data.expiring_soon, color: KYC_COLORS.expiring_soon },
    { key: 'pending', label: 'Pending', value: data.pending, color: KYC_COLORS.pending },
    { key: 'expired', label: 'Expired', value: data.expired, color: KYC_COLORS.expired },
  ].filter((s) => s.value > 0);

  return (
    <ChartCard title="KYC Status Overview" subtitle="Investor KYC verification status">
      <div className="space-y-4">
        {/* Segmented bar */}
        <div className="flex h-6 w-full overflow-hidden rounded-full bg-surface-subtle">
          {segments.map((seg) => (
            <div
              key={seg.key}
              className={classNames('transition-all', onStatusClick && 'cursor-pointer hover:opacity-80')}
              style={{
                width: `${(seg.value / total) * 100}%`,
                backgroundColor: seg.color,
                minWidth: seg.value > 0 ? '4px' : '0px',
              }}
              onClick={onStatusClick ? () => onStatusClick(seg.key) : undefined}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2">
          {segments.map((seg) => (
            <div
              key={seg.key}
              className={classNames(
                'flex items-center gap-2 text-xs',
                onStatusClick && 'cursor-pointer rounded px-1 -mx-1 py-0.5 hover:bg-surface-subtle transition-colors'
              )}
              onClick={onStatusClick ? () => onStatusClick(seg.key) : undefined}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: seg.color }} />
              <span className="text-ink-secondary">{seg.label}</span>
              <span className="ml-auto font-mono font-medium text-ink">{seg.value}</span>
            </div>
          ))}
        </div>

        {/* Summary stats */}
        <div className="flex items-center justify-between rounded-lg bg-surface-subtle px-3 py-2">
          <span className="text-xs text-ink-secondary">Total investors</span>
          <span className="text-sm font-semibold text-ink">{total}</span>
        </div>
      </div>
    </ChartCard>
  );
}

// ── 4. Violation Top 5 (Horizontal Bar) ──────────────────

interface ViolationEntry {
  asset_name: string;
  violation_count: number;
  total_decisions: number;
}

export function ViolationAnalysisBar({ data, onBarClick }: { data: ViolationEntry[]; onBarClick?: (assetName: string) => void }) {
  if (!data || data.length === 0) {
    return (
      <ChartCard title="Rule Violations" subtitle="Top assets by compliance violations">
        <div className="flex h-[200px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
              <svg className="h-5 w-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
  const chartData = sorted.map((d) => ({
    name: d.asset_name.length > 18 ? d.asset_name.slice(0, 16) + '…' : d.asset_name,
    fullName: d.asset_name,
    violations: d.violation_count,
    decisions: d.total_decisions,
  }));

  return (
    <ChartCard title="Rule Violations" subtitle="Top assets by compliance violations">
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 4, right: 12, top: 4, bottom: 4 }}
            onClick={onBarClick ? (state) => {
              const idx = Number(state?.activeTooltipIndex);
              if (!isNaN(idx) && chartData[idx]?.fullName) onBarClick(chartData[idx].fullName);
            } : undefined}
            style={onBarClick ? { cursor: 'pointer' } : undefined}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#7A9488' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
              tick={{ fontSize: 11, fill: '#4B6358' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value, name) => [
                Number(value),
                name === 'violations' ? 'Violations' : 'Total Decisions',
              ]}
              {...tooltipStyle}
            />
            <Bar
              dataKey="violations"
              fill={VIOLATION_COLOR}
              radius={[0, 4, 4, 0]}
              barSize={16}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

// ── 5. Fund Concentration Risk (Small Multiples) ─────────

interface ConcentrationEntry {
  fund_name: string;
  top_investor_pct: number;
  top3_investor_pct: number;
  hhi: number; // Herfindahl-Hirschman Index
}

export function ConcentrationRiskGrid({ data }: { data: ConcentrationEntry[] }) {
  if (!data || data.length === 0) {
    return <EmptyChart label="No concentration data" />;
  }

  return (
    <ChartCard title="Concentration Risk" subtitle="Investor concentration by fund">
      <div className="space-y-3">
        {data.map((fund) => {
          const riskLevel =
            fund.top_investor_pct >= 50
              ? 'high'
              : fund.top_investor_pct >= 25
              ? 'medium'
              : 'low';
          const riskColor =
            riskLevel === 'high'
              ? '#DC2626'
              : riskLevel === 'medium'
              ? '#EA580C'
              : '#16A34A';
          const riskBg =
            riskLevel === 'high'
              ? 'bg-red-50'
              : riskLevel === 'medium'
              ? 'bg-orange-50'
              : 'bg-brand-50';

          return (
            <div key={fund.fund_name} className="rounded-lg border border-edge-subtle p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-ink">{fund.fund_name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${riskBg}`}
                  style={{ color: riskColor }}
                >
                  {riskLevel}
                </span>
              </div>
              <div className="space-y-1.5">
                <ConcentrationBar label="Top investor" value={fund.top_investor_pct} color={riskColor} />
                <ConcentrationBar label="Top 3 investors" value={fund.top3_investor_pct} color="#22C55E" />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-ink-tertiary">
                <span>HHI: {fund.hhi.toLocaleString()}</span>
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
}

function ConcentrationBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 text-[11px] text-ink-tertiary">{label}</span>
      <div className="flex-1">
        <div className="h-1.5 w-full rounded-full bg-surface-subtle">
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
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
    <div className="rounded-xl border border-edge bg-white p-5 shadow-sm">
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
