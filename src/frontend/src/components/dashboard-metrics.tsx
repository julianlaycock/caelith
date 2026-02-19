'use client';

import React from 'react';
import { MetricCard } from './ui';
import { formatNumber } from '../lib/utils';
import type { TrendMetric } from '../lib/dashboard-utils';
import { formatTrend } from '../lib/dashboard-utils';

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-edge bg-bg-secondary px-4 py-3 animate-pulse">
      <div className="h-2.5 w-20 rounded bg-bg-tertiary mb-2" />
      <div className="h-5 w-14 rounded bg-bg-tertiary mb-1" />
      <div className="h-2.5 w-28 rounded bg-bg-tertiary" />
    </div>
  );
}

interface DashboardMetricsProps {
  loading: boolean;
  totalFunds: number;
  totalInvestors: number;
  totalAllocated: number;
  actionRequired: number;
  fundTrend: TrendMetric;
  investorTrend: TrendMetric;
  transferTrend: TrendMetric;
  rejectionTrend: TrendMetric;
  onActionClick?: () => void;
}

export function DashboardMetrics({
  loading,
  totalFunds,
  totalInvestors,
  totalAllocated,
  actionRequired,
  fundTrend,
  investorTrend,
  transferTrend,
  rejectionTrend,
  onActionClick,
}: DashboardMetricsProps) {
  if (loading) {
    return (
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard
        label="Aktive Fonds"
        value={totalFunds}
        sub={`${totalFunds} Fonds · ${formatTrend(fundTrend)}`}
        accent="default"
        compact
      />
      <MetricCard
        label="Verifizierte Investoren"
        value={totalInvestors}
        sub={`Über alle Fonds · ${formatTrend(investorTrend)}`}
        accent="default"
        compact
      />
      <MetricCard
        label="Zugewiesene Anteile"
        value={formatNumber(totalAllocated)}
        sub={`Gesamt zugewiesen · ${formatTrend(transferTrend)}`}
        accent="success"
        compact
      />
      <MetricCard
        label="Handlungsbedarf"
        value={actionRequired}
        sub={actionRequired === 0 ? 'Alles in Ordnung' : `Hoch + Mittel Flaggen · ${formatTrend(rejectionTrend)}`}
        accent={actionRequired > 0 ? 'danger' : 'success'}
        compact
        onClick={onActionClick}
      />
    </div>
  );
}
