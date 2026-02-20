'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { Card, Badge, ErrorMessage } from '../../components/ui';
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
import { formatNumber, formatDateTime, getErrorMessage, classNames, titleCase } from '../../lib/utils';
import { SetupWizard } from '../../components/setup-wizard';
import { RiskDetailPanel } from '../../components/risk-detail-panel';
import { ViolationModal } from '../../components/violation-modal';
import { OnboardingChecklist } from '../../components/onboarding-checklist';
import {
  computeConcentration,
  calculateEventTrend,
} from '../../lib/dashboard-utils';
import type { FundReportPair, RiskFlag, ActionQueueItem } from '../../lib/dashboard-utils';
import type { CapTableEntry, DecisionRecord, Investor, Event } from '../../lib/types';
import { useI18n, useLocaleDate } from '../../lib/i18n';

// ── Skeleton components ─────────────────────────────────

function SkeletonBanner() {
  return (
    <div className="rounded-xl border border-edge bg-bg-secondary p-5 animate-pulse mb-5">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-5 w-48 rounded bg-bg-tertiary mb-2" />
          <div className="h-3 w-64 rounded bg-bg-tertiary" />
        </div>
        <div className="flex gap-6">
          <div className="h-10 w-12 rounded bg-bg-tertiary" />
          <div className="h-10 w-12 rounded bg-bg-tertiary" />
          <div className="h-10 w-12 rounded bg-bg-tertiary" />
          <div className="h-10 w-12 rounded bg-bg-tertiary" />
        </div>
      </div>
    </div>
  );
}

function SkeletonFundBand() {
  return (
    <div className="flex rounded-xl overflow-hidden border border-edge animate-pulse">
      <div className="w-[5px] bg-bg-tertiary flex-shrink-0" />
      <div className="flex-1 p-4">
        <div className="h-4 w-40 rounded bg-bg-tertiary mb-2" />
        <div className="flex gap-2">
          <div className="h-5 w-12 rounded bg-bg-tertiary" />
          <div className="h-5 w-10 rounded bg-bg-tertiary" />
        </div>
      </div>
    </div>
  );
}

function SkeletonSidebar() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-edge bg-bg-secondary p-4 animate-pulse">
        <div className="h-4 w-24 rounded bg-bg-tertiary mb-3" />
        <div className="space-y-2">
          <div className="h-8 rounded bg-bg-tertiary" />
          <div className="h-8 rounded bg-bg-tertiary" />
          <div className="h-8 rounded bg-bg-tertiary" />
        </div>
      </div>
    </div>
  );
}

// ── Compliance Score Ring ────────────────────────────────

function ComplianceScoreRing({ score, label }: { score: number; label: string }) {
  const color = score >= 85 ? '#6ee7b7' : score >= 60 ? '#E8A87C' : '#f87171';
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative w-11 h-11">
        <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(197,224,238,0.1)" strokeWidth="2.5" />
          <circle
            cx="22" cy="22" r="18" fill="none"
            stroke={color} strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-mono text-sm font-extrabold" style={{ color }}>
          {score}
        </span>
      </div>
      <div>
        <div className="text-[10px] font-semibold" style={{ color }}>Score</div>
        <div className="text-[9px] text-ink-tertiary">{label}</div>
      </div>
    </div>
  );
}

// ── Fund Band ───────────────────────────────────────────

function FundBand({ fund, report }: FundReportPair) {
  const highFlags = report.risk_flags.filter(f => f.severity === 'high').length;
  const medFlags = report.risk_flags.filter(f => f.severity === 'medium').length;
  const totalInvestors = report.fund.total_investors;
  const capacity = report.fund.total_aum_units > 0
    ? Math.round((report.fund.total_allocated_units / report.fund.total_aum_units) * 100)
    : 0;

  let bandColor: { border: string; strip: string; bg: string; status: 'compliant' | 'warning' | 'critical' };
  if (highFlags > 0) {
    bandColor = {
      border: 'border-[rgba(248,113,113,0.12)]',
      strip: 'from-[#fca5a5] to-[#f87171]',
      bg: 'from-[rgba(248,113,113,0.05)] to-transparent',
      status: 'critical',
    };
  } else if (medFlags > 0) {
    bandColor = {
      border: 'border-[rgba(232,168,124,0.1)]',
      strip: 'from-[#f0c9a6] to-[#E8A87C]',
      bg: 'from-[rgba(232,168,124,0.04)] to-transparent',
      status: 'warning',
    };
  } else {
    bandColor = {
      border: 'border-[rgba(110,231,183,0.1)]',
      strip: 'from-[#bbf7d0] to-[#6ee7b7]',
      bg: 'from-[rgba(110,231,183,0.04)] to-transparent',
      status: 'compliant',
    };
  }

  const capacityColor = capacity > 70 ? 'text-[#E8A87C]' : capacity > 40 ? 'text-[#bbf7d0]' : 'text-[#a0cde0]';

  return (
    <Link href={`/funds/${fund.id}`} className="block group">
      <div className={classNames('flex rounded-xl overflow-hidden border transition-all hover:border-edge-strong', bandColor.border)}>
        <div className={classNames('w-[5px] flex-shrink-0 bg-gradient-to-b', bandColor.strip)} />
        <div className={classNames('flex-1 px-4 py-3.5 bg-gradient-to-r', bandColor.bg)}>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[13px] font-semibold text-ink group-hover:text-[#C5E0EE] transition-colors">{fund.name}</div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <Badge variant="gray">{fund.legal_form}</Badge>
                <Badge variant="gray">{fund.domicile}</Badge>
                {bandColor.status === 'critical' && <Badge variant="red">{highFlags} high{medFlags > 0 ? ` · ${medFlags} med` : ''}</Badge>}
                {bandColor.status === 'warning' && <Badge variant="yellow">{medFlags} med</Badge>}
                {bandColor.status === 'compliant' && <Badge variant="green">Compliant</Badge>}
              </div>
            </div>
            <div className="flex gap-5 items-center">
              <div className="text-right">
                <div className={classNames('font-mono text-sm font-bold', capacityColor)}>{capacity}%</div>
                <div className="text-[9px] text-ink-tertiary">capacity</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-bold text-[#C5E0EE]">{totalInvestors}</div>
                <div className="text-[9px] text-ink-tertiary">investors</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Action Queue Sidebar ────────────────────────────────

function ActionQueueSidebar({ items }: { items: ActionQueueItem[] }) {
  const router = useRouter();
  const { t } = useI18n();

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-edge bg-surface overflow-hidden">
      <div
        className="px-3.5 py-3 flex justify-between items-center border-b border-[rgba(248,113,113,0.08)]"
        style={{ background: 'linear-gradient(90deg, rgba(248,113,113,0.08) 0%, rgba(252,165,165,0.03) 100%)' }}
      >
        <span className="text-xs font-bold text-[#fca5a5]">⚡ {t('dashboard.actionQueue')}</span>
        <span className="text-[13px] font-extrabold text-semantic-danger bg-[rgba(248,113,113,0.12)] w-6 h-6 rounded-full flex items-center justify-center">
          {items.length}
        </span>
      </div>
      <div className="divide-y divide-edge-subtle">
        {items.map((item) => {
          const isHigh = item.severity === 'high';
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 hover:bg-bg-tertiary transition-colors text-left"
            >
              <div
                className={classNames(
                  'w-[3px] h-6 rounded-full bg-gradient-to-b flex-shrink-0',
                  isHigh ? 'from-[#fca5a5] to-[#f87171]' : 'from-[#f0c9a6] to-[#E8A87C]'
                )}
              />
              <div className="min-w-0">
                <div className={classNames('text-[11px] font-semibold', isHigh ? 'text-[#fca5a5]' : 'text-[#f0c9a6]')}>
                  {item.title}
                </div>
                <div className="text-[10px] text-ink-tertiary">{item.detail}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Fund Health Sidebar ─────────────────────────────────

function FundHealthSidebar({ fundReports }: { fundReports: FundReportPair[] }) {
  if (fundReports.length === 0) return null;

  return (
    <div className="rounded-xl border border-edge bg-surface p-3.5">
      <div className="text-xs font-bold text-[#C5E0EE] mb-2.5">Fund Health</div>
      <div className="space-y-1.5">
        {fundReports.map(({ fund, report }) => {
          const high = report.risk_flags.filter(f => f.severity === 'high').length;
          const med = report.risk_flags.filter(f => f.severity === 'medium').length;
          const isGood = high === 0 && med === 0;

          const bgClass = high > 0
            ? 'bg-[rgba(248,113,113,0.06)] border-[rgba(252,165,165,0.08)]'
            : med > 0
            ? 'bg-[rgba(232,168,124,0.06)] border-[rgba(240,201,166,0.08)]'
            : 'bg-[rgba(110,231,183,0.06)] border-[rgba(187,247,208,0.08)]';

          const dotColor = high > 0 ? 'bg-[#fca5a5]' : med > 0 ? 'bg-[#f0c9a6]' : 'bg-[#bbf7d0]';
          const textColor = high > 0 ? 'text-[#fca5a5]' : med > 0 ? 'text-[#f0c9a6]' : 'text-[#bbf7d0]';
          const label = isGood ? 'All clear' : `${high > 0 ? `${high} high` : ''}${high > 0 && med > 0 ? ' · ' : ''}${med > 0 ? `${med} med` : ''}`;

          return (
            <div key={fund.id} className={classNames('flex items-center gap-2 px-2.5 py-[7px] rounded-lg border', bgClass)}>
              <div className={classNames('w-2 h-2 rounded-full flex-shrink-0', dotColor)} />
              <span className="text-[11px] text-ink flex-1 truncate">{fund.name.split(' ')[0]}</span>
              <span className={classNames('text-[10px] font-semibold', textColor)}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Deadlines Sidebar ───────────────────────────────────

function DeadlinesSidebar() {
  const deadlines = [
    { name: 'AIFMD II Annex IV', date: 'Mar 15', days: 23, urgent: true },
    { name: 'BaFin Annual Report', date: 'Apr 30', days: 69, urgent: false },
    { name: 'AMLR Implementation', date: 'Jul 2027', days: null, urgent: false },
  ];

  return (
    <div className="rounded-xl border border-edge bg-surface p-3.5">
      <div className="text-xs font-bold text-[#f0c9a6] mb-2.5">Upcoming Deadlines</div>
      <div className="space-y-1.5">
        {deadlines.map((d) => (
          <div
            key={d.name}
            className={classNames(
              'flex justify-between items-center text-[11px] px-2.5 py-1.5 rounded-md',
              d.urgent ? 'bg-[rgba(232,168,124,0.06)] border border-[rgba(240,201,166,0.08)]' : ''
            )}
          >
            <span className={d.urgent ? 'text-ink font-medium' : 'text-ink-secondary'}>{d.name}</span>
            <div className="flex items-center gap-1.5">
              <span className={classNames('font-mono font-semibold', d.urgent ? 'text-[#f0c9a6]' : 'text-ink-tertiary')}>
                {d.date}
              </span>
              {d.days !== null && d.urgent && (
                <span className="text-[9px] font-bold text-[#2D3333] bg-gradient-to-br from-[#f0c9a6] to-[#E8A87C] px-1.5 py-[1px] rounded">
                  {d.days}d
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Analytics Tabs ──────────────────────────────────────

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
    <div className="rounded-xl border border-edge bg-surface p-4">
      {/* Tab bar */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg bg-bg-tertiary/50 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={classNames(
              'px-4 py-1.5 rounded-md text-[11px] font-semibold tracking-[0.08em] transition-all font-[Sora,sans-serif]',
              activeTab === tab.key
                ? 'bg-[rgba(197,224,238,0.15)] text-ink border border-[rgba(197,224,238,0.2)] shadow-sm'
                : 'text-ink-tertiary hover:text-ink-secondary border border-transparent'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'status' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ActiveViolationsCard fundReports={fundReports} />
          <KycPipelineCard investors={allInvestors} />
          <InvestorTypeBreakdownCard investors={allInvestors} />
          <JurisdictionExposureCard investors={allInvestors} />
        </div>
      )}

      {activeTab === 'risk' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ConcentrationRiskGrid data={concentrationData} />
          <LeverageUtilizationCard fundNames={fundNames} />
        </div>
      )}

      {activeTab === 'calendar' && <RegulatoryCalendarCard />}
      {activeTab === 'news' && <NewsFeedCard />}
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [allDecisions, allInvestors, allRiskFlags, reports, t]);

  const concentrationData = useMemo(() => computeConcentration(fundReports, capTables), [fundReports, capTables]);

  // Compute compliance score
  const complianceScore = useMemo(() => {
    if (fundReports.length === 0) return 0;
    const high = allRiskFlags.filter(f => f.severity === 'high').length;
    const med = allRiskFlags.filter(f => f.severity === 'medium').length;
    const expiredKyc = allInvestors.filter(i => i.kyc_status === 'expired').length;
    let score = 100;
    score -= high * 10;
    score -= med * 4;
    score -= expiredKyc * 5;
    return Math.max(0, Math.min(100, score));
  }, [fundReports, allRiskFlags, allInvestors]);

  const scoreLabel = complianceScore >= 85 ? 'Good' : complianceScore >= 60 ? 'Review' : 'Critical';

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
      {/* Setup Wizard */}
      {!loading && fundReports.length === 0 && !wizardDismissed && (
        <SetupWizard onComplete={() => { setWizardDismissed(true); fetchData(); }} />
      )}

      {/* ── Compliance Overview Banner ────────────────── */}
      {loading ? (
        <SkeletonBanner />
      ) : fundReports.length > 0 ? (
        <div className="rounded-xl border border-edge bg-surface px-5 py-4 mb-5 animate-fade-in">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-ink">{t('dashboard.title')}</h1>
              <p className="text-xs text-ink-secondary mt-0.5">{t('dashboard.subtitle')}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="font-mono text-lg font-bold text-ink">{totalFunds}</div>
                  <div className="text-[9px] text-ink-tertiary uppercase tracking-wider">Funds</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-lg font-bold text-ink">{totalInvestors}</div>
                  <div className="text-[9px] text-ink-tertiary uppercase tracking-wider">Investors</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-lg font-bold text-semantic-success">{formatNumber(totalAllocated)}</div>
                  <div className="text-[9px] text-ink-tertiary uppercase tracking-wider">Units</div>
                </div>
                <div className="text-center">
                  <div className={classNames('font-mono text-lg font-bold', actionRequired > 0 ? 'text-semantic-danger' : 'text-semantic-success')}>
                    {actionRequired}
                  </div>
                  <div className={classNames('text-[9px] uppercase tracking-wider', actionRequired > 0 ? 'text-semantic-danger' : 'text-ink-tertiary')}>
                    Actions
                  </div>
                </div>
              </div>
              <div className="w-px h-9 bg-edge" />
              <ComplianceScoreRing score={complianceScore} label={scoreLabel} />
              <div className="font-mono text-[11px] text-ink-tertiary bg-bg-tertiary border border-edge px-3 py-1 rounded-lg">
                {today}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-5">
          <h1 className="text-lg font-bold tracking-tight text-ink">{t('dashboard.title')}</h1>
          <p className="text-xs text-ink-secondary mt-0.5">{t('dashboard.subtitle')}</p>
        </div>
      )}

      {/* Onboarding Checklist */}
      {!loading && (() => {
        const hasFunds = fundReports.length > 0;
        const hasInvestors = allInvestors.length > 0;
        const hasRules = reports.some((r) => r.eligibility_criteria.length > 0);
        const hasDecisions = reports.some((r) => r.recent_decisions.length > 0);
        return <OnboardingChecklist hasFunds={hasFunds} hasInvestors={hasInvestors} hasRules={hasRules} hasDecisions={hasDecisions} />;
      })()}

      {/* ── Main Split Layout ────────────────────────── */}
      {(loading || fundReports.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px] items-start">
          {/* LEFT: Main content */}
          <div className="space-y-4 min-w-0">

            {/* Fund Bands */}
            {loading ? (
              <div className="space-y-2.5">
                <div className="text-[13px] font-bold text-[#C5E0EE] mb-2">Fund Structures</div>
                <SkeletonFundBand />
                <SkeletonFundBand />
              </div>
            ) : (
              <div>
                <div className="text-[13px] font-bold text-[#C5E0EE] mb-2.5">Fund Structures</div>
                <div className="space-y-2.5">
                  {fundReports.map((pair) => (
                    <FundBand key={pair.fund.id} {...pair} />
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Tabs */}
            {loading ? (
              <div className="rounded-xl border border-edge bg-surface p-5 animate-pulse">
                <div className="h-8 w-48 rounded bg-bg-tertiary mb-4" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-32 rounded-lg bg-bg-tertiary" />
                  <div className="h-32 rounded-lg bg-bg-tertiary" />
                  <div className="h-32 rounded-lg bg-bg-tertiary" />
                  <div className="h-32 rounded-lg bg-bg-tertiary" />
                </div>
              </div>
            ) : (
              <AnalyticsTabs
                fundReports={fundReports}
                allInvestors={allInvestors}
                concentrationData={concentrationData}
              />
            )}

            {/* Recent Decisions Table */}
            {!loading && allDecisions.length > 0 && (
              <Card padding={false}>
                <div className="px-4 py-3 border-b border-edge flex justify-between items-center bg-[rgba(197,224,238,0.03)]">
                  <span className="text-[13px] font-bold text-[#C5E0EE]">{t('dashboard.recentDecisions')}</span>
                  <Badge variant="blue">{allDecisions.length} total</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead>
                      <tr className="border-b border-edge">
                        <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary">{t('table.time')}</th>
                        <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary">{t('table.type')}</th>
                        <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary">{t('table.result')}</th>
                        <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary">{t('table.asset')}</th>
                        <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary">{t('table.checks')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-edge-subtle">
                      {allDecisions.map((d) => {
                        const isViolation = d.result === 'rejected' || d.result === 'fail';
                        const resultVariant = d.result === 'approved' || d.result === 'pass' ? 'green' : isViolation ? 'red' : 'gray';
                        return (
                          <tr
                            key={d.id}
                            className={classNames(
                              'transition-colors hover:bg-bg-tertiary',
                              isViolation ? 'bg-[rgba(248,113,113,0.03)]' : ''
                            )}
                          >
                            <td className="px-4 py-2.5 text-xs font-mono tabular-nums text-ink-secondary">
                              {formatDateTime(d.decided_at)}
                            </td>
                            <td className={classNames('px-4 py-2.5 text-xs', isViolation ? 'text-ink font-medium' : 'text-ink-secondary')}>
                              {titleCase(d.decision_type)}
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge variant={resultVariant}>{d.result}</Badge>
                            </td>
                            <td className={classNames('px-4 py-2.5 text-xs', isViolation ? 'text-ink' : 'text-ink-secondary')}>
                              {assetNameMap[d.asset_id] || d.asset_id.slice(0, 8)}
                            </td>
                            <td className="px-4 py-2.5 text-xs">
                              {d.violation_count === 0
                                ? <span className="text-[#bbf7d0]">✓ {t('decisions.allPassed')}</span>
                                : <span className="text-[#fca5a5]">✗ {d.violation_count} {t('decisions.violations')}</span>
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Risk Flags (below table) */}
            {!loading && allRiskFlags.length > 0 && (
              <div id="risk-flags" className="scroll-mt-4">
                <div className="text-[13px] font-bold text-[#C5E0EE] mb-2.5">{t('dashboard.riskFlags')}</div>
                <div className="space-y-2">
                  {allRiskFlags.map((flag, i) => (
                    <div
                      key={i}
                      className="cursor-pointer transition-transform hover:scale-[1.005]"
                      onClick={() => setSelectedRisk(flag)}
                    >
                      <div className={classNames(
                        'rounded-lg border border-edge-subtle border-l-[3px] p-3',
                        flag.severity === 'high' ? 'border-l-semantic-danger bg-semantic-danger-bg' :
                        flag.severity === 'medium' ? 'border-l-semantic-warning bg-semantic-warning-bg' :
                        'border-l-semantic-success bg-semantic-success-bg'
                      )}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant={flag.severity === 'high' ? 'red' : flag.severity === 'medium' ? 'yellow' : 'green'}>
                            {flag.severity.toUpperCase()}
                          </Badge>
                          <span className="text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">{flag.category}</span>
                        </div>
                        <p className="text-sm text-ink">{flag.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loading && allRiskFlags.length === 0 && fundReports.length > 0 && (
              <div className="rounded-xl border border-accent-500/20 bg-accent-500/10 p-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-accent-500" />
                  <p className="text-sm font-medium text-ink">{t('dashboard.allClear')}</p>
                </div>
                <p className="mt-1 text-sm text-ink-secondary">{t('dashboard.noRiskFlags')}</p>
              </div>
            )}
          </div>

          {/* RIGHT: Sidebar */}
          <div className="space-y-3 lg:sticky lg:top-4">
            {loading ? (
              <SkeletonSidebar />
            ) : (
              <>
                <ActionQueueSidebar items={actionQueue} />
                <FundHealthSidebar fundReports={fundReports} />
                <DeadlinesSidebar />
              </>
            )}
          </div>
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
