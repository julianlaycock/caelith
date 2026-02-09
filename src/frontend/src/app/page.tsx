'use client';

import React from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Card, MetricCard, Badge, LoadingSpinner, ErrorMessage } from '../components/ui';
import { formatNumber, formatDateTime } from '../lib/utils';

const EVENT_LABELS: Record<string, { label: string; variant: 'green' | 'blue' | 'yellow' | 'red' | 'gray' }> = {
  'asset.created': { label: 'Asset Created', variant: 'blue' },
  'investor.created': { label: 'Investor Registered', variant: 'blue' },
  'investor.updated': { label: 'Investor Updated', variant: 'gray' },
  'holding.allocated': { label: 'Units Allocated', variant: 'green' },
  'holding.updated': { label: 'Holding Updated', variant: 'gray' },
  'rules.created': { label: 'Rules Created', variant: 'yellow' },
  'rules.updated': { label: 'Rules Updated', variant: 'yellow' },
  'transfer.executed': { label: 'Transfer Executed', variant: 'green' },
  'transfer.rejected': { label: 'Transfer Rejected', variant: 'red' },
  'composite_rule.created': { label: 'Custom Rule Created', variant: 'yellow' },
  'composite_rule.updated': { label: 'Custom Rule Updated', variant: 'yellow' },
  'composite_rule.deleted': { label: 'Custom Rule Deleted', variant: 'red' },
};

export default function DashboardPage() {
  const assets = useAsync(() => api.getAssets());
  const investors = useAsync(() => api.getInvestors());
  const events = useAsync(() => api.getEvents({ limit: 15 }));
  const transfers = useAsync(() => api.getTransfers());

  const loading = assets.loading || investors.loading;
  if (loading) return <LoadingSpinner />;

  const totalUnits = assets.data?.reduce((sum, a) => sum + a.total_units, 0) ?? 0;
  const assetCount = assets.data?.length ?? 0;
  const investorCount = investors.data?.length ?? 0;
  const transferCount = transfers.data?.length ?? 0;
  const transferVolume = transfers.data?.reduce((sum, t) => sum + t.units, 0) ?? 0;

  // Compute compliance rate from recent events
  const transferEvents = events.data?.filter(
    (e) => e.event_type === 'transfer.executed' || e.event_type === 'transfer.rejected'
  ) ?? [];
  const executedCount = transferEvents.filter((e) => e.event_type === 'transfer.executed').length;
  const complianceRate = transferEvents.length > 0
    ? Math.round((executedCount / transferEvents.length) * 100)
    : 100;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-slate-500">Compliance engine overview</p>
      </div>

      {/* Metric Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Assets Under Management"
          value={formatNumber(totalUnits)}
          sub={`${assetCount} asset${assetCount !== 1 ? 's' : ''} registered`}
          accent="default"
        />
        <MetricCard
          label="Registered Investors"
          value={investorCount}
          sub={`Across ${new Set(investors.data?.map((i) => i.jurisdiction)).size} jurisdictions`}
          accent="default"
        />
        <MetricCard
          label="Transfers Executed"
          value={transferCount}
          sub={`${formatNumber(transferVolume)} units transferred`}
          accent="success"
        />
        <MetricCard
          label="Compliance Rate"
          value={`${complianceRate}%`}
          sub={`${executedCount}/${transferEvents.length} transfers approved`}
          accent={complianceRate === 100 ? 'success' : complianceRate > 80 ? 'warning' : 'danger'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Activity Feed — wider */}
        <div className="lg:col-span-3">
          <Card padding={false}>
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Recent Activity</h2>
            </div>
            {events.loading ? (
              <LoadingSpinner />
            ) : events.error ? (
              <div className="p-5"><ErrorMessage message={events.error} onRetry={events.refetch} /></div>
            ) : events.data && events.data.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {events.data.map((event) => {
                  const meta = EVENT_LABELS[event.event_type] || { label: event.event_type, variant: 'gray' as const };
                  return (
                    <div key={event.id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        <span className="text-xs text-slate-500 font-mono">
                          {event.entity_id.slice(0, 8)}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {formatDateTime(event.timestamp)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-5 py-8 text-center text-sm text-slate-500">
                No activity yet. Create an asset to get started.
              </div>
            )}
          </Card>
        </div>

        {/* Right Column — Asset Summary */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding={false}>
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Assets</h2>
            </div>
            {assets.data && assets.data.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {assets.data.map((asset) => (
                  <div key={asset.id} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900">{asset.name}</p>
                      <Badge variant="gray">{asset.asset_type}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatNumber(asset.total_units)} total units
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-6 text-center text-sm text-slate-500">
                No assets registered.
              </div>
            )}
          </Card>

          <Card padding={false}>
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Jurisdictions</h2>
            </div>
            {investors.data && investors.data.length > 0 ? (
              <div className="px-5 py-4">
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(new Set(investors.data.map((i) => i.jurisdiction))).sort().map((j) => {
                    const count = investors.data!.filter((i) => i.jurisdiction === j).length;
                    return (
                      <span key={j} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {j}
                        <span className="text-slate-400">{count}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="px-5 py-6 text-center text-sm text-slate-500">
                No investors registered.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}