'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import { Card, SectionHeader, Badge, RiskFlagCard, ErrorMessage } from '../../components/ui';
import {
  ConcentrationRiskGrid,
  ActiveViolationsCard,
  KycPipelineCard,
  AuditReadinessCard,
  InvestorTypeBreakdownCard,
  JurisdictionExposureCard,
  LeverageUtilizationCard,
  RegulatoryCalendarCard,
  NewsFeedCard,
} from '../../components/charts';
import { formatDateTime, getErrorMessage } from '../../lib/utils';
import { SetupWizard } from '../../components/setup-wizard';
import { DashboardMetrics } from '../../components/dashboard-metrics';
import { ActionQueue } from '../../components/action-queue';
import { RiskDetailPanel } from '../../components/risk-detail-panel';
import { ViolationModal } from '../../components/violation-modal';
import { FundCard } from '../../components/fund-card';
import { OnboardingChecklist } from '../../components/onboarding-checklist';
import {
  computeConcentration,
  calculateEventTrend,
} from '../../lib/dashboard-utils';
import type { FundReportPair, RiskFlag, ActionQueueItem } from '../../lib/dashboard-utils';
import type { CapTableEntry, DecisionRecord, Investor, Event } from '../../lib/types';
import { useI18n, useLocaleDate } from '../../lib/i18n';

// Skeleton components for loading states

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
    <div className="rounded-xl border border-edge bg-bg-secondary p-5 animate-pulse">
      <div className="h-3.5 w-32 rounded bg-bg-tertiary mb-2" />
      <div className="h-3 w-48 rounded bg-bg-tertiary mb-4" />
      <div className="h-[200px] rounded bg-bg-tertiary" />
    </div>
  );
}

type AnalyticsTab = 'status' | 'risk' | 'calendar' | 'news';

function AnalyticsTabs({
  fundReports,
  allInvestors,
  concentrationData,
}: {
  fundReports: FundReportPair[];
  allInvestors: Investor[];
  concentrationData: { fund_name: string; top_investor_pct: number; top3_investor_pct: number; hhi: number }[];
}) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('status');
  const { t } = useI18n();

  const tabs: { key: AnalyticsTab; label: string }[] = [
    { key: 'status', label: t('tabs.status') },
    { key: 'risk', label: t('tabs.risk') },
    { key: 'calendar', label: t('tabs.calendar') },
    { key: 'news', label: t('tabs.news') },
  ];

  const fundNames = fundReports.map(({ fund }) => fund.name);

  return (
    <div className="mb-6">
      <SectionHeader title={t('dashboard.analytics')} description={t('dashboard.analyticsDesc')} />

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 p-1 rounded-lg bg-bg-tertiary/50 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-md text-[11px] font-semibold tracking-[0.08em] transition-all font-[Sora,sans-serif] ${
              activeTab === tab.key
                ? 'bg-[rgba(197,224,238,0.15)] text-ink border border-brand-accent shadow-sm'
                : 'text-ink-tertiary hover:text-ink-secondary border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'status' && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <ActiveViolationsCard fundReports={fundReports} />
          <KycPipelineCard investors={allInvestors} />
          <AuditReadinessCard fundReports={fundReports} />
          <InvestorTypeBreakdownCard investors={allInvestors} />
          <JurisdictionExposureCard investors={allInvestors} />
        </div>
      )}

      {activeTab === 'risk' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ConcentrationRiskGrid data={concentrationData} />
          <LeverageUtilizationCard fundNames={fundNames} />
        </div>
      )}

      {activeTab === 'calendar' && (
        <div>
          <RegulatoryCalendarCard />
        </div>
      )}

      {activeTab === 'news' && (
        <div>
          <NewsFeedCard />
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useI18n();
  const localeDateFormat = useLocaleDate();
  const [fundReports, setFundReports] = useState<FundReportPair[]>([]);
  const [allInvestors, setAllInvestors] = useState<Investor[]>([]);
  const [capTables, setCapTables] = useState<Map<string, CapTableEntry[]>>(new Map());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardDismissed, setWizardDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<RiskFlag | null>(null);
  const [violationAsset, setViolationAsset] = useState<string | null>(null);
  const [violationDecisions, setViolationDecisions] = useState<DecisionRecord[]>([]);
  const [violationLoading, setViolationLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [funds, investors, recentEvents] = await Promise.all([
        api.getFundStructures(),
        api.getInvestors(),
        api.getEvents({ limit: 500 }),
      ]);
      setAllInvestors(investors);
      setEvents(recentEvents);
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
      setError(getErrorMessage(err, t('dashboard.errorLoading')));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const totalFunds = fundReports.length;
  const totalInvestors = allInvestors.filter((inv) => inv.kyc_status === 'verified').length;
  const totalAllocated = fundReports.reduce((sum, { report }) => sum + report.fund.total_allocated_units, 0);
  const allRiskFlags = useMemo(() => fundReports.flatMap(({ report }) => report.risk_flags), [fundReports]);
  const actionRequired = allRiskFlags.filter((f) => f.severity === 'high' || f.severity === 'medium').length;

  const allDecisions = useMemo(() =>
    fundReports
      .flatMap(({ report }) => report.recent_decisions)
      .sort((a, b) => new Date(b.decided_at).getTime() - new Date(a.decided_at).getTime())
      .slice(0, 10),
    [fundReports]
  );

  const investorTrend = useMemo(() => calculateEventTrend(events, 'investor.created'), [events]);
  const fundTrend = useMemo(() => calculateEventTrend(events, 'fund_structure.created'), [events]);
  const transferTrend = useMemo(() => calculateEventTrend(events, 'transfer.executed'), [events]);
  const rejectionTrend = useMemo(() => calculateEventTrend(events, 'transfer.rejected'), [events]);

  const actionQueue = useMemo<ActionQueueItem[]>(() => {
    const items: ActionQueueItem[] = [];
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiringSoon = allInvestors.filter((inv) =>
      inv.kyc_status === 'verified' &&
      !!inv.kyc_expiry &&
      new Date(inv.kyc_expiry) > now &&
      new Date(inv.kyc_expiry) <= in30Days
    ).length;
    if (expiringSoon > 0) {
      items.push({
        id: 'kyc-expiring',
        severity: 'high',
        title: t('dashboard.kycRenewals'),
        detail: `${expiringSoon} ${expiringSoon !== 1 ? t('common.investors') : t('common.investor')}`,
        href: '/investors?kyc=expiring_soon',
      });
    }

    const highFlags = allRiskFlags.filter((f) => f.severity === 'high').length;
    if (highFlags > 0) {
      items.push({
        id: 'high-risk-flags',
        severity: 'high',
        title: t('dashboard.highRiskFlags'),
        detail: `${highFlags} ${t('common.high').toLowerCase()}`,
        href: '/#risk-flags',
      });
    }

    const rejectedRecent = allDecisions.filter((d) => d.result === 'rejected' || d.result === 'fail').length;
    if (rejectedRecent > 0) {
      items.push({
        id: 'rejected-decisions',
        severity: 'medium',
        title: t('dashboard.rejectedDecisions'),
        detail: `${rejectedRecent}`,
        href: '/decisions?result=rejected',
      });
    }

    const pendingOnboarding = reports.reduce((sum, report) => {
      const pending = report.onboarding_pipeline.by_status
        .filter((s) => s.status === 'applied' || s.status === 'eligible')
        .reduce((acc, s) => acc + s.count, 0);
      return sum + pending;
    }, 0);
    if (pendingOnboarding > 0) {
      items.push({
        id: 'pending-onboarding',
        severity: 'medium',
        title: t('dashboard.onboardingQueue'),
        detail: `${pendingOnboarding}`,
        href: '/onboarding',
      });
    }

    const mediumFlags = allRiskFlags.filter((f) => f.severity === 'medium').length;
    if (mediumFlags > 0) {
      items.push({
        id: 'medium-risk-flags',
        severity: 'low',
        title: t('dashboard.mediumFlags'),
        detail: `${mediumFlags}`,
        href: '/#risk-flags',
      });
    }

    const weight = { high: 0, medium: 1, low: 2 } as const;
    return items.sort((a, b) => weight[a.severity] - weight[b.severity]);
  }, [allDecisions, allInvestors, allRiskFlags, reports]);

  const concentrationData = useMemo(() => computeConcentration(fundReports, capTables), [fundReports, capTables]);

  const today = new Date().toLocaleDateString(localeDateFormat, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (error) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-ink">{t('dashboard.title')}</h1>
          <p className="mt-0.5 text-sm text-ink-secondary">{t('dashboard.subtitle')}</p>
        </div>
        <ErrorMessage message={error} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 md:mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-semibold tracking-tight text-ink">{t('dashboard.title')}</h1>
          <p className="mt-0.5 text-sm text-ink-secondary">{t('dashboard.subtitle')}</p>
        </div>
        <span className="hidden sm:inline-block rounded-lg bg-bg-tertiary text-ink-secondary border border-edge px-3 py-1.5 text-xs font-medium">{today}</span>
      </div>

      {/* Setup Wizard */}
      {!loading && fundReports.length === 0 && !wizardDismissed && (
        <SetupWizard onComplete={() => { setWizardDismissed(true); fetchData(); }} />
      )}

      {/* Metric Cards */}
      {(loading || fundReports.length > 0) && (
        <DashboardMetrics
          loading={loading}
          totalFunds={totalFunds}
          totalInvestors={totalInvestors}
          totalAllocated={totalAllocated}
          actionRequired={actionRequired}
          fundTrend={fundTrend}
          investorTrend={investorTrend}
          transferTrend={transferTrend}
          rejectionTrend={rejectionTrend}
          onActionClick={actionRequired > 0 ? () => {
            document.getElementById('risk-flags')?.scrollIntoView({ behavior: 'smooth' });
          } : undefined}
        />
      )}

      {/* Onboarding Checklist */}
      {!loading && (() => {
        const hasFunds = fundReports.length > 0;
        const hasInvestors = allInvestors.length > 0;
        const hasRules = reports.some((r) => r.eligibility_criteria.length > 0);
        const hasDecisions = reports.some((r) => r.recent_decisions.length > 0);
        return <OnboardingChecklist hasFunds={hasFunds} hasInvestors={hasInvestors} hasRules={hasRules} hasDecisions={hasDecisions} />;
      })()}

      {/* Action Queue */}
      {!loading && <ActionQueue items={actionQueue} />}

      {/* Tabbed Analytics */}
      {loading ? (
        <div className="mb-6">
          <div className="h-4 w-40 rounded bg-bg-tertiary mb-4 animate-pulse" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <SkeletonChart />
            <SkeletonChart />
            <SkeletonChart />
          </div>
        </div>
      ) : fundReports.length > 0 ? (
        <AnalyticsTabs
          fundReports={fundReports}
          allInvestors={allInvestors}
          concentrationData={concentrationData}
        />
      ) : null}

      {/* Risk Flags */}
      {!loading && allRiskFlags.length > 0 && (
        <div id="risk-flags" className="mb-6 scroll-mt-4">
          <SectionHeader title={t('dashboard.riskFlags')} description={`${allRiskFlags.length} ${t('common.flagsAcross')}`} />
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
              <span className="h-2 w-2 rounded-full bg-accent-500" />
              <p className="text-sm font-medium text-ink">{t('dashboard.allClear')}</p>
            </div>
            <p className="mt-1 text-sm text-ink-secondary">{t('dashboard.noRiskFlags')}</p>
          </div>
        </div>
      )}

      {/* Fund Structure Cards */}
      {!loading && fundReports.length > 0 && (
        <div className="mb-6">
          <SectionHeader title={t('dashboard.funds')} />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {fundReports.map(({ fund, report }) => (
              <FundCard key={fund.id} fund={fund} report={report} />
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="mb-6">
          <div className="h-4 w-32 rounded bg-bg-tertiary mb-4 animate-pulse" />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-edge bg-bg-secondary p-6 animate-pulse">
              <div className="h-4 w-40 rounded bg-bg-tertiary mb-3" />
              <div className="flex gap-2 mb-4">
                <div className="h-5 w-12 rounded bg-bg-tertiary" />
                <div className="h-5 w-10 rounded bg-bg-tertiary" />
              </div>
              <div className="h-2 w-full rounded bg-bg-tertiary mb-3" />
              <div className="h-3 w-32 rounded bg-bg-tertiary" />
            </div>
            <div className="rounded-xl border border-edge bg-bg-secondary p-6 animate-pulse">
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
          <SectionHeader title={t('dashboard.recentDecisions')} description={t('dashboard.recentDecisionsDesc')} />
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead className="sticky top-0 z-10 bg-surface">
                  <tr className="border-b border-edge">
                    <th className="px-4 md:px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">{t('table.time')}</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">{t('table.type')}</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">{t('table.result')}</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">{t('table.asset')}</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">{t('table.checks')}</th>
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
                          {d.violation_count === 0 ? t('decisions.allPassed') : `${d.violation_count} ${t('decisions.violations')}`}
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

      {/* Risk Detail Slide-Out Panel */}
      {selectedRisk && (
        <RiskDetailPanel risk={selectedRisk} today={today} onClose={() => setSelectedRisk(null)} />
      )}

      {/* Violation Detail Modal */}
      <ViolationModal
        violationAsset={violationAsset}
        violationDecisions={violationDecisions}
        violationLoading={violationLoading}
        reports={reports}
        onClose={() => setViolationAsset(null)}
      />
    </div>
  );
}
