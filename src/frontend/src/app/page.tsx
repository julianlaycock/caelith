'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { Card, MetricCard, Badge, RiskFlagCard, UtilizationBar, SectionHeader, ErrorMessage, Modal } from '../components/ui';
import {
  InvestorTypeDonut,
  JurisdictionExposureBar,
  KycExpiryHorizon,
  ViolationAnalysisBar,
  ConcentrationRiskGrid,
} from '../components/charts';
import { formatNumber, formatDateTime, classNames, getErrorMessage } from '../lib/utils';
import type { FundStructure, ComplianceReport, CapTableEntry, DecisionRecord, Investor } from '../lib/types';

interface FundReportPair {
  fund: FundStructure;
  report: ComplianceReport;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-edge bg-bg-secondary px-4 py-3 shadow-sm animate-pulse">
      <div className="h-2.5 w-20 rounded bg-bg-tertiary mb-2" />
      <div className="h-5 w-14 rounded bg-bg-tertiary mb-1" />
      <div className="h-2.5 w-28 rounded bg-bg-tertiary" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between px-6 py-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-4 w-20 rounded bg-bg-tertiary" />
        <div className="h-4 w-32 rounded bg-bg-tertiary" />
      </div>
      <div className="h-4 w-16 rounded bg-bg-tertiary" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="rounded-xl border border-edge bg-bg-secondary p-5 shadow-sm animate-pulse">
      <div className="h-3.5 w-32 rounded bg-bg-tertiary mb-2" />
      <div className="h-3 w-48 rounded bg-bg-tertiary mb-4" />
      <div className="h-[200px] rounded bg-bg-tertiary" />
    </div>
  );
}

// ── Chart data aggregation helpers ───────────────────────

function aggregateByType(investors: Investor[], reports: ComplianceReport[]) {
  // Deduplicated counts from canonical investor list
  const countMap = new Map<string, number>();
  for (const inv of investors) {
    countMap.set(inv.investor_type, (countMap.get(inv.investor_type) || 0) + 1);
  }

  // Unit totals from reports (units are per-asset, valid to sum across funds)
  const unitsMap = new Map<string, number>();
  for (const r of reports) {
    for (const entry of r.investor_breakdown.by_type) {
      unitsMap.set(entry.type, (unitsMap.get(entry.type) || 0) + entry.total_units);
    }
  }

  const allTypes = new Set([...Array.from(countMap.keys()), ...Array.from(unitsMap.keys())]);
  return Array.from(allTypes).map((type) => ({
    type,
    count: countMap.get(type) || 0,
    total_units: unitsMap.get(type) || 0,
  }));
}

function aggregateByJurisdiction(investors: Investor[], reports: ComplianceReport[]) {
  // Deduplicated counts from canonical investor list
  const countMap = new Map<string, number>();
  for (const inv of investors) {
    countMap.set(inv.jurisdiction, (countMap.get(inv.jurisdiction) || 0) + 1);
  }

  // Unit totals from reports (units are per-asset, valid to sum across funds)
  const unitsMap = new Map<string, number>();
  for (const r of reports) {
    for (const entry of r.investor_breakdown.by_jurisdiction) {
      unitsMap.set(entry.jurisdiction, (unitsMap.get(entry.jurisdiction) || 0) + entry.total_units);
    }
  }

  const allJurisdictions = new Set([...Array.from(countMap.keys()), ...Array.from(unitsMap.keys())]);
  return Array.from(allJurisdictions).map((jurisdiction) => ({
    jurisdiction,
    count: countMap.get(jurisdiction) || 0,
    total_units: unitsMap.get(jurisdiction) || 0,
  }));
}

function aggregateKycData(investors: Investor[]) {
  let verified = 0;
  let pending = 0;
  let expired = 0;
  let expiring_soon = 0;

  const now = new Date();
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  for (const inv of investors) {
    if (inv.kyc_status === 'verified') {
      if (inv.kyc_expiry) {
        const expiryDate = new Date(inv.kyc_expiry);
        if (expiryDate < now) {
          expired += 1;
        } else if (expiryDate <= ninetyDaysFromNow) {
          expiring_soon += 1;
        } else {
          verified += 1;
        }
      } else {
        verified += 1;
      }
    } else if (inv.kyc_status === 'pending') {
      pending += 1;
    } else if (inv.kyc_status === 'expired') {
      expired += 1;
    }
  }

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

interface RiskFlag {
  severity: 'high' | 'medium' | 'low';
  category: string;
  message: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [fundReports, setFundReports] = useState<FundReportPair[]>([]);
  const [allInvestors, setAllInvestors] = useState<Investor[]>([]);
  const [capTables, setCapTables] = useState<Map<string, CapTableEntry[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<RiskFlag | null>(null);
  const [violationAsset, setViolationAsset] = useState<string | null>(null);
  const [violationDecisions, setViolationDecisions] = useState<DecisionRecord[]>([]);
  const [violationLoading, setViolationLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [funds, investors] = await Promise.all([
        api.getFundStructures(),
        api.getInvestors(),
      ]);
      setAllInvestors(investors);
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
      setError(getErrorMessage(err, 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Memoized derived data
  const reports = useMemo(() => fundReports.map(({ report }) => report), [fundReports]);

  const assetNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const { report } of fundReports) {
      for (const asset of report.fund.assets) {
        map[asset.id] = asset.name;
      }
    }
    return map;
  }, [fundReports]);

  // Fetch full decision records when violation modal opens
  useEffect(() => {
    if (!violationAsset) {
      setViolationDecisions([]);
      return;
    }
    const assetId = Object.entries(assetNameMap).find(([, name]) => name === violationAsset)?.[0];
    if (!assetId) return;
    setViolationLoading(true);
    api.getDecisionsByAsset(assetId)
      .then((decisions) => setViolationDecisions(decisions.filter((d) => d.result_details?.violation_count > 0)))
      .catch(() => setViolationDecisions([]))
      .finally(() => setViolationLoading(false));
  }, [violationAsset, assetNameMap]);

  // Aggregate metrics
  const totalFunds = fundReports.length;
  const totalInvestors = allInvestors.filter((inv) => inv.kyc_status === 'verified').length;
  const totalAllocated = fundReports.reduce((sum, { report }) => sum + report.fund.total_allocated_units, 0);
  const allRiskFlags = useMemo(() => fundReports.flatMap(({ report }) => report.risk_flags), [fundReports]);
  const actionRequired = allRiskFlags.filter((f) => f.severity === 'high' || f.severity === 'medium').length;

  // Aggregate recent decisions across all funds
  const allDecisions = useMemo(() =>
    fundReports
      .flatMap(({ report }) => report.recent_decisions)
      .sort((a, b) => new Date(b.decided_at).getTime() - new Date(a.decided_at).getTime())
      .slice(0, 10),
    [fundReports]
  );

  // Memoized chart data aggregations
  const typeData = useMemo(() => aggregateByType(allInvestors, reports), [allInvestors, reports]);
  const jurisdictionData = useMemo(() => aggregateByJurisdiction(allInvestors, reports), [allInvestors, reports]);
  const kycData = useMemo(() => aggregateKycData(allInvestors), [allInvestors]);
  const violationData = useMemo(() => aggregateViolations(reports, assetNameMap), [reports, assetNameMap]);
  const concentrationData = useMemo(() => computeConcentration(fundReports, capTables), [fundReports, capTables]);

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
        <span className="rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm">{today}</span>
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
              sub={actionRequired === 0 ? 'All clear' : `High + Medium severity flags`}
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
          <div className="h-4 w-40 rounded bg-bg-tertiary mb-4 animate-pulse" />
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
            <InvestorTypeDonut data={typeData} onTypeClick={(type) => router.push(`/investors?type=${type}`)} />
            <JurisdictionExposureBar data={jurisdictionData} onBarClick={(j) => router.push(`/jurisdiction/${j}`)} />
            <KycExpiryHorizon data={kycData} onStatusClick={(status) => router.push(`/investors?kyc=${status}`)} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ViolationAnalysisBar data={violationData} onBarClick={(name) => setViolationAsset(name)} />
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
              <div key={i} className="cursor-pointer transition-transform hover:scale-[1.005]" onClick={() => setSelectedRisk(flag)}>
                <RiskFlagCard severity={flag.severity} category={flag.category} message={flag.message} />
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && allRiskFlags.length === 0 && fundReports.length > 0 && (
        <div className="mb-6">
          <div className="rounded-xl border border-accent-500/20 bg-accent-500/10 p-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent-500/100" />
              <p className="text-sm font-medium text-accent-200">All Clear</p>
            </div>
            <p className="mt-1 text-sm text-accent-300">No risk flags detected across any fund structures.</p>
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
                    className="text-xs font-medium text-accent-400 hover:text-accent-300 transition-colors"
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
          <div className="h-4 w-32 rounded bg-bg-tertiary mb-4 animate-pulse" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-edge bg-bg-secondary p-6 shadow-sm animate-pulse">
              <div className="h-4 w-40 rounded bg-bg-tertiary mb-3" />
              <div className="flex gap-2 mb-4">
                <div className="h-5 w-12 rounded bg-bg-tertiary" />
                <div className="h-5 w-10 rounded bg-bg-tertiary" />
              </div>
              <div className="h-2 w-full rounded bg-bg-tertiary mb-3" />
              <div className="h-3 w-32 rounded bg-bg-tertiary" />
            </div>
            <div className="rounded-xl border border-edge bg-bg-secondary p-6 shadow-sm animate-pulse">
              <div className="h-4 w-40 rounded bg-bg-tertiary mb-3" />
              <div className="flex gap-2 mb-4">
                <div className="h-5 w-12 rounded bg-bg-tertiary" />
                <div className="h-5 w-10 rounded bg-bg-tertiary" />
              </div>
              <div className="h-2 w-full rounded bg-bg-tertiary mb-3" />
              <div className="h-3 w-32 rounded bg-bg-tertiary" />
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
                      <tr key={d.id} className="hover:bg-bg-tertiary transition-colors">
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
          <div className="h-4 w-32 rounded bg-bg-tertiary mb-4 animate-pulse" />
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
            <p className="mt-1 text-sm text-ink-secondary">Run <code className="rounded bg-bg-tertiary px-1 py-0.5 font-mono text-xs">npm run seed:showcase</code> in the project root, then refresh.</p>
          </div>
        </Card>
      )}

      {/* Risk Detail Slide-Out Panel */}
      {selectedRisk && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedRisk(null)} />
          <div className="ml-auto relative z-10 w-full max-w-md h-full bg-bg-secondary shadow-xl border-l border-edge overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-edge bg-bg-secondary px-6 py-4">
              <h2 className="text-base font-semibold text-ink">Risk Flag Detail</h2>
              <button
                onClick={() => setSelectedRisk(null)}
                className="rounded-lg p-1 text-ink-tertiary hover:bg-bg-tertiary hover:text-ink transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Severity */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary mb-2">Severity</p>
                <span className={classNames(
                  'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wider',
                  selectedRisk.severity === 'high' && 'bg-red-500/100/15 text-red-400',
                  selectedRisk.severity === 'medium' && 'bg-amber-500/100/15 text-amber-400',
                  selectedRisk.severity === 'low' && 'bg-accent-500/15 text-accent-300',
                )}>
                  {selectedRisk.severity}
                </span>
              </div>

              {/* Category */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary mb-2">Category</p>
                <p className="text-sm font-medium text-ink">{selectedRisk.category}</p>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary mb-2">Description</p>
                <p className="text-sm text-ink leading-relaxed">{selectedRisk.message}</p>
              </div>

              {/* Recommended Actions */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary mb-2">Recommended Actions</p>
                <div className={classNames(
                  'rounded-lg border p-4 space-y-2',
                  selectedRisk.severity === 'high' ? 'border-red-500/20 bg-red-500/100/10' : selectedRisk.severity === 'medium' ? 'border-amber-500/20 bg-amber-500/100/10' : 'border-accent-500/20 bg-accent-500/10',
                )}>
                  {selectedRisk.severity === 'high' && (
                    <>
                      <p className="text-sm text-red-300 font-medium">Immediate attention required</p>
                      <ul className="space-y-1 text-sm text-red-400">
                        <li>&bull; Review and remediate the flagged condition</li>
                        <li>&bull; Escalate to compliance officer if unresolved</li>
                        <li>&bull; Document remediation steps taken</li>
                      </ul>
                    </>
                  )}
                  {selectedRisk.severity === 'medium' && (
                    <>
                      <p className="text-sm text-amber-800 font-medium">Review within 7 days</p>
                      <ul className="space-y-1 text-sm text-amber-400">
                        <li>&bull; Investigate the flagged condition</li>
                        <li>&bull; Schedule follow-up action if needed</li>
                        <li>&bull; Monitor for escalation</li>
                      </ul>
                    </>
                  )}
                  {selectedRisk.severity === 'low' && (
                    <>
                      <p className="text-sm text-accent-200 font-medium">Monitor and review</p>
                      <ul className="space-y-1 text-sm text-accent-300">
                        <li>&bull; Note for next periodic review</li>
                        <li>&bull; No immediate action required</li>
                      </ul>
                    </>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <div className="rounded-lg bg-bg-tertiary px-4 py-3">
                <p className="text-xs text-ink-tertiary">Flagged at: {today}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Violation Detail Modal */}
      <Modal open={!!violationAsset} onClose={() => setViolationAsset(null)} title={`Violations — ${violationAsset || ''}`}>
        {violationAsset && (() => {
          // Get matching eligibility criteria for source references
          const eligCriteria = reports.flatMap((r) => r.eligibility_criteria);

          if (violationLoading) {
            return (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                <span className="ml-2 text-sm text-ink-secondary">Loading decisions…</span>
              </div>
            );
          }

          return violationDecisions.length > 0 ? (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {violationDecisions.map((d) => (
                <div key={d.id} className="rounded-lg border border-edge-subtle p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-ink">{d.decision_type.replace(/_/g, ' ')}</span>
                    <Badge variant={d.result === 'approved' ? 'green' : d.result === 'rejected' ? 'red' : 'gray'}>
                      {d.result}
                    </Badge>
                  </div>
                  <p className="text-xs tabular-nums text-ink-tertiary mb-3">{formatDateTime(d.decided_at)}</p>

                  {/* Individual checks */}
                  {d.result_details?.checks && d.result_details.checks.length > 0 && (
                    <div className="space-y-1.5">
                      {d.result_details.checks.map((check, ci) => (
                        <div
                          key={ci}
                          className={classNames(
                            'flex items-start gap-2 rounded-md px-3 py-2 text-xs',
                            check.passed ? 'bg-accent-500/10' : 'bg-red-500/100/10'
                          )}
                        >
                          <span className="mt-0.5 flex-shrink-0">
                            {check.passed ? (
                              <svg className="h-3.5 w-3.5 text-accent-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={classNames('font-medium', check.passed ? 'text-accent-200' : 'text-red-300')}>
                              {check.rule}
                            </p>
                            <p className={classNames('mt-0.5', check.passed ? 'text-accent-300' : 'text-red-400')}>
                              {check.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Regulatory citations from eligibility criteria */}
                  {eligCriteria.length > 0 && (
                    <div className="mt-3 rounded-md border border-edge-subtle bg-bg-tertiary px-3 py-2">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-ink-tertiary mb-1">Regulatory Citations</p>
                      <div className="space-y-0.5">
                        {eligCriteria
                          .filter((c) => c.source_reference)
                          .slice(0, 5)
                          .map((c, ci) => (
                            <p key={ci} className="text-xs text-ink-secondary">
                              <span className="font-medium text-ink">{c.investor_type.replace(/_/g, ' ')}</span>
                              {' — '}
                              <span className="font-mono text-[11px]">{c.source_reference}</span>
                            </p>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-secondary py-4 text-center">No detailed violation records available.</p>
          );
        })()}
      </Modal>
    </div>
  );
}
