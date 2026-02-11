'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { Card, MetricCard, Badge, RiskFlagCard, UtilizationBar, SectionHeader, ErrorMessage } from '../components/ui';
import {
  InvestorTypeDonut,
  JurisdictionExposureBar,
  KycExpiryHorizon,
  ViolationAnalysisBar,
  ConcentrationRiskGrid,
} from '../components/charts';
import { formatNumber, formatDateTime } from '../lib/utils';
import type { FundStructure, ComplianceReport, CapTableEntry } from '../lib/types';

interface FundReportPair {
  fund: FundStructure;
  report: ComplianceReport;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-edge bg-white px-4 py-3 shadow-sm animate-pulse">
      <div className="h-2.5 w-20 rounded bg-surface-subtle mb-2" />
      <div className="h-5 w-14 rounded bg-surface-subtle mb-1" />
      <div className="h-2.5 w-28 rounded bg-surface-subtle" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between px-6 py-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-4 w-20 rounded bg-surface-subtle" />
        <div className="h-4 w-32 rounded bg-surface-subtle" />
      </div>
      <div className="h-4 w-16 rounded bg-surface-subtle" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="rounded-xl border border-edge bg-white p-5 shadow-sm animate-pulse">
      <div className="h-3.5 w-32 rounded bg-surface-subtle mb-2" />
      <div className="h-3 w-48 rounded bg-surface-subtle mb-4" />
      <div className="h-[200px] rounded bg-surface-subtle" />
    </div>
  );
}

// ── Chart data aggregation helpers ───────────────────────

function aggregateByType(reports: ComplianceReport[]) {
  const map = new Map<string, { count: number; total_units: number }>();
  for (const r of reports) {
    for (const entry of r.investor_breakdown.by_type) {
      const existing = map.get(entry.type) || { count: 0, total_units: 0 };
      map.set(entry.type, {
        count: existing.count + entry.count,
        total_units: existing.total_units + entry.total_units,
      });
    }
  }
  return Array.from(map.entries()).map(([type, data]) => ({ type, ...data }));
}

function aggregateByJurisdiction(reports: ComplianceReport[]) {
  const map = new Map<string, { count: number; total_units: number }>();
  for (const r of reports) {
    for (const entry of r.investor_breakdown.by_jurisdiction) {
      const existing = map.get(entry.jurisdiction) || { count: 0, total_units: 0 };
      map.set(entry.jurisdiction, {
        count: existing.count + entry.count,
        total_units: existing.total_units + entry.total_units,
      });
    }
  }
  return Array.from(map.entries()).map(([jurisdiction, data]) => ({ jurisdiction, ...data }));
}

function aggregateKycData(reports: ComplianceReport[]) {
  let verified = 0;
  let pending = 0;
  let expired = 0;
  let expiring_soon = 0;

  for (const r of reports) {
    for (const entry of r.investor_breakdown.by_kyc_status) {
      if (entry.status === 'verified') verified += entry.count;
      else if (entry.status === 'pending') pending += entry.count;
      else if (entry.status === 'expired') expired += entry.count;
    }
    expiring_soon += r.investor_breakdown.kyc_expiring_within_90_days.length;
  }

  // Subtract expiring_soon from verified since they're a subset
  verified = Math.max(0, verified - expiring_soon);

  return { verified, pending, expired, expiring_soon };
}

function aggregateViolations(
  reports: ComplianceReport[],
  assetNameMap: Record<string, string>
) {
  const map = new Map<string, { violations: number; total: number }>();
  for (const r of reports) {
    for (const d of r.recent_decisions) {
      const existing = map.get(d.asset_id) || { violations: 0, total: 0 };
      map.set(d.asset_id, {
        violations: existing.violations + d.violation_count,
        total: existing.total + 1,
      });
    }
  }
  return Array.from(map.entries())
    .filter(([, data]) => data.violations > 0)
    .map(([asset_id, data]) => ({
      asset_name: assetNameMap[asset_id] || asset_id.slice(0, 8),
      violation_count: data.violations,
      total_decisions: data.total,
    }));
}

function computeConcentration(
  fundReports: FundReportPair[],
  capTables: Map<string, CapTableEntry[]>
): { fund_name: string; top_investor_pct: number; top3_investor_pct: number; hhi: number }[] {
  return fundReports.map(({ fund, report }) => {
    // Merge all cap table entries across assets in this fund
    const allEntries: CapTableEntry[] = [];
    for (const asset of report.fund.assets) {
      const entries = capTables.get(asset.id);
      if (entries) allEntries.push(...entries);
    }

    if (allEntries.length === 0) {
      return { fund_name: fund.name, top_investor_pct: 0, top3_investor_pct: 0, hhi: 0 };
    }

    // Aggregate units by investor across all assets in this fund
    const investorUnits = new Map<string, number>();
    let totalUnits = 0;
    for (const entry of allEntries) {
      investorUnits.set(entry.investor_id, (investorUnits.get(entry.investor_id) || 0) + entry.units);
      totalUnits += entry.units;
    }

    if (totalUnits === 0) {
      return { fund_name: fund.name, top_investor_pct: 0, top3_investor_pct: 0, hhi: 0 };
    }

    // Compute percentages
    const pcts = Array.from(investorUnits.values())
      .map((u) => (u / totalUnits) * 100)
      .sort((a, b) => b - a);

    const top_investor_pct = pcts[0] || 0;
    const top3_investor_pct = pcts.slice(0, 3).reduce((s, p) => s + p, 0);
    const hhi = Math.round(pcts.reduce((s, p) => s + p * p, 0));

    return { fund_name: fund.name, top_investor_pct, top3_investor_pct, hhi };
  });
}

export default function DashboardPage() {
  const [fundReports, setFundReports] = useState<FundReportPair[]>([]);
  const [capTables, setCapTables] = useState<Map<string, CapTableEntry[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const funds = await api.getFundStructures();
      const pairs: FundReportPair[] = [];
      for (const fund of funds) {
        try {
          const report = await api.getComplianceReport(fund.id);
          pairs.push({ fund, report });
        } catch {
          // Skip funds without reports
        }
      }
      setFundReports(pairs);

      // Fetch cap tables for concentration chart
      const capTableMap = new Map<string, CapTableEntry[]>();
      const allAssetIds = new Set<string>();
      for (const { report } of pairs) {
        for (const asset of report.fund.assets) {
          if (asset.holder_count > 0) allAssetIds.add(asset.id);
        }
      }
      const capResults = await Promise.allSettled(
        Array.from(allAssetIds).map(async (assetId) => {
          const entries = await api.getCapTable(assetId);
          return { assetId, entries };
        })
      );
      for (const result of capResults) {
        if (result.status === 'fulfilled') {
          capTableMap.set(result.value.assetId, result.value.entries);
        }
      }
      setCapTables(capTableMap);
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || 'Failed to load dashboard data';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Aggregate metrics
  const totalFunds = fundReports.length;
  const totalInvestors = fundReports.reduce((sum, { report }) => sum + report.fund.total_investors, 0);
  const totalAllocated = fundReports.reduce((sum, { report }) => sum + report.fund.total_allocated_units, 0);
  const allRiskFlags = fundReports.flatMap(({ report }) => report.risk_flags);
  const actionRequired = allRiskFlags.filter((f) => f.severity === 'high' || f.severity === 'medium').length;

  // Aggregate recent decisions across all funds
  const allDecisions = fundReports
    .flatMap(({ report }) => report.recent_decisions)
    .sort((a, b) => new Date(b.decided_at).getTime() - new Date(a.decided_at).getTime())
    .slice(0, 10);

  // Build a map of asset ID -> asset name for decision display
  const assetNameMap: Record<string, string> = {};
  for (const { report } of fundReports) {
    for (const asset of report.fund.assets) {
      assetNameMap[asset.id] = asset.name;
    }
  }

  // Aggregate chart data
  const reports = fundReports.map(({ report }) => report);
  const typeData = aggregateByType(reports);
  const jurisdictionData = aggregateByJurisdiction(reports);
  const kycData = aggregateKycData(reports);
  const violationData = aggregateViolations(reports, assetNameMap);
  const concentrationData = computeConcentration(fundReports, capTables);

  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (error) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-ink">Command Center</h1>
          <p className="mt-0.5 text-sm text-ink-secondary">Compliance engine overview</p>
        </div>
        <ErrorMessage message={error} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Command Center</h1>
          <p className="mt-0.5 text-sm text-ink-secondary">Compliance engine overview</p>
        </div>
        <span className="text-sm text-ink-tertiary">{today}</span>
      </div>

      {/* Metric Cards — compact */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <MetricCard
              label="Active Funds"
              value={totalFunds}
              sub={`${totalFunds} fund structure${totalFunds !== 1 ? 's' : ''}`}
              accent="default"
              compact
            />
            <MetricCard
              label="Verified Investors"
              value={totalInvestors}
              sub="Across all funds"
              accent="default"
              compact
            />
            <MetricCard
              label="Units Allocated"
              value={formatNumber(totalAllocated)}
              sub="Total allocated units"
              accent="success"
              compact
            />
            <MetricCard
              label="Actions Required"
              value={actionRequired}
              sub={actionRequired === 0 ? 'All clear' : `${actionRequired} flag${actionRequired !== 1 ? 's' : ''} need attention`}
              accent={actionRequired > 0 ? 'danger' : 'success'}
              compact
              onClick={actionRequired > 0 ? () => {
                document.getElementById('risk-flags')?.scrollIntoView({ behavior: 'smooth' });
              } : undefined}
            />
          </>
        )}
      </div>

      {/* Data Visualization Charts */}
      {loading ? (
        <div className="mb-6">
          <div className="h-4 w-40 rounded bg-surface-subtle mb-4 animate-pulse" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <SkeletonChart />
            <SkeletonChart />
            <SkeletonChart />
          </div>
        </div>
      ) : fundReports.length > 0 ? (
        <div className="mb-6">
          <SectionHeader title="Analytics" description="Portfolio composition and compliance metrics" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <InvestorTypeDonut data={typeData} />
            <JurisdictionExposureBar data={jurisdictionData} />
            <KycExpiryHorizon data={kycData} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ViolationAnalysisBar data={violationData} />
            <ConcentrationRiskGrid data={concentrationData} />
          </div>
        </div>
      ) : null}

      {/* Risk Flags */}
      {!loading && allRiskFlags.length > 0 && (
        <div id="risk-flags" className="mb-6 scroll-mt-4">
          <SectionHeader title="Risk Flags" description={`${allRiskFlags.length} flag${allRiskFlags.length !== 1 ? 's' : ''} across all funds`} />
          <div className="space-y-2">
            {allRiskFlags.map((flag, i) => (
              <RiskFlagCard key={i} severity={flag.severity} category={flag.category} message={flag.message} />
            ))}
          </div>
        </div>
      )}

      {!loading && allRiskFlags.length === 0 && fundReports.length > 0 && (
        <div className="mb-6">
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              <p className="text-sm font-medium text-brand-800">All Clear</p>
            </div>
            <p className="mt-1 text-sm text-brand-700">No risk flags detected across any fund structures.</p>
          </div>
        </div>
      )}

      {/* Fund Structure Cards */}
      {!loading && fundReports.length > 0 && (
        <div className="mb-6">
          <SectionHeader title="Fund Structures" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {fundReports.map(({ fund, report }) => (
              <Card key={fund.id}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{fund.name}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="gray">{fund.legal_form}</Badge>
                      <Badge variant="gray">{fund.domicile}</Badge>
                      {fund.regulatory_framework && (
                        <Badge variant="green">{fund.regulatory_framework}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Utilization</p>
                  <UtilizationBar allocated={report.fund.total_allocated_units} total={report.fund.total_aum_units} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-ink-secondary">
                    {report.fund.total_investors} investor{report.fund.total_investors !== 1 ? 's' : ''}
                    {' · '}
                    {report.fund.assets.length} asset{report.fund.assets.length !== 1 ? 's' : ''}
                  </p>
                  <Link
                    href={`/funds/${fund.id}`}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    View Compliance Report &rarr;
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="mb-6">
          <div className="h-4 w-32 rounded bg-surface-subtle mb-4 animate-pulse" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-edge bg-white p-6 shadow-sm animate-pulse">
              <div className="h-4 w-40 rounded bg-surface-subtle mb-3" />
              <div className="flex gap-2 mb-4">
                <div className="h-5 w-12 rounded bg-surface-subtle" />
                <div className="h-5 w-10 rounded bg-surface-subtle" />
              </div>
              <div className="h-2 w-full rounded bg-surface-subtle mb-3" />
              <div className="h-3 w-32 rounded bg-surface-subtle" />
            </div>
            <div className="rounded-xl border border-edge bg-white p-6 shadow-sm animate-pulse">
              <div className="h-4 w-40 rounded bg-surface-subtle mb-3" />
              <div className="flex gap-2 mb-4">
                <div className="h-5 w-12 rounded bg-surface-subtle" />
                <div className="h-5 w-10 rounded bg-surface-subtle" />
              </div>
              <div className="h-2 w-full rounded bg-surface-subtle mb-3" />
              <div className="h-3 w-32 rounded bg-surface-subtle" />
            </div>
          </div>
        </div>
      )}

      {/* Recent Decisions Table */}
      {!loading && allDecisions.length > 0 && (
        <div>
          <SectionHeader title="Recent Decisions" description="Latest compliance decisions across all funds" />
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-edge">
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Time</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Type</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Result</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Asset</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Checks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge-subtle">
                  {allDecisions.map((d) => {
                    const resultVariant = d.result === 'approved' || d.result === 'pass'
                      ? 'green'
                      : d.result === 'rejected' || d.result === 'fail'
                      ? 'red'
                      : 'gray';
                    return (
                      <tr key={d.id} className="hover:bg-surface-subtle transition-colors">
                        <td className="px-6 py-3 text-xs tabular-nums text-ink-secondary">
                          {formatDateTime(d.decided_at)}
                        </td>
                        <td className="px-6 py-3 text-sm text-ink">
                          {d.decision_type.replace(/_/g, ' ')}
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant={resultVariant}>{d.result}</Badge>
                        </td>
                        <td className="px-6 py-3 text-sm text-ink">
                          {assetNameMap[d.asset_id] || d.asset_id.slice(0, 8)}
                        </td>
                        <td className="px-6 py-3 text-sm tabular-nums text-ink-secondary">
                          {d.violation_count === 0 ? 'All passed' : `${d.violation_count} violation${d.violation_count !== 1 ? 's' : ''}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {loading && (
        <div>
          <div className="h-4 w-32 rounded bg-surface-subtle mb-4 animate-pulse" />
          <Card padding={false}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </Card>
        </div>
      )}

      {!loading && fundReports.length === 0 && (
        <Card>
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-ink">No fund structures found</p>
            <p className="mt-1 text-sm text-ink-secondary">Create a fund structure to see compliance data here.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
