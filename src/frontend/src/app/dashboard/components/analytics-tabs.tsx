'use client';

import { useState } from 'react';
import {
  ConcentrationRiskGrid,
  ActiveViolationsCard,
  KycPipelineCard,
  InvestorTypeBreakdownCard,
  JurisdictionExposureCard,
  LeverageUtilizationCard,
  RegulatoryCalendarCard,
  NewsFeedCard,
} from '../../../components/charts';
import { classNames } from '../../../lib/utils';
import { useI18n } from '../../../lib/i18n';
import type { FundReportPair } from '../../../lib/dashboard-utils';
import type { Investor } from '../../../lib/types';

type AnalyticsTab = 'status' | 'risk' | 'calendar' | 'news';

export function AnalyticsTabs({
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
