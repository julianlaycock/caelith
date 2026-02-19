'use client';

import React from 'react';
import Link from 'next/link';
import { Card, Badge, UtilizationBar } from './ui';
import type { FundReportPair } from '../lib/dashboard-utils';
import { useI18n } from '../lib/i18n';

interface FundCardProps {
  fund: FundReportPair['fund'];
  report: FundReportPair['report'];
}

export function FundCard({ fund, report }: FundCardProps) {
  const { t } = useI18n();
  const expiredKyc = report.investor_breakdown.by_kyc_status.find(s => s.status === 'expired')?.count ?? 0;
  const expiringKyc = report.investor_breakdown.kyc_expiring_within_90_days.length;
  const highFlags = report.risk_flags.filter(f => f.severity === 'high').length;
  const mediumFlags = report.risk_flags.filter(f => f.severity === 'medium').length;
  const isSetup = report.fund.assets.length > 0 && report.eligibility_criteria.length > 0;

  let scoreStatus: 'compliant' | 'warning' | 'critical' | 'setup';
  let scoreLabel: string;

  if (!isSetup) {
    scoreStatus = 'setup';
    scoreLabel = t('fundCard.setupNeeded');
  } else if (highFlags > 0 || expiredKyc > 0) {
    scoreStatus = 'critical';
    scoreLabel = `${highFlags + expiredKyc} ${t('fundCard.problems')}`;
  } else if (expiringKyc > 0 || mediumFlags > 0) {
    scoreStatus = 'warning';
    scoreLabel = t('fundCard.reviewNeeded');
  } else {
    scoreStatus = 'compliant';
    scoreLabel = t('fundCard.compliant');
  }

  const scoreDot = {
    compliant: 'bg-semantic-success',
    warning: 'bg-semantic-warning',
    critical: 'bg-semantic-danger',
    setup: 'bg-ink-muted',
  }[scoreStatus];

  const scoreText = {
    compliant: 'text-semantic-success',
    warning: 'text-semantic-warning',
    critical: 'text-semantic-danger',
    setup: 'text-ink-tertiary',
  }[scoreStatus];

  return (
    <Card>
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
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${scoreDot}`} />
          <span className={`text-xs font-medium ${scoreText}`}>{scoreLabel}</span>
        </div>
      </div>
      <div className="mb-3">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-tertiary">{t('funds.utilization')}</p>
        <UtilizationBar allocated={report.fund.total_allocated_units} total={report.fund.total_aum_units} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-secondary">
          {report.fund.total_investors} Investor{report.fund.total_investors !== 1 ? 'en' : ''}
          {' · '}
          {report.fund.assets.length} Asset{report.fund.assets.length !== 1 ? 's' : ''}
        </p>
        <Link
          href={`/funds/${fund.id}`}
          className="text-xs font-medium text-accent-400 hover:text-accent-300 transition-colors"
        >
          {t('fundCard.complianceReport')} →
        </Link>
      </div>
    </Card>
  );
}
